import { signInAnonymously, User } from 'firebase/auth';
import {
  collection,
  deleteDoc,
  doc,
  getDoc,
  getDocs,
  limit,
  onSnapshot,
  query,
  serverTimestamp,
  setDoc,
  updateDoc,
  where,
  Unsubscribe,
} from 'firebase/firestore';
import {
  WATCH_PARTY_PRIVATE_CAPACITY,
  WATCH_PARTY_PUBLIC_CAPACITY,
  extractDailymotionVideoId,
  sanitizeMediaUrl,
  sanitizePosterUrl,
} from '../constants';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  DramaEpisode,
  WatchPartyEmoji,
  WatchPartyMessage,
  WatchPartyParticipant,
  WatchPartyReaction,
  WatchPartyRoom,
} from '../types';
import { isEnglishCatalogTitle } from '../utils/modernCatalog';

const PARTY_CODE_CHARS = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';

export async function ensureWatchPartyAuth(): Promise<User> {
  if (auth.currentUser) {
    return auth.currentUser;
  }
  const cred = await signInAnonymously(auth);
  return cred.user;
}

export function generateWatchPartyRoomId(): string {
  let suffix = '';
  for (let i = 0; i < 6; i += 1) {
    suffix += PARTY_CODE_CHARS[Math.floor(Math.random() * PARTY_CODE_CHARS.length)];
  }
  return `DW-${suffix}`;
}

export function normalizeRoomCode(raw: string): string {
  return (raw || '')
    .trim()
    .toUpperCase()
    .replace(/[^A-Z0-9_-]/g, '')
    .slice(0, 64);
}

function sanitizeUsername(raw: string): string {
  const clean = (raw || '').trim().replace(/\s+/g, ' ').slice(0, 32);
  return clean.length >= 2 ? clean : 'Player';
}

function buildCleanDailymotionLobbyUrl(dmId: string): string {
  return `https://www.dailymotion.com/embed/video/${dmId}?autoplay=1&mute=0&ui-logo=0&queue-enable=false&subtitles-default=en&playsinline=1&api=postMessage&ui-start-screen-info=false`;
}

function buildEpisodeFields(episode: DramaEpisode) {
  const rawVideoUrl = sanitizeMediaUrl((episode.videoUrl || episode.youtubeUrl || '').trim());
  const dmId = (extractDailymotionVideoId(rawVideoUrl) || '').slice(0, 32);
  const normalizedDmUrl = dmId ? buildCleanDailymotionLobbyUrl(dmId) : rawVideoUrl;
  const safeVideoUrl = (normalizedDmUrl || 'https://www.dailymotion.com').slice(0, 500);
  const coverImage = sanitizePosterUrl(
    episode.coverImage || episode.posterUrl || episode.thumbnailUrl || ''
  ).slice(0, 2000);
  const archiveIdentifier = (episode.archiveIdentifier || '').trim().slice(0, 128);

  return {
    episodeId: (episode.id || 'episode-1').trim().slice(0, 128),
    episodeTitle: (episode.title || 'Featured Episode').trim().slice(0, 120),
    seriesTitle: (episode.series || episode.title || 'DramaWin').trim().slice(0, 80),
    episodeLabel: (episode.episodeLabel || 'EP 01').trim().slice(0, 32),
    category: (episode.category || 'Drama').trim().slice(0, 32),
    dailymotionId: dmId,
    videoUrl: safeVideoUrl,
    ...(coverImage ? { coverImage } : {}),
    ...(archiveIdentifier ? { archiveIdentifier } : {}),
  };
}

export function episodeFromWatchPartyRoom(room: WatchPartyRoom): DramaEpisode {
  const dmId = (room.dailymotionId || extractDailymotionVideoId(room.videoUrl || '') || '').trim();
  const resolvedMediaUrl = dmId ? buildCleanDailymotionLobbyUrl(dmId) : room.videoUrl;
  const safeTitle = isEnglishCatalogTitle(room.episodeTitle)
    ? room.episodeTitle
    : isEnglishCatalogTitle(room.seriesTitle)
      ? room.seriesTitle
      : 'Featured HD Episode';

  return {
    id: room.episodeId,
    title: safeTitle,
    series: isEnglishCatalogTitle(room.seriesTitle) ? room.seriesTitle : safeTitle,
    category: room.category,
    episodeLabel: room.episodeLabel,
    duration: 'Watch Party · 1.5x',
    rewardCoins: 1000,
    coverImage: room.coverImage || '',
    posterUrl: room.coverImage || '',
    thumbnailUrl: room.coverImage || '',
    synopsis: `Live Watch Party hosted by ${room.hostName}`,
    sponsorUrl: '',
    videoUrl: resolvedMediaUrl,
    youtubeUrl: resolvedMediaUrl,
    startTime: 0,
    sortOrder: 1,
    isPublic: true,
    ...(room.archiveIdentifier ? { archiveIdentifier: room.archiveIdentifier } : {}),
  };
}

export function isWatchPartyPrivate(room: WatchPartyRoom | null | undefined): boolean {
  return Boolean(room && (room.isPrivate === true || room.isPublic === false));
}

export function getWatchPartyCapacity(room: WatchPartyRoom | null | undefined): number {
  if (isWatchPartyPrivate(room)) return WATCH_PARTY_PRIVATE_CAPACITY;
  if (room?.maxCapacity === WATCH_PARTY_PRIVATE_CAPACITY) return WATCH_PARTY_PRIVATE_CAPACITY;
  return WATCH_PARTY_PUBLIC_CAPACITY;
}

export async function createWatchPartyRoom(params: {
  episode: DramaEpisode;
  hostName: string;
  isPublic?: boolean;
}): Promise<WatchPartyRoom> {
  const user = await ensureWatchPartyAuth();
  const roomId = generateWatchPartyRoomId();
  const safeHostName = sanitizeUsername(params.hostName);
  const epFields = buildEpisodeFields(params.episode);
  const nowMs = Date.now();
  const roomPath = `watchParties/${roomId}`;
  const isPublic = params.isPublic !== false;
  const isPrivate = !isPublic;
  const maxCapacity = isPublic ? WATCH_PARTY_PUBLIC_CAPACITY : WATCH_PARTY_PRIVATE_CAPACITY;

  const roomDocData = {
    roomId,
    hostUid: user.uid,
    hostName: safeHostName,
    ...epFields,
    isPlaying: true,
    currentTime: 0,
    playbackUpdatedAtMs: nowMs,
    status: 'active' as const,
    isPublic,
    isPrivate,
    maxCapacity,
    viewerCount: 1,
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  };

  try {
    await setDoc(doc(db, 'watchParties', roomId), roomDocData);
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, roomPath);
  }

  await joinWatchPartyRoom(roomId, safeHostName, 'host');

  return {
    ...roomDocData,
    createdAt: undefined,
    updatedAt: undefined,
  };
}

export async function fetchWatchPartyRoom(rawRoomId: string): Promise<WatchPartyRoom | null> {
  const roomId = normalizeRoomCode(rawRoomId);
  if (roomId.length < 4) return null;
  await ensureWatchPartyAuth();
  const roomPath = `watchParties/${roomId}`;

  try {
    const snap = await getDoc(doc(db, 'watchParties', roomId));
    if (!snap.exists()) return null;
    const room = snap.data() as WatchPartyRoom;
    if (room.status !== 'active') return null;
    return room;
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, roomPath);
  }
}

export function subscribeWatchPartyRoom(
  roomId: string,
  onData: (room: WatchPartyRoom | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanId = normalizeRoomCode(roomId);
  const roomPath = `watchParties/${cleanId}`;
  return onSnapshot(
    doc(db, 'watchParties', cleanId),
    (snap) => {
      if (!snap.exists()) {
        onData(null);
        return;
      }
      onData(snap.data() as WatchPartyRoom);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.GET, roomPath);
      }
    }
  );
}

export function subscribePublicWatchParties(
  onData: (rooms: WatchPartyRoom[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const q = query(
    collection(db, 'watchParties'),
    where('isPublic', '==', true),
    where('status', '==', 'active'),
    limit(20)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => d.data() as WatchPartyRoom)
        .filter((r) => r.status === 'active' && isEnglishCatalogTitle(r.episodeTitle))
        .sort((a, b) => (b.playbackUpdatedAtMs || 0) - (a.playbackUpdatedAtMs || 0));
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, 'watchParties');
      }
    }
  );
}

export async function isWatchPartyRoomFull(
  room: WatchPartyRoom
): Promise<{ full: boolean; viewerCount: number; capacity: number }> {
  const user = await ensureWatchPartyAuth();
  const cleanId = normalizeRoomCode(room.roomId);
  const capacity = getWatchPartyCapacity(room);
  const cutoff = Date.now() - 120_000;

  try {
    const q = query(
      collection(db, 'watchParties', cleanId, 'participants'),
      where('roomId', '==', cleanId),
      limit(40)
    );
    const snap = await getDocs(q);
    let alreadyInRoom = room.hostUid === user.uid;
    let activeCount = 0;

    snap.docs.forEach((d) => {
      const p = d.data() as WatchPartyParticipant;
      if (p.uid === user.uid) {
        alreadyInRoom = true;
      }
      if (p.role === 'host' || (p.lastSeenMs || 0) >= cutoff) {
        activeCount += 1;
      }
    });

    const viewerCount = Math.max(1, activeCount);
    return {
      full: !alreadyInRoom && activeCount >= capacity,
      viewerCount,
      capacity,
    };
  } catch {
    const fallbackCount = Math.max(1, room.viewerCount || 1);
    return {
      full: room.hostUid !== user.uid && fallbackCount >= capacity,
      viewerCount: fallbackCount,
      capacity,
    };
  }
}

export async function syncWatchPartyViewerCount(
  roomId: string,
  viewerCount: number
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = normalizeRoomCode(roomId);
  const safeCount = Math.max(
    1,
    Math.min(WATCH_PARTY_PUBLIC_CAPACITY, Math.round(Number.isFinite(viewerCount) ? viewerCount : 1))
  );
  try {
    await updateDoc(doc(db, 'watchParties', cleanId), {
      viewerCount: safeCount,
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore transient viewer count sync errors
  }
}

export async function joinWatchPartyRoom(
  roomId: string,
  username: string,
  role: 'host' | 'guest'
): Promise<void> {
  const user = await ensureWatchPartyAuth();
  const cleanId = normalizeRoomCode(roomId);
  const safeName = sanitizeUsername(username);
  const participantPath = `watchParties/${cleanId}/participants/${user.uid}`;
  const partRef = doc(db, 'watchParties', cleanId, 'participants', user.uid);

  try {
    const existing = await getDoc(partRef);
    if (existing.exists()) {
      await updateDoc(partRef, {
        username: safeName,
        lastSeenMs: Date.now(),
        updatedAt: serverTimestamp(),
      });
    } else {
      if (role !== 'host') {
        const roomSnap = await getDoc(doc(db, 'watchParties', cleanId));
        if (!roomSnap.exists()) {
          throw new Error(`Watch Lobby "${cleanId}" was not found.`);
        }
        const roomData = roomSnap.data() as WatchPartyRoom;
        if (roomData.status !== 'active') {
          throw new Error(`Watch Lobby "${cleanId}" has ended.`);
        }
        const capacity = getWatchPartyCapacity(roomData);
        const cutoff = Date.now() - 120_000;
        const partSnap = await getDocs(
          query(
            collection(db, 'watchParties', cleanId, 'participants'),
            where('roomId', '==', cleanId),
            limit(40)
          )
        );
        const activeCount = partSnap.docs.filter((d) => {
          const p = d.data() as WatchPartyParticipant;
          return p.role === 'host' || (p.lastSeenMs || 0) >= cutoff;
        }).length;
        if (activeCount >= capacity) {
          throw new Error(
            `Room Full (${activeCount}/${capacity}). This Watch Lobby has reached maximum capacity.`
          );
        }
      }

      await setDoc(partRef, {
        roomId: cleanId,
        uid: user.uid,
        username: safeName,
        role,
        lastSeenMs: Date.now(),
        joinedAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    }
  } catch (error) {
    if (error instanceof Error && /Room Full|was not found|has ended/i.test(error.message)) {
      throw error;
    }
    handleFirestoreError(error, OperationType.WRITE, participantPath);
  }
}

export async function heartbeatWatchPartyParticipant(
  roomId: string,
  username: string
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = normalizeRoomCode(roomId);
  const partRef = doc(db, 'watchParties', cleanId, 'participants', user.uid);
  try {
    await updateDoc(partRef, {
      username: sanitizeUsername(username),
      lastSeenMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore transient heartbeat write failures if room ended
  }
}

export async function leaveWatchPartyRoom(roomId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = normalizeRoomCode(roomId);
  try {
    await deleteDoc(doc(db, 'watchParties', cleanId, 'participants', user.uid));
  } catch {
    // Ignore cleanup failures when room already removed
  }
}

export function subscribeWatchPartyParticipants(
  roomId: string,
  onData: (participants: WatchPartyParticipant[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanId = normalizeRoomCode(roomId);
  const path = `watchParties/${cleanId}/participants`;
  const q = query(
    collection(db, 'watchParties', cleanId, 'participants'),
    where('roomId', '==', cleanId),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const cutoff = Date.now() - 120_000;
      const list = snap.docs
        .map((d) => d.data() as WatchPartyParticipant)
        .filter((p) => p.role === 'host' || (p.lastSeenMs || 0) >= cutoff)
        .sort((a, b) => (a.role === 'host' ? -1 : b.role === 'host' ? 1 : b.lastSeenMs - a.lastSeenMs));
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export async function syncWatchPartyPlayback(
  roomId: string,
  playback: { isPlaying: boolean; currentTime: number }
): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = normalizeRoomCode(roomId);
  const safeTime = Math.max(0, Math.min(86400, Number.isFinite(playback.currentTime) ? playback.currentTime : 0));
  try {
    await updateDoc(doc(db, 'watchParties', cleanId), {
      isPlaying: Boolean(playback.isPlaying),
      currentTime: Number(safeTime.toFixed(2)),
      playbackUpdatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore transient playback sync errors when leaving/closing room
  }
}

export async function switchWatchPartyEpisode(
  roomId: string,
  episode: DramaEpisode
): Promise<void> {
  await ensureWatchPartyAuth();
  const cleanId = normalizeRoomCode(roomId);
  const epFields = buildEpisodeFields(episode);
  const path = `watchParties/${cleanId}`;

  try {
    await updateDoc(doc(db, 'watchParties', cleanId), {
      ...epFields,
      isPlaying: true,
      currentTime: 0,
      playbackUpdatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function endWatchPartyRoom(roomId: string): Promise<void> {
  const user = auth.currentUser;
  if (!user) return;
  const cleanId = normalizeRoomCode(roomId);
  try {
    await updateDoc(doc(db, 'watchParties', cleanId), {
      status: 'ended',
      isPlaying: false,
      playbackUpdatedAtMs: Date.now(),
      updatedAt: serverTimestamp(),
    });
  } catch {
    // Ignore if already ended or not host
  }
}

export async function sendWatchPartyMessage(
  roomId: string,
  payload: {
    username: string;
    text: string;
    isSuper: boolean;
    emoji?: WatchPartyEmoji;
  }
): Promise<void> {
  const user = await ensureWatchPartyAuth();
  const cleanId = normalizeRoomCode(roomId);
  const cleanText = payload.text.trim().slice(0, 240);
  if (!cleanText) return;

  const messageId = `msg_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `watchParties/${cleanId}/messages/${messageId}`;
  const isSuper = Boolean(payload.isSuper);

  try {
    await setDoc(doc(db, 'watchParties', cleanId, 'messages', messageId), {
      roomId: cleanId,
      uid: user.uid,
      username: sanitizeUsername(payload.username),
      text: cleanText,
      isSuper,
      superCost: isSuper ? 100 : 0,
      ...(payload.emoji ? { emoji: payload.emoji } : {}),
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeWatchPartyMessages(
  roomId: string,
  onData: (messages: WatchPartyMessage[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanId = normalizeRoomCode(roomId);
  const path = `watchParties/${cleanId}/messages`;
  const q = query(
    collection(db, 'watchParties', cleanId, 'messages'),
    where('roomId', '==', cleanId),
    limit(100)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WatchPartyMessage, 'id'>),
        }))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          const timeB = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          if (timeA !== timeB) return timeA - timeB;
          return a.id.localeCompare(b.id);
        })
        .slice(-50);
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}

export async function sendWatchPartyReaction(
  roomId: string,
  payload: {
    username: string;
    emoji: WatchPartyEmoji;
    isSuper: boolean;
  }
): Promise<void> {
  const user = await ensureWatchPartyAuth();
  const cleanId = normalizeRoomCode(roomId);
  const reactionId = `rx_${Date.now()}_${Math.random().toString(36).slice(2, 8)}`;
  const path = `watchParties/${cleanId}/reactions/${reactionId}`;
  const isSuper = Boolean(payload.isSuper);

  try {
    await setDoc(doc(db, 'watchParties', cleanId, 'reactions', reactionId), {
      roomId: cleanId,
      uid: user.uid,
      username: sanitizeUsername(payload.username),
      emoji: payload.emoji,
      isSuper,
      superCost: isSuper ? 100 : 0,
      createdAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }
}

export function subscribeWatchPartyReactions(
  roomId: string,
  onData: (reactions: WatchPartyReaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const cleanId = normalizeRoomCode(roomId);
  const path = `watchParties/${cleanId}/reactions`;
  const q = query(
    collection(db, 'watchParties', cleanId, 'reactions'),
    where('roomId', '==', cleanId),
    limit(40)
  );
  return onSnapshot(
    q,
    (snap) => {
      const list = snap.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<WatchPartyReaction, 'id'>),
        }))
        .sort((a, b) => {
          const timeA = a.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          const timeB = b.createdAt?.toMillis?.() ?? Number.MAX_SAFE_INTEGER;
          if (timeA !== timeB) return timeB - timeA;
          return b.id.localeCompare(a.id);
        })
        .slice(0, 20);
      onData(list);
    },
    (error) => {
      if (onError) {
        onError(error);
      } else {
        handleFirestoreError(error, OperationType.LIST, path);
      }
    }
  );
}
