import {
  arrayRemove,
  arrayUnion,
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
  writeBatch,
  Unsubscribe,
} from 'firebase/firestore';
import {
  ADMIN_NOTIFICATION_EMAIL,
  ADMIN_PASSCODE,
  CURATED_DEFAULT_EPISODES,
  DEFAULT_LIVE_TICKER_NAMES,
  DEFAULT_POOL_PRIZE_ZAR,
  DEFAULT_POOL_TARGET_COINS,
  DEFAULT_QUALIFICATION_THRESHOLD,
  DEFAULT_SPONSOR_URL,
  DEFAULT_VIDEO_START_SECONDS,
  LEGACY_PLACEHOLDER_EPISODE_IDS,
  MYSTERY_ENTRY_COST,
  R3_BOOST_ZAR,
  deduplicateEpisodeList,
  forceSaveDefaultEpisodesToLocalStorage,
  getCanonicalVideoKey,
  getCurrentWeekKey,
  getEpisodeSeriesId,
  getMondayStartTimestampSAST,
  getTodayDateKey,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  normalizeEpisodeStartSeconds,
  sanitizeExternalUrl,
  toSeriesId,
} from '../constants';
import { auth, db, handleFirestoreError, OperationType } from '../firebase';
import {
  AppConfig,
  CoinTransaction,
  DramaEpisode,
  DramaSeries,
  LeaderboardPlayer,
  MysteryWinnerRecord,
  PlayerPrivate,
  PrizeWinRecord,
  PrizeWinType,
  SupportCategory,
  SupportMessageRecord,
  SupportStatus,
  TransactionCategory,
  WeekDayKey,
} from '../types';
import { BoxOutcome } from '../components/MysteryVaultCard';

export const DEFAULT_APP_CONFIG: AppConfig = {
  sponsorAdUrl: DEFAULT_SPONSOR_URL,
  embeddedAdHtml: '',
  poolPrizeZar: DEFAULT_POOL_PRIZE_ZAR,
  rolloverAmountZar: 0,
  poolWeekKey: getCurrentWeekKey(),
  weekStartTimestamp: getMondayStartTimestampSAST(),
  lastPoolWinnerSummary: '',
  lastWinnerUids: [],
  mysteryWinningBoxes: 0,
  r5WinnerUsername: '',
  nextPickWinsR5: false,
  liveTickerEnabled: true,
  liveTickerNames: DEFAULT_LIVE_TICKER_NAMES,
  poolTargetCoins: DEFAULT_POOL_TARGET_COINS,
  qualificationThreshold: DEFAULT_QUALIFICATION_THRESHOLD,
  episodesSeeded: false,
  isPublic: true,
};

export async function fetchPlayerProfile(uid: string): Promise<{
  publicProfile: LeaderboardPlayer | null;
  privateProfile: PlayerPrivate | null;
}> {
  const leaderboardPath = `leaderboard/${uid}`;
  const privatePath = `playerPrivate/${uid}`;
  let publicProfile: LeaderboardPlayer | null = null;
  let privateProfile: PlayerPrivate | null = null;

  try {
    const pubSnap = await getDoc(doc(db, 'leaderboard', uid));
    if (pubSnap.exists()) {
      publicProfile = pubSnap.data() as LeaderboardPlayer;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, leaderboardPath);
  }

  try {
    const privSnap = await getDoc(doc(db, 'playerPrivate', uid));
    if (privSnap.exists()) {
      privateProfile = privSnap.data() as PlayerPrivate;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, privatePath);
  }

  return { publicProfile, privateProfile };
}

export async function createPlayerProfile(
  uid: string,
  rawUsername: string,
  rawContact: string
): Promise<{ publicProfile: LeaderboardPlayer; privateProfile: PlayerPrivate }> {
  const username = rawUsername.trim().slice(0, 32);
  const contact = rawContact.trim().slice(0, 120);
  const weekKey = getCurrentWeekKey();

  if (username.length < 2) {
    throw new Error('Username must be at least 2 characters.');
  }
  if (contact.length < 4) {
    throw new Error('Please enter a valid email or WhatsApp number.');
  }

  const publicData: LeaderboardPlayer = {
    uid,
    username,
    coins: 0,
    weeklyCoins: 0,
    qualified: false,
    streakCount: 0,
    sundayBonusZar: 0,
    isPublic: true,
  };

  const privateData: PlayerPrivate = {
    uid,
    contact,
    dailyGiftLastClaimed: '',
    weekKey,
    claimedDays: [],
    watchedEpisodeIds: [],
    lastKeepWatchingDate: '',
    lastBannerClaimAt: 0,
    lastActivityDate: '',
    lastMysteryPickDate: '',
  };

  try {
    const batch = writeBatch(db);
    batch.set(doc(db, 'leaderboard', uid), {
      ...publicData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    batch.set(doc(db, 'playerPrivate', uid), {
      ...privateData,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, `leaderboard/${uid}`);
  }

  return { publicProfile: publicData, privateProfile: privateData };
}

export function subscribeLeaderboard(
  onData: (players: LeaderboardPlayer[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'leaderboard';
  const q = query(
    collection(db, 'leaderboard'),
    where('isPublic', '==', true),
    limit(1000)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => d.data() as LeaderboardPlayer)
        .sort((a, b) => (b.weeklyCoins || 0) - (a.weeklyCoins || 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribePlayerPrivate(
  uid: string,
  onData: (data: PlayerPrivate | null) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `playerPrivate/${uid}`;
  return onSnapshot(
    doc(db, 'playerPrivate', uid),
    (snapshot) => {
      onData(snapshot.exists() ? (snapshot.data() as PlayerPrivate) : null);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeAppConfig(
  onData: (config: AppConfig) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'appConfig/global';
  return onSnapshot(
    doc(db, 'appConfig', 'global'),
    (snapshot) => {
      if (snapshot.exists()) {
        onData({
          ...DEFAULT_APP_CONFIG,
          ...(snapshot.data() as Partial<AppConfig>),
        });
      } else {
        onData(DEFAULT_APP_CONFIG);
      }
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.GET, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeSeries(
  onData: (seriesList: DramaSeries[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'series';
  const q = query(collection(db, 'series'), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => {
          const data = d.data() as Omit<DramaSeries, 'id'>;
          return {
            id: d.id,
            ...data,
            seriesId: data.seriesId || d.id,
          };
        })
        .filter((s) => !/gojo|jujutsu|jjk|candy\s*man/i.test(`${s.seriesId} ${s.title}`))
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeEpisodes(
  onData: (episodes: DramaEpisode[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'episodes';
  const q = query(collection(db, 'episodes'), where('isPublic', '==', true));
  return onSnapshot(
    q,
    (snapshot) => {
      const items = deduplicateEpisodeList(
        snapshot.docs.map((d) => {
          const data = d.data() as Omit<DramaEpisode, 'id'>;
          return {
            id: d.id,
            ...data,
            seriesId: getEpisodeSeriesId(data),
            category: inferEpisodeCategory(data.series, data.title, data.category),
            coverImage: data.coverImage === 'none' ? '' : data.coverImage,
          };
        })
      );
      onData(items);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeMysteryWinners(
  onData: (winners: MysteryWinnerRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'mysteryWinners';
  return onSnapshot(
    collection(db, 'mysteryWinners'),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<MysteryWinnerRecord, 'id'>),
        }))
        .sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribeTransactions(
  uid: string,
  onData: (transactions: CoinTransaction[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = `playerPrivate/${uid}/transactions`;
  const q = query(
    collection(db, 'playerPrivate', uid, 'transactions'),
    where('uid', '==', uid),
    limit(200)
  );
  return onSnapshot(
    q,
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<CoinTransaction, 'id'>),
        }))
        .sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || 0;
          const tB = b.createdAt?.toMillis?.() || 0;
          return tB - tA;
        });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

function buildTransactionId(suffix = '0'): string {
  return `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}-${suffix}`;
}

export async function awardPlayerCoins(
  player: LeaderboardPlayer,
  _privateState: PlayerPrivate,
  walletDelta: number,
  qualificationThreshold: number,
  privateUpdates: Partial<
    Pick<
      PlayerPrivate,
      | 'dailyGiftLastClaimed'
      | 'weekKey'
      | 'claimedDays'
      | 'watchedEpisodeIds'
      | 'lastKeepWatchingDate'
      | 'lastBannerClaimAt'
      | 'lastActivityDate'
      | 'lastMysteryPickDate'
    >
  >,
  nextStreakCount?: number,
  weeklyBonusDelta?: number,
  txMeta?: {
    category: TransactionCategory;
    title: string;
  }
): Promise<void> {
  const roundedDelta = Math.round(walletDelta);
  const newCoins = Math.max(0, player.coins + roundedDelta);
  const weeklyGain = Math.max(
    0,
    Math.min(1000, Math.round(weeklyBonusDelta !== undefined ? weeklyBonusDelta : Math.max(0, walletDelta)))
  );
  const newWeekly = player.weeklyCoins + weeklyGain;
  const qualified = newWeekly >= qualificationThreshold;
  const streakCount =
    typeof nextStreakCount === 'number'
      ? Math.max(0, Math.min(7, nextStreakCount))
      : player.streakCount;

  const batch = writeBatch(db);
  batch.update(doc(db, 'leaderboard', player.uid), {
    coins: newCoins,
    weeklyCoins: newWeekly,
    qualified,
    streakCount,
    updatedAt: serverTimestamp(),
  });

  const sanitizedPrivate: Record<string, unknown> = {
    updatedAt: serverTimestamp(),
  };

  if (privateUpdates.dailyGiftLastClaimed !== undefined) {
    sanitizedPrivate.dailyGiftLastClaimed = privateUpdates.dailyGiftLastClaimed.slice(0, 16);
  }
  if (privateUpdates.weekKey !== undefined) {
    sanitizedPrivate.weekKey = privateUpdates.weekKey.slice(0, 16);
  }
  if (privateUpdates.claimedDays !== undefined) {
    sanitizedPrivate.claimedDays = privateUpdates.claimedDays.slice(0, 7);
  }
  if (privateUpdates.watchedEpisodeIds !== undefined) {
    sanitizedPrivate.watchedEpisodeIds = privateUpdates.watchedEpisodeIds.slice(-100);
  }
  if (privateUpdates.lastKeepWatchingDate !== undefined) {
    sanitizedPrivate.lastKeepWatchingDate = privateUpdates.lastKeepWatchingDate.slice(0, 16);
  }
  if (privateUpdates.lastBannerClaimAt !== undefined) {
    sanitizedPrivate.lastBannerClaimAt = Math.max(0, privateUpdates.lastBannerClaimAt);
  }
  if (privateUpdates.lastActivityDate !== undefined) {
    sanitizedPrivate.lastActivityDate = privateUpdates.lastActivityDate.slice(0, 16);
  }
  if (privateUpdates.lastMysteryPickDate !== undefined) {
    sanitizedPrivate.lastMysteryPickDate = privateUpdates.lastMysteryPickDate.slice(0, 16);
  }

  batch.update(doc(db, 'playerPrivate', player.uid), sanitizedPrivate);

  if (txMeta) {
    const txId = buildTransactionId('r');
    batch.set(doc(db, 'playerPrivate', player.uid, 'transactions', txId), {
      uid: player.uid,
      type: roundedDelta < 0 ? 'spend' : 'earn',
      category: txMeta.category.slice(0, 32),
      title: txMeta.title.trim().slice(0, 100),
      amount: roundedDelta,
      balanceAfter: newCoins,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, `leaderboard/${player.uid}`);
  }
}

export async function claimDailyGift(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  qualificationThreshold: number
): Promise<boolean> {
  const today = getTodayDateKey();
  if (privateState.dailyGiftLastClaimed === today) {
    return false;
  }
  await awardPlayerCoins(
    player,
    privateState,
    50,
    qualificationThreshold,
    {
      dailyGiftLastClaimed: today,
      lastActivityDate: today,
    },
    undefined,
    undefined,
    {
      category: 'daily-gift',
      title: 'Daily Gift Reward',
    }
  );
  return true;
}

export async function claimStreakDay(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  dayKey: WeekDayKey,
  rewardCoins: number,
  qualificationThreshold: number
): Promise<boolean> {
  const today = getTodayDateKey();
  const currentWeek = getCurrentWeekKey();
  const baseClaimed = privateState.weekKey === currentWeek ? privateState.claimedDays : [];
  if (baseClaimed.includes(dayKey)) {
    return false;
  }
  const nextClaimed = [...baseClaimed, dayKey].slice(0, 7);
  await awardPlayerCoins(
    player,
    privateState,
    rewardCoins,
    qualificationThreshold,
    {
      weekKey: currentWeek,
      claimedDays: nextClaimed,
      lastActivityDate: today,
    },
    nextClaimed.length,
    undefined,
    {
      category: 'streak',
      title: `${dayKey} Daily Check-In`,
    }
  );
  return true;
}

export async function claimKeepWatching(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  qualificationThreshold: number
): Promise<boolean> {
  const today = getTodayDateKey();
  if (privateState.lastKeepWatchingDate === today) {
    return false;
  }
  await awardPlayerCoins(
    player,
    privateState,
    100,
    qualificationThreshold,
    {
      lastKeepWatchingDate: today,
      lastActivityDate: today,
    },
    undefined,
    undefined,
    {
      category: 'keep-watching',
      title: 'Sponsor Showcase Bonus',
    }
  );
  return true;
}

export function isEpisodeWatchedToday(
  watchedEpisodeIds: string[],
  episodeId: string,
  todayKey = getTodayDateKey()
): boolean {
  return watchedEpisodeIds.includes(`${episodeId}::${todayKey}`);
}

export async function claimEpisodeWatch(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  episode: DramaEpisode,
  qualificationThreshold: number
): Promise<boolean> {
  const todayKey = getTodayDateKey();
  const stamp = `${episode.id}::${todayKey}`;
  if (privateState.watchedEpisodeIds.includes(stamp)) {
    return false;
  }
  const nextWatched = [...privateState.watchedEpisodeIds, stamp].slice(-100);
  await awardPlayerCoins(
    player,
    privateState,
    episode.rewardCoins,
    qualificationThreshold,
    {
      watchedEpisodeIds: nextWatched,
      lastActivityDate: todayKey,
    },
    undefined,
    undefined,
    {
      category: 'episode',
      title: `${episode.episodeLabel}: ${episode.title}`.slice(0, 100),
    }
  );
  return true;
}

export async function claimVideoAdBreak(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  qualificationThreshold: number,
  rewardCoins = 100
): Promise<void> {
  const todayKey = getTodayDateKey();
  await awardPlayerCoins(
    player,
    privateState,
    rewardCoins,
    qualificationThreshold,
    {
      lastActivityDate: todayKey,
    },
    undefined,
    undefined,
    {
      category: 'ad-break',
      title: '2-Minute Video Ad Break Bonus',
    }
  );
}

export function mergeWatchedEpisodeId(
  existingIds: string[] = [],
  episodeId: string
): string[] {
  const cleanId = episodeId.trim();
  if (!cleanId) return existingIds.slice(-100);
  const alreadyPresent = existingIds.some(
    (entry) => entry === cleanId || entry.startsWith(`${cleanId}::`)
  );
  if (alreadyPresent) return existingIds.slice(-100);
  return [...existingIds, cleanId].slice(-100);
}

export async function markEpisodeAsWatched(
  uid: string,
  privateState: PlayerPrivate,
  episodeId: string
): Promise<string[]> {
  const nextWatched = mergeWatchedEpisodeId(privateState.watchedEpisodeIds || [], episodeId);
  if (nextWatched.length === (privateState.watchedEpisodeIds || []).length) {
    return nextWatched;
  }
  const todayKey = getTodayDateKey();
  const path = `playerPrivate/${uid}`;
  try {
    await updateDoc(doc(db, 'playerPrivate', uid), {
      watchedEpisodeIds: nextWatched,
      lastActivityDate: todayKey,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
  return nextWatched;
}

export async function awardWatchPotCoins(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  rewardCoins: number,
  qualificationThreshold: number,
  episodeTitle: string,
  episodeId?: string
): Promise<void> {
  const todayKey = getTodayDateKey();
  const safeReward = Math.max(100, Math.min(600, Math.round(rewardCoins || 300)));
  const nextWatched = episodeId
    ? mergeWatchedEpisodeId(privateState.watchedEpisodeIds || [], episodeId)
    : undefined;
  await awardPlayerCoins(
    player,
    privateState,
    safeReward,
    qualificationThreshold,
    {
      ...(nextWatched ? { watchedEpisodeIds: nextWatched } : {}),
      lastActivityDate: todayKey,
    },
    undefined,
    safeReward,
    {
      category: 'episode',
      title: `Coin Pot: ${episodeTitle}`.slice(0, 100),
    }
  );
}

export async function claimBannerAd(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  qualificationThreshold: number,
  cooldownMs: number
): Promise<boolean> {
  const now = Date.now();
  const todayKey = getTodayDateKey();
  if (now - (privateState.lastBannerClaimAt || 0) < cooldownMs) {
    return false;
  }
  await awardPlayerCoins(
    player,
    privateState,
    25,
    qualificationThreshold,
    {
      lastBannerClaimAt: now,
      lastActivityDate: todayKey,
    },
    undefined,
    undefined,
    {
      category: 'banner',
      title: 'Sponsor Banner Visit',
    }
  );
  return true;
}

export async function awardHeroBonusCoins(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  rewardCoins: number,
  qualificationThreshold: number
): Promise<void> {
  const todayKey = getTodayDateKey();
  const safeReward = Math.max(25, Math.min(500, Math.round(rewardCoins || 100)));
  await awardPlayerCoins(
    player,
    privateState,
    safeReward,
    qualificationThreshold,
    {
      lastActivityDate: todayKey,
    },
    undefined,
    safeReward,
    {
      category: 'banner',
      title: 'Hero Carousel Bonus Claim',
    }
  );
}

export async function awardMysteryBoxCoins(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  boxNumber: number,
  rewardCoins: number,
  qualificationThreshold: number,
  isJackpot = false
): Promise<void> {
  const todayKey = getTodayDateKey();
  const safeReward = Math.max(100, Math.min(1000, Math.round(rewardCoins)));
  await awardPlayerCoins(
    player,
    privateState,
    safeReward,
    qualificationThreshold,
    {
      lastActivityDate: todayKey,
    },
    undefined,
    safeReward,
    {
      category: 'mystery-box',
      title: isJackpot
        ? `Mystery Box #${boxNumber} — 11th Ad R3 Boost (+1,000 Coins)`
        : `Mystery Box #${boxNumber} Bonus`,
    }
  );
}

function escapeHtml(raw: string): string {
  return raw
    .replace(/&/g, '&amp;')
    .replace(/</g, '&lt;')
    .replace(/>/g, '&gt;')
    .replace(/"/g, '&quot;')
    .replace(/'/g, '&#39;');
}

function buildMailPayload(params: {
  uid: string;
  eventType: 'prize_win' | 'support_message';
  subject: string;
  text: string;
  html: string;
}) {
  return {
    uid: params.uid.slice(0, 128),
    to: [ADMIN_NOTIFICATION_EMAIL],
    eventType: params.eventType,
    message: {
      subject: params.subject.trim().slice(0, 200),
      text: params.text.trim().slice(0, 5000),
      html: params.html.trim().slice(0, 10000),
    },
    createdAt: serverTimestamp(),
  };
}

export async function awardCloudR3BoostPrize(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  boxNumber: number,
  appConfig: AppConfig
): Promise<{
  winnerRecord: MysteryWinnerRecord;
  newPoolPrizeZar: number;
}> {
  const todayKey = getTodayDateKey();
  const threshold = appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
  const boostCoins = 1000;
  const newCoins = Math.max(0, player.coins + boostCoins);
  const newWeekly = player.weeklyCoins + boostCoins;
  const qualified = newWeekly >= threshold;
  const voucherCode = `DW-R3-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
  const winnerId = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const prizeWinId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
  const mailId = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

  let basePool = appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR;
  let configExists = false;
  try {
    const cfgSnap = await getDoc(doc(db, 'appConfig', 'global'));
    if (cfgSnap.exists()) {
      configExists = true;
      const snapPool = cfgSnap.data()?.poolPrizeZar;
      if (typeof snapPool === 'number') {
        basePool = snapPool;
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.GET, 'appConfig/global');
  }

  const newPoolPrizeZar = basePool + R3_BOOST_ZAR;
  const batch = writeBatch(db);

  batch.update(doc(db, 'leaderboard', player.uid), {
    coins: newCoins,
    weeklyCoins: newWeekly,
    qualified,
    streakCount: player.streakCount,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'playerPrivate', player.uid), {
    lastActivityDate: todayKey,
    lastMysteryPickDate: '',
    updatedAt: serverTimestamp(),
  });
  batch.set(doc(db, 'playerPrivate', player.uid, 'transactions', buildTransactionId('r3')), {
    uid: player.uid,
    type: 'earn',
    category: 'mystery-box',
    title: `Mystery Box #${boxNumber} — R3 Progress Bar Boost`,
    amount: boostCoins,
    balanceAfter: newCoins,
    createdAt: serverTimestamp(),
  });
  batch.set(doc(db, 'mysteryWinners', winnerId), {
    uid: player.uid,
    username: player.username.slice(0, 32),
    contact: (privateState.contact || 'Player').slice(0, 120),
    voucherCode,
    amountZar: R3_BOOST_ZAR,
    boxNumber,
    createdAt: serverTimestamp(),
  });

  if (configExists) {
    batch.update(doc(db, 'appConfig', 'global'), {
      poolPrizeZar: newPoolPrizeZar,
      r5WinnerUsername: '',
      nextPickWinsR5: false,
      updatedAt: serverTimestamp(),
    });
  }

  const summary = `Box #${boxNumber} R3 Progress Bar Boost (+${boostCoins} Coins & R${R3_BOOST_ZAR} Boost) — Voucher ${voucherCode}`;
  batch.set(doc(db, 'prize_wins', prizeWinId), {
    uid: player.uid,
    createdByUid: player.uid,
    username: player.username.slice(0, 32),
    contact: (privateState.contact || 'Player').slice(0, 120),
    prizeType: 'mystery_r3_boost',
    amountZar: R3_BOOST_ZAR,
    coinsAwarded: boostCoins,
    voucherCode,
    boxNumber,
    weekKey: getCurrentWeekKey(),
    summary,
    status: 'recorded',
    createdAt: serverTimestamp(),
  });

  const subject = `[DramaWin Prize Win] ${player.username} unlocked R${R3_BOOST_ZAR} Progress Bar Boost (${voucherCode})`;
  const text = [
    `Player: ${player.username} (UID: ${player.uid})`,
    `Contact: ${privateState.contact}`,
    `Prize: R${R3_BOOST_ZAR} Progress Bar Boost + ${boostCoins} Bonus Coins`,
    `Box Number: #${boxNumber}`,
    `Voucher Code: ${voucherCode}`,
    `Updated Sunday Pool: R${newPoolPrizeZar}`,
  ].join('\n');
  const html = `<h2>DramaWin R3 Progress Bar Boost Winner</h2>
<p><strong>Player:</strong> ${escapeHtml(player.username)} (${escapeHtml(player.uid)})</p>
<p><strong>Contact:</strong> ${escapeHtml(privateState.contact || 'N/A')}</p>
<p><strong>Prize:</strong> R${R3_BOOST_ZAR} Progress Bar Boost + ${boostCoins} Bonus Coins</p>
<p><strong>Box #:</strong> ${boxNumber} &middot; <strong>Voucher:</strong> <code>${escapeHtml(voucherCode)}</code></p>
<p><strong>Updated Sunday Pool:</strong> R${newPoolPrizeZar}</p>`;

  batch.set(
    doc(db, 'mail', mailId),
    buildMailPayload({
      uid: player.uid,
      eventType: 'prize_win',
      subject,
      text,
      html,
    })
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'prize_wins');
  }

  return {
    winnerRecord: {
      id: winnerId,
      uid: player.uid,
      username: player.username,
      contact: privateState.contact,
      voucherCode,
      amountZar: R3_BOOST_ZAR,
      boxNumber,
    },
    newPoolPrizeZar,
  };
}

export async function claimMysteryBox(
  player: LeaderboardPlayer,
  privateState: PlayerPrivate,
  boxNumber: number,
  paidWithCoins: boolean,
  appConfig: AppConfig
): Promise<{
  outcome: BoxOutcome;
  allBoxes: BoxOutcome[];
  winnerRecord?: MysteryWinnerRecord;
  newPoolPrizeZar?: number;
}> {
  if (paidWithCoins && player.coins < MYSTERY_ENTRY_COST) {
    throw new Error(`You need at least ${MYSTERY_ENTRY_COST} Coins to unlock.`);
  }

  const targetUsername = (appConfig.r5WinnerUsername || '').trim().toLowerCase();
  const isNamedWinner =
    targetUsername.length > 0 &&
    player.username.trim().toLowerCase() === targetUsername;
  const isR3Winner = Boolean(appConfig.nextPickWinsR5) || isNamedWinner;

  const coinRewards = [25, 50, 75, 100];
  const allBoxes: BoxOutcome[] = Array.from({ length: 12 }, (_, idx) => {
    const num = idx + 1;
    if (isR3Winner && num === boxNumber) {
      return {
        boxNumber: num,
        kind: 'airtime',
        coins: 1000,
      };
    }
    return {
      boxNumber: num,
      kind: 'coins',
      coins: coinRewards[Math.floor(Math.random() * coinRewards.length)],
    };
  });

  const chosen = allBoxes[boxNumber - 1];
  const entryCost = paidWithCoins ? MYSTERY_ENTRY_COST : 0;
  const walletDelta = chosen.coins - entryCost;
  const weeklyGain = chosen.coins;

  const newCoins = Math.max(0, player.coins + Math.round(walletDelta));
  const newWeekly = player.weeklyCoins + Math.max(0, Math.min(1000, Math.round(weeklyGain)));
  const qualified = newWeekly >= appConfig.qualificationThreshold;

  const batch = writeBatch(db);
  batch.update(doc(db, 'leaderboard', player.uid), {
    coins: newCoins,
    weeklyCoins: newWeekly,
    qualified,
    streakCount: player.streakCount,
    updatedAt: serverTimestamp(),
  });
  batch.update(doc(db, 'playerPrivate', player.uid), {
    lastMysteryPickDate: '',
    updatedAt: serverTimestamp(),
  });

  if (entryCost > 0) {
    batch.set(doc(db, 'playerPrivate', player.uid, 'transactions', buildTransactionId('e')), {
      uid: player.uid,
      type: 'spend',
      category: 'mystery-entry',
      title: `Mystery Vault Box #${boxNumber} Entry`,
      amount: -entryCost,
      balanceAfter: Math.max(0, player.coins - entryCost),
      createdAt: serverTimestamp(),
    });
  }

  batch.set(doc(db, 'playerPrivate', player.uid, 'transactions', buildTransactionId('b')), {
    uid: player.uid,
    type: 'earn',
    category: 'mystery-box',
    title:
      chosen.kind === 'airtime'
        ? `Mystery Box #${boxNumber} — R3 Progress Bar Boost`
        : `Mystery Box #${boxNumber} Bonus`,
    amount: chosen.coins,
    balanceAfter: newCoins,
    createdAt: serverTimestamp(),
  });

  let winnerRecord: MysteryWinnerRecord | undefined;
  let newPoolPrizeZar: number | undefined;

  if (chosen.kind === 'airtime') {
    const voucherCode = `DW-R3-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    chosen.voucherCode = voucherCode;
    const winnerId = `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const prizeWinId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
    const mailId = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;

    batch.set(doc(db, 'mysteryWinners', winnerId), {
      uid: player.uid,
      username: player.username,
      contact: privateState.contact,
      voucherCode,
      amountZar: R3_BOOST_ZAR,
      boxNumber,
      createdAt: serverTimestamp(),
    });

    const configRef = doc(db, 'appConfig', 'global');
    let basePool = appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR;
    try {
      const cfgSnap = await getDoc(configRef);
      if (cfgSnap.exists()) {
        const snapPool = cfgSnap.data()?.poolPrizeZar;
        if (typeof snapPool === 'number') {
          basePool = snapPool;
        }
        newPoolPrizeZar = basePool + R3_BOOST_ZAR;
        batch.update(configRef, {
          poolPrizeZar: newPoolPrizeZar,
          r5WinnerUsername: '',
          nextPickWinsR5: false,
          updatedAt: serverTimestamp(),
        });
      }
    } catch (error) {
      handleFirestoreError(error, OperationType.GET, 'appConfig/global');
    }

    batch.set(doc(db, 'prize_wins', prizeWinId), {
      uid: player.uid,
      createdByUid: player.uid,
      username: player.username.slice(0, 32),
      contact: (privateState.contact || 'Player').slice(0, 120),
      prizeType: 'mystery_r3_boost',
      amountZar: R3_BOOST_ZAR,
      coinsAwarded: chosen.coins,
      voucherCode,
      boxNumber,
      weekKey: getCurrentWeekKey(),
      summary: `Box #${boxNumber} R3 Progress Bar Boost — Voucher ${voucherCode}`,
      status: 'recorded',
      createdAt: serverTimestamp(),
    });

    batch.set(
      doc(db, 'mail', mailId),
      buildMailPayload({
        uid: player.uid,
        eventType: 'prize_win',
        subject: `[DramaWin Prize Win] ${player.username} won R${R3_BOOST_ZAR} Boost (${voucherCode})`,
        text: `Player ${player.username} unlocked Box #${boxNumber} R3 Progress Bar Boost (${voucherCode}). Contact: ${privateState.contact}`,
        html: `<h2>DramaWin R3 Progress Bar Boost Winner</h2><p><strong>Player:</strong> ${escapeHtml(player.username)}</p><p><strong>Voucher:</strong> <code>${escapeHtml(voucherCode)}</code></p><p><strong>Contact:</strong> ${escapeHtml(privateState.contact)}</p>`,
      })
    );

    winnerRecord = {
      id: winnerId,
      uid: player.uid,
      username: player.username,
      contact: privateState.contact,
      voucherCode,
      amountZar: R3_BOOST_ZAR,
      boxNumber,
    };
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(
      error,
      OperationType.WRITE,
      chosen.kind === 'airtime' ? 'appConfig/global' : `leaderboard/${player.uid}`
    );
  }

  return { outcome: chosen, allBoxes, winnerRecord, newPoolPrizeZar };
}

export async function unlockAdminAccess(uid: string, passcode: string): Promise<void> {
  if (passcode !== ADMIN_PASSCODE) {
    throw new Error('Incorrect Admin Studio password.');
  }
  try {
    const adminRef = doc(db, 'admins', uid);
    const snap = await getDoc(adminRef);
    if (!snap.exists()) {
      await setDoc(adminRef, {
        role: 'admin',
        passcode,
        createdAt: serverTimestamp(),
      });
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `admins/${uid}`);
  }
}

function buildFirestoreEpisodeFields(ep: Omit<DramaEpisode, 'id' | 'createdAt' | 'updatedAt'>) {
  const cleanSeries = (ep.series.trim() || 'Featured Series').slice(0, 60);
  const cleanTitle = (ep.title.trim() || 'Untitled Episode').slice(0, 100);
  const seriesId = getEpisodeSeriesId({ series: cleanSeries, seriesId: ep.seriesId }).slice(0, 80);
  const category = inferEpisodeCategory(cleanSeries, cleanTitle, ep.category).slice(0, 32);

  return {
    title: cleanTitle,
    series: cleanSeries,
    seriesId,
    category,
    episodeLabel: (ep.episodeLabel.trim() || 'Series').slice(0, 24),
    duration: (ep.duration.trim() || 'Watch & Earn').slice(0, 16),
    rewardCoins: Math.max(1, Math.min(5000, Math.round(ep.rewardCoins || 100))),
    coverImage: (ep.coverImage?.trim() || 'none').slice(0, 500),
    synopsis: (ep.synopsis.trim() || 'Featured drama series.').slice(0, 240),
    sponsorUrl: ep.sponsorUrl ? ep.sponsorUrl.slice(0, 500) : '',
    youtubeUrl: (ep.youtubeUrl || '').slice(0, 500),
    startTime: normalizeEpisodeStartSeconds(ep.startTime ?? DEFAULT_VIDEO_START_SECONDS),
    sortOrder: Math.max(0, Math.min(10000, Math.round(ep.sortOrder || 1))),
    isPublic: true,
  };
}

export async function purgeLegacyAndStrayEpisodesFromFirestore(): Promise<number> {
  try {
    const snap = await getDocs(
      query(collection(db, 'episodes'), where('isPublic', '==', true))
    );
    const docsSorted = [...snap.docs].sort(
      (a, b) => ((a.data()?.sortOrder as number) || 0) - ((b.data()?.sortOrder as number) || 0)
    );

    const toDeleteIds = new Set<string>();
    const toDeleteRefs: typeof snap.docs = [];
    const seenSeriesVideo = new Set<string>();

    for (const d of docsSorted) {
      const ep = { id: d.id, ...(d.data() as Omit<DramaEpisode, 'id'>) };
      if (isLegacyBrokenEpisode(ep)) {
        toDeleteIds.add(d.id);
        toDeleteRefs.push(d);
        continue;
      }
      const sId = getEpisodeSeriesId(ep);
      const videoKey = getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl);
      if (videoKey) {
        const sig = `${sId}::${videoKey}`;
        if (seenSeriesVideo.has(sig)) {
          toDeleteIds.add(d.id);
          toDeleteRefs.push(d);
          continue;
        }
        seenSeriesVideo.add(sig);
      }
    }

    const seriesSnap = await getDocs(
      query(collection(db, 'series'), where('isPublic', '==', true))
    );
    const straySeries = seriesSnap.docs.filter((d) => {
      const s = d.data() as Partial<DramaSeries>;
      return /gojo|jujutsu|jjk|candy\s*man/i.test(`${d.id} ${s.title || ''}`);
    });
    const straySeriesIds = new Set(straySeries.map((d) => d.id));

    const seriesUpdates: Array<{ ref: (typeof seriesSnap.docs)[number]['ref']; removedIds: string[] }> = [];
    if (toDeleteIds.size > 0) {
      for (const sDoc of seriesSnap.docs) {
        if (straySeriesIds.has(sDoc.id)) continue;
        const data = sDoc.data() as Partial<DramaSeries>;
        const epIds = Array.isArray(data.episodeIds) ? data.episodeIds : [];
        const removedIds = epIds.filter((id) => toDeleteIds.has(id));
        if (removedIds.length > 0) {
          seriesUpdates.push({ ref: sDoc.ref, removedIds });
        }
      }
    }

    if (toDeleteRefs.length === 0 && straySeries.length === 0 && seriesUpdates.length === 0) {
      return 0;
    }

    const batch = writeBatch(db);
    toDeleteRefs.forEach((d) => batch.delete(d.ref));
    straySeries.forEach((d) => batch.delete(d.ref));
    seriesUpdates.forEach(({ ref, removedIds }) => {
      batch.update(ref, {
        episodeIds: arrayRemove(...removedIds),
        updatedAt: serverTimestamp(),
      });
    });
    await batch.commit();
    return toDeleteRefs.length + straySeries.length;
  } catch {
    return 0;
  }
}

export async function ensureAdminSeededData(): Promise<void> {
  try {
    const configRef = doc(db, 'appConfig', 'global');
    const configSnap = await getDoc(configRef);
    const currentEpisodes = await getDocs(
      query(collection(db, 'episodes'), where('isPublic', '==', true))
    );

    const existingIds = new Set(currentEpisodes.docs.map((d) => d.id));
    const hasLegacyPlaceholders = LEGACY_PLACEHOLDER_EPISODE_IDS.some((id) =>
      existingIds.has(id)
    );

    const batch = writeBatch(db);
    let hasWrites = false;

    if (!configSnap.exists()) {
      batch.set(configRef, {
        ...DEFAULT_APP_CONFIG,
        sponsorAdUrl: DEFAULT_SPONSOR_URL,
        episodesSeeded: true,
        updatedAt: serverTimestamp(),
      });
      hasWrites = true;
    }

    if (hasLegacyPlaceholders) {
      for (const legacyId of LEGACY_PLACEHOLDER_EPISODE_IDS) {
        if (existingIds.has(legacyId)) {
          batch.delete(doc(db, 'episodes', legacyId));
          hasWrites = true;
        }
      }
    }

    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }
}

export async function restoreDefaultEpisodes(): Promise<void> {
  const path = 'episodes';
  try {
    const currentEpisodes = await getDocs(
      query(collection(db, 'episodes'), where('isPublic', '==', true))
    );
    const existingIds = new Set(currentEpisodes.docs.map((d) => d.id));
    const batch = writeBatch(db);
    let hasWrites = false;

    for (const legacyId of LEGACY_PLACEHOLDER_EPISODE_IDS) {
      if (existingIds.has(legacyId)) {
        batch.delete(doc(db, 'episodes', legacyId));
        hasWrites = true;
      }
    }

    for (const ep of CURATED_DEFAULT_EPISODES) {
      const { id, ...rest } = ep;
      const payload = buildFirestoreEpisodeFields(rest);
      if (existingIds.has(id)) {
        batch.update(doc(db, 'episodes', id), {
          ...payload,
          updatedAt: serverTimestamp(),
        });
      } else {
        batch.set(doc(db, 'episodes', id), {
          ...payload,
          createdAt: serverTimestamp(),
          updatedAt: serverTimestamp(),
        });
      }
      hasWrites = true;
    }

    const currentSeries = await getDocs(
      query(collection(db, 'series'), where('isPublic', '==', true))
    );
    currentSeries.docs.forEach((d) => {
      batch.delete(d.ref);
      hasWrites = true;
    });

    if (hasWrites) {
      await batch.commit();
    }
    forceSaveDefaultEpisodesToLocalStorage();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

function sanitizeTickerNames(names?: string[]): string[] {
  const source = names && names.length > 0 ? names : DEFAULT_LIVE_TICKER_NAMES;
  return source
    .map((n) => n.trim().slice(0, 32))
    .filter(Boolean)
    .slice(0, 20);
}

function buildFullConfigPayload(currentConfig: AppConfig, overrides: Partial<AppConfig>) {
  return {
    sponsorAdUrl: overrides.sponsorAdUrl ?? currentConfig.sponsorAdUrl,
    embeddedAdHtml: (overrides.embeddedAdHtml ?? currentConfig.embeddedAdHtml ?? '').slice(0, 8000),
    poolPrizeZar: overrides.poolPrizeZar ?? currentConfig.poolPrizeZar,
    rolloverAmountZar: overrides.rolloverAmountZar ?? currentConfig.rolloverAmountZar ?? 0,
    poolWeekKey: (overrides.poolWeekKey ?? currentConfig.poolWeekKey ?? getCurrentWeekKey()).slice(0, 16),
    weekStartTimestamp: Math.max(
      0,
      Math.round(
        overrides.weekStartTimestamp ??
          currentConfig.weekStartTimestamp ??
          getMondayStartTimestampSAST()
      )
    ),
    lastPoolWinnerSummary: (
      overrides.lastPoolWinnerSummary ??
      currentConfig.lastPoolWinnerSummary ??
      ''
    ).slice(0, 300),
    lastWinnerUids: (overrides.lastWinnerUids ?? currentConfig.lastWinnerUids ?? []).slice(0, 3),
    mysteryWinningBoxes: Math.max(
      0,
      Math.min(12, Math.round(overrides.mysteryWinningBoxes ?? currentConfig.mysteryWinningBoxes ?? 0))
    ),
    r5WinnerUsername: (
      overrides.r5WinnerUsername !== undefined
        ? overrides.r5WinnerUsername
        : currentConfig.r5WinnerUsername ?? ''
    )
      .trim()
      .slice(0, 32),
    nextPickWinsR5:
      overrides.nextPickWinsR5 !== undefined
        ? Boolean(overrides.nextPickWinsR5)
        : Boolean(currentConfig.nextPickWinsR5),
    liveTickerEnabled:
      overrides.liveTickerEnabled !== undefined
        ? Boolean(overrides.liveTickerEnabled)
        : currentConfig.liveTickerEnabled !== false,
    liveTickerNames: sanitizeTickerNames(
      overrides.liveTickerNames !== undefined
        ? overrides.liveTickerNames
        : currentConfig.liveTickerNames
    ),
    poolTargetCoins: currentConfig.poolTargetCoins,
    qualificationThreshold: currentConfig.qualificationThreshold,
    episodesSeeded: currentConfig.episodesSeeded,
    isPublic: true,
    updatedAt: serverTimestamp(),
  };
}

export async function updateSponsorAdUrl(newUrl: string, currentConfig: AppConfig): Promise<void> {
  const sanitized = sanitizeExternalUrl(newUrl).slice(0, 500);
  try {
    await setDoc(
      doc(db, 'appConfig', 'global'),
      buildFullConfigPayload(currentConfig, { sponsorAdUrl: sanitized })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }
}

export async function updateEmbeddedAdHtml(
  html: string,
  currentConfig: AppConfig
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'appConfig', 'global'),
      buildFullConfigPayload(currentConfig, { embeddedAdHtml: html })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }
}

export async function updateLiveTickerConfig(
  currentConfig: AppConfig,
  liveTickerEnabled: boolean,
  liveTickerNames: string[]
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'appConfig', 'global'),
      buildFullConfigPayload(currentConfig, {
        liveTickerEnabled,
        liveTickerNames,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }
}

export async function updateMysteryAndRolloverConfig(
  currentConfig: AppConfig,
  updates: {
    mysteryWinningBoxes?: number;
    r5WinnerUsername?: string;
    nextPickWinsR5?: boolean;
    poolPrizeZar: number;
    rolloverAmountZar: number;
    lastPoolWinnerSummary?: string;
    lastWinnerUids?: string[];
  }
): Promise<void> {
  try {
    await setDoc(
      doc(db, 'appConfig', 'global'),
      buildFullConfigPayload(currentConfig, {
        mysteryWinningBoxes: updates.mysteryWinningBoxes ?? 0,
        r5WinnerUsername: updates.r5WinnerUsername,
        nextPickWinsR5: updates.nextPickWinsR5,
        poolPrizeZar: Math.max(0, Math.round(updates.poolPrizeZar)),
        rolloverAmountZar: Math.max(0, Math.round(updates.rolloverAmountZar)),
        lastPoolWinnerSummary: updates.lastPoolWinnerSummary,
        lastWinnerUids: updates.lastWinnerUids,
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }
}

async function resetAllWeeklyLeaderboardScores(
  sundayBonusAwards: Map<string, number> = new Map()
): Promise<number> {
  const path = 'leaderboard';
  let resetCount = 0;
  try {
    const snap = await getDocs(
      query(collection(db, 'leaderboard'), where('isPublic', '==', true))
    );
    const docsToUpdate = snap.docs.filter((d) => {
      const data = d.data() as Partial<LeaderboardPlayer>;
      return (
        (data.weeklyCoins || 0) > 0 ||
        Boolean(data.qualified) ||
        (data.streakCount || 0) > 0 ||
        sundayBonusAwards.has(d.id)
      );
    });

    for (let i = 0; i < docsToUpdate.length; i += 400) {
      const chunk = docsToUpdate.slice(i, i + 400);
      const batch = writeBatch(db);
      for (const playerDoc of chunk) {
        const data = playerDoc.data() as Partial<LeaderboardPlayer>;
        const awardZar = sundayBonusAwards.get(playerDoc.id) || 0;
        const updates: Record<string, unknown> = {
          weeklyCoins: 0,
          qualified: false,
          streakCount: 0,
          updatedAt: serverTimestamp(),
        };
        if (awardZar > 0) {
          updates.sundayBonusZar = Math.max(0, (data.sundayBonusZar || 0) + awardZar);
        }
        batch.update(playerDoc.ref, updates);
      }
      await batch.commit();
      resetCount += chunk.length;
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
  return resetCount;
}

export async function evaluateSundayPoolRollover(
  currentConfig: AppConfig,
  players: LeaderboardPlayer[]
): Promise<{
  outcome: 'distributed' | 'rolled_over';
  summary: string;
  nextPoolZar: number;
  playersReset: number;
}> {
  const threshold = currentConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD;
  const sortedQualified = [...players]
    .filter((p) => (p.weeklyCoins || 0) >= threshold)
    .sort((a, b) => b.weeklyCoins - a.weeklyCoins);

  const currentPool = Math.max(
    DEFAULT_POOL_PRIZE_ZAR,
    currentConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR
  );
  const nextWeekKey = getCurrentWeekKey();
  const nextWeekStartTimestamp = getMondayStartTimestampSAST();

  if (sortedQualified.length >= 3) {
    const first = sortedQualified[0];
    const second = sortedQualified[1];
    const third = sortedQualified[2];
    const p1 = Math.round(currentPool * 0.5);
    const p2 = Math.round(currentPool * 0.3);
    const p3 = Math.round(currentPool * 0.2);
    const summary = `1st: ${first.username} (R${p1}) · 2nd: ${second.username} (R${p2}) · 3rd: ${third.username} (R${p3})`;

    const awardMap = new Map<string, number>([
      [first.uid, p1],
      [second.uid, p2],
      [third.uid, p3],
    ]);

    try {
      const batch = writeBatch(db);
      batch.set(
        doc(db, 'appConfig', 'global'),
        buildFullConfigPayload(currentConfig, {
          poolPrizeZar: DEFAULT_POOL_PRIZE_ZAR,
          rolloverAmountZar: 0,
          poolWeekKey: nextWeekKey,
          weekStartTimestamp: nextWeekStartTimestamp,
          lastPoolWinnerSummary: summary,
          lastWinnerUids: [first.uid, second.uid, third.uid],
        })
      );

      const actorUid = auth.currentUser?.uid || first.uid;
      const topWinners = [
        { player: first, rank: 1, prizeZar: p1 },
        { player: second, rank: 2, prizeZar: p2 },
        { player: third, rank: 3, prizeZar: p3 },
      ];

      topWinners.forEach(({ player: winner, rank, prizeZar }) => {
        const winId = `pw-pool-${Date.now()}-${rank}-${Math.random().toString(36).slice(2, 6)}`;
        batch.set(doc(db, 'prize_wins', winId), {
          uid: winner.uid,
          createdByUid: actorUid,
          username: winner.username.slice(0, 32),
          prizeType: 'sunday_pool',
          amountZar: prizeZar,
          coinsAwarded: 0,
          rank,
          weekKey: nextWeekKey,
          summary: `Sunday Pool #${rank} Place — R${prizeZar} (${winner.username})`,
          status: 'recorded',
          createdAt: serverTimestamp(),
        });
      });

      const mailId = `mail-pool-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`;
      batch.set(
        doc(db, 'mail', mailId),
        buildMailPayload({
          uid: actorUid,
          eventType: 'prize_win',
          subject: `[DramaWin Sunday Pool] R${currentPool} Payout Winners (${nextWeekKey})`,
          text: [
            `Sunday Prize Pool Payout Triggered (${nextWeekKey})`,
            `Total Pool: R${currentPool}`,
            `1st Place: ${first.username} (${first.uid}) — R${p1}`,
            `2nd Place: ${second.username} (${second.uid}) — R${p2}`,
            `3rd Place: ${third.username} (${third.uid}) — R${p3}`,
          ].join('\n'),
          html: `<h2>DramaWin Sunday Prize Pool Payout (${escapeHtml(nextWeekKey)})</h2>
<p><strong>Total Pool:</strong> R${currentPool}</p>
<ol>
  <li><strong>${escapeHtml(first.username)}</strong> (${escapeHtml(first.uid)}) — <strong>R${p1}</strong></li>
  <li><strong>${escapeHtml(second.username)}</strong> (${escapeHtml(second.uid)}) — <strong>R${p2}</strong></li>
  <li><strong>${escapeHtml(third.username)}</strong> (${escapeHtml(third.uid)}) — <strong>R${p3}</strong></li>
</ol>`,
        })
      );

      await batch.commit();
    } catch (error) {
      handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
    }

    const playersReset = await resetAllWeeklyLeaderboardScores(awardMap);

    return {
      outcome: 'distributed',
      summary,
      nextPoolZar: DEFAULT_POOL_PRIZE_ZAR,
      playersReset,
    };
  }

  // Fewer than 3 qualified -> do NOT pay out; roll over 100% of unclaimed pool + new week's R50 base (R50 -> R100)
  const nextPoolZar = currentPool + DEFAULT_POOL_PRIZE_ZAR;
  const summary = `Unclaimed R${currentPool} rolled over into R${nextPoolZar} pool (${sortedQualified.length}/3 qualified).`;

  try {
    await setDoc(
      doc(db, 'appConfig', 'global'),
      buildFullConfigPayload(currentConfig, {
        poolPrizeZar: nextPoolZar,
        rolloverAmountZar: currentPool,
        poolWeekKey: nextWeekKey,
        weekStartTimestamp: nextWeekStartTimestamp,
        lastPoolWinnerSummary: '',
        lastWinnerUids: [],
      })
    );
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, 'appConfig/global');
  }

  const playersReset = await resetAllWeeklyLeaderboardScores();

  return {
    outcome: 'rolled_over',
    summary,
    nextPoolZar,
    playersReset,
  };
}

export async function upsertDramaSeries(input: {
  title: string;
  seriesId?: string;
  category?: string;
  coverImage?: string;
  synopsis?: string;
  episodeIdToAdd?: string;
  sortOrder?: number;
}): Promise<void> {
  const cleanTitle = (input.title.trim() || 'Featured Series').slice(0, 60);
  const seriesId = (input.seriesId?.trim() || toSeriesId(cleanTitle)).slice(0, 80);
  const path = `series/${seriesId}`;
  const category = inferEpisodeCategory(cleanTitle, undefined, input.category).slice(0, 32);
  const coverImage = (input.coverImage?.trim() || 'none').slice(0, 500);
  const synopsis = (input.synopsis?.trim() || `${cleanTitle} drama series.`).slice(0, 240);

  try {
    const docRef = doc(db, 'series', seriesId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        seriesId,
        title: cleanTitle,
        category,
        coverImage,
        synopsis,
        episodeIds: input.episodeIdToAdd ? [input.episodeIdToAdd] : [],
        sortOrder: Math.max(0, Math.min(10000, Math.round(input.sortOrder ?? 1))),
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
    } else {
      const existingData = snap.data() as Partial<DramaSeries>;
      const updates: Record<string, unknown> = {
        title: cleanTitle,
        category,
        updatedAt: serverTimestamp(),
      };
      if (coverImage !== 'none' && (!existingData.coverImage || existingData.coverImage === 'none')) {
        updates.coverImage = coverImage;
      }
      if (input.episodeIdToAdd) {
        updates.episodeIds = arrayUnion(input.episodeIdToAdd);
      }
      await updateDoc(docRef, updates);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, path);
  }
}

export async function deleteDramaSeriesFromFirestore(
  seriesNameOrId: string,
  episodeIds: string[] = []
): Promise<void> {
  const seriesId = seriesNameOrId.startsWith('series-')
    ? seriesNameOrId
    : toSeriesId(seriesNameOrId);
  try {
    const idsToDelete = new Set(episodeIds.filter(Boolean));
    const epSnap = await getDocs(
      query(collection(db, 'episodes'), where('isPublic', '==', true))
    );
    epSnap.docs.forEach((d) => {
      const data = d.data() as Partial<DramaEpisode>;
      if (getEpisodeSeriesId(data) === seriesId) {
        idsToDelete.add(d.id);
      }
    });

    for (const epId of idsToDelete) {
      const epRef = doc(db, 'episodes', epId);
      const epSnapDoc = await getDoc(epRef);
      if (epSnapDoc.exists()) {
        await deleteDoc(epRef);
      }
    }
    const seriesRef = doc(db, 'series', seriesId);
    const seriesSnap = await getDoc(seriesRef);
    if (seriesSnap.exists()) {
      await deleteDoc(seriesRef);
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, `series/${seriesId}`);
  }
}

export async function addDramaEpisode(input: {
  id?: string;
  title: string;
  series: string;
  seriesId?: string;
  category?: string;
  episodeLabel: string;
  duration: string;
  rewardCoins: number;
  coverImage: string;
  thumbnailUrl?: string;
  synopsis: string;
  sponsorUrl: string;
  youtubeUrl?: string;
  videoUrl?: string;
  startTime?: number;
  sortOrder: number;
}): Promise<void> {
  const id = input.id?.trim() || `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const path = `episodes/${id}`;
  const rawVideo = (input.videoUrl || input.youtubeUrl || '').trim();
  const cleanVideo = rawVideo
    ? (rawVideo.startsWith('idb://')
        ? rawVideo
        : rawVideo.startsWith('data:') || rawVideo.startsWith('blob:')
          ? rawVideo.slice(0, 500)
          : sanitizeExternalUrl(rawVideo).slice(0, 500))
    : '';
  const rawCover = (input.thumbnailUrl || input.coverImage || '').trim();
  const explicitCover =
    rawCover && rawCover !== 'none'
      ? (rawCover.startsWith('idb://') || rawCover.startsWith('/')
          ? rawCover
          : rawCover.startsWith('data:') || rawCover.startsWith('blob:')
            ? rawCover.slice(0, 500)
            : sanitizeExternalUrl(rawCover))
      : '';
  const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
  const finalCover = (explicitCover || autoThumb || 'none').slice(0, 500);
  const cleanTitle = (input.title.trim() || 'Untitled Episode').slice(0, 100);
  const cleanSeries = (input.series.trim() || 'Featured Series').slice(0, 60);
  const seriesId = getEpisodeSeriesId({ series: cleanSeries, seriesId: input.seriesId }).slice(0, 80);
  const category = inferEpisodeCategory(cleanSeries, cleanTitle, input.category).slice(0, 32);
  const cleanSynopsis = (input.synopsis.trim() || `${cleanSeries} series.`).slice(0, 240);
  const safeStartTime = normalizeEpisodeStartSeconds(input.startTime);

  try {
    await setDoc(doc(db, 'episodes', id), {
      title: cleanTitle,
      series: cleanSeries,
      seriesId,
      category,
      episodeLabel: (input.episodeLabel.trim() || 'Series').slice(0, 24),
      duration: (input.duration.trim() || 'Watch & Earn').slice(0, 16),
      rewardCoins: Math.max(1, Math.min(5000, Math.round(input.rewardCoins || 100))),
      coverImage: finalCover,
      synopsis: cleanSynopsis,
      sponsorUrl: input.sponsorUrl.trim() ? sanitizeExternalUrl(input.sponsorUrl).slice(0, 500) : '',
      youtubeUrl: cleanVideo,
      startTime: safeStartTime,
      sortOrder: Math.max(0, Math.min(10000, Math.round(input.sortOrder))),
      isPublic: true,
      createdAt: serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.CREATE, path);
  }

  await upsertDramaSeries({
    title: cleanSeries,
    seriesId,
    category,
    coverImage: finalCover,
    synopsis: cleanSynopsis,
    episodeIdToAdd: id,
    sortOrder: input.sortOrder,
  });
}

export async function updateDramaEpisode(
  episodeId: string,
  input: {
    title: string;
    series: string;
    seriesId?: string;
    category?: string;
    episodeLabel: string;
    duration: string;
    rewardCoins: number;
    coverImage: string;
    thumbnailUrl?: string;
    synopsis: string;
    sponsorUrl: string;
    youtubeUrl?: string;
    videoUrl?: string;
    startTime?: number;
    sortOrder?: number;
  }
): Promise<void> {
  const path = `episodes/${episodeId}`;
  const rawVideo = (input.videoUrl || input.youtubeUrl || '').trim();
  const cleanVideo = rawVideo
    ? (rawVideo.startsWith('idb://')
        ? rawVideo
        : rawVideo.startsWith('data:') || rawVideo.startsWith('blob:')
          ? rawVideo.slice(0, 500)
          : sanitizeExternalUrl(rawVideo).slice(0, 500))
    : '';
  const rawCover = (input.thumbnailUrl || input.coverImage || '').trim();
  const explicitCover =
    rawCover && rawCover !== 'none'
      ? (rawCover.startsWith('idb://') || rawCover.startsWith('/')
          ? rawCover
          : rawCover.startsWith('data:') || rawCover.startsWith('blob:')
            ? rawCover.slice(0, 500)
            : sanitizeExternalUrl(rawCover))
      : '';
  const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
  const finalCover = (explicitCover || autoThumb || 'none').slice(0, 500);
  const cleanTitle = (input.title.trim() || 'Untitled Episode').slice(0, 100);
  const cleanSeries = (input.series.trim() || 'Featured Series').slice(0, 60);
  const seriesId = getEpisodeSeriesId({ series: cleanSeries, seriesId: input.seriesId }).slice(0, 80);
  const category = inferEpisodeCategory(cleanSeries, cleanTitle, input.category).slice(0, 32);

  const fields = {
    title: cleanTitle,
    series: cleanSeries,
    seriesId,
    category,
    episodeLabel: (input.episodeLabel.trim() || 'Series').slice(0, 24),
    duration: (input.duration.trim() || 'Watch & Earn').slice(0, 16),
    rewardCoins: Math.max(1, Math.min(5000, Math.round(input.rewardCoins || 100))),
    coverImage: finalCover,
    synopsis: (input.synopsis.trim() || `${cleanSeries} series.`).slice(0, 240),
    sponsorUrl: input.sponsorUrl.trim() ? sanitizeExternalUrl(input.sponsorUrl).slice(0, 500) : '',
    youtubeUrl: cleanVideo,
    startTime: normalizeEpisodeStartSeconds(input.startTime),
  };

  try {
    const docRef = doc(db, 'episodes', episodeId);
    const snap = await getDoc(docRef);
    if (!snap.exists()) {
      await setDoc(docRef, {
        ...fields,
        sortOrder: Math.max(0, Math.min(10000, Math.round(input.sortOrder ?? 1))),
        isPublic: true,
        createdAt: serverTimestamp(),
        updatedAt: serverTimestamp(),
      });
      return;
    }

    const existingData = snap.data() as Partial<DramaEpisode>;
    await setDoc(docRef, {
      ...fields,
      sortOrder:
        typeof existingData.sortOrder === 'number'
          ? Math.max(0, Math.min(10000, Math.round(existingData.sortOrder)))
          : 1,
      isPublic: true,
      createdAt: existingData.createdAt || serverTimestamp(),
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }

  await upsertDramaSeries({
    title: cleanSeries,
    seriesId,
    category,
    coverImage: finalCover,
    synopsis: fields.synopsis,
    episodeIdToAdd: episodeId,
    sortOrder: input.sortOrder,
  });
}

export async function reorderDramaEpisodes(
  updates: { id: string; sortOrder: number }[]
): Promise<void> {
  if (updates.length === 0) return;
  try {
    const batch = writeBatch(db);
    let hasWrites = false;
    for (const { id, sortOrder } of updates) {
      const ref = doc(db, 'episodes', id);
      const snap = await getDoc(ref);
      if (snap.exists()) {
        batch.update(ref, {
          sortOrder: Math.max(0, Math.min(10000, Math.round(sortOrder))),
          updatedAt: serverTimestamp(),
        });
        hasWrites = true;
      }
    }
    if (hasWrites) {
      await batch.commit();
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, 'episodes');
  }
}

export async function deleteDramaEpisode(
  episodeId: string,
  seriesIdHint?: string
): Promise<void> {
  const path = `episodes/${episodeId}`;
  let resolvedSeriesId = seriesIdHint || '';
  try {
    const docRef = doc(db, 'episodes', episodeId);
    const snap = await getDoc(docRef);
    if (snap.exists()) {
      const epData = snap.data() as Partial<DramaEpisode>;
      if (!resolvedSeriesId) {
        resolvedSeriesId = getEpisodeSeriesId(epData);
      }
      await deleteDoc(docRef);
    }
    if (resolvedSeriesId) {
      const seriesRef = doc(db, 'series', resolvedSeriesId);
      const seriesSnap = await getDoc(seriesRef);
      if (seriesSnap.exists()) {
        await updateDoc(seriesRef, {
          episodeIds: arrayRemove(episodeId),
          updatedAt: serverTimestamp(),
        });
      }
    }
  } catch (error) {
    handleFirestoreError(error, OperationType.DELETE, path);
  }
}

export async function adminAdjustPlayerCoins(
  player: LeaderboardPlayer,
  newCoins: number,
  newWeeklyCoins: number,
  qualificationThreshold: number
): Promise<void> {
  const clampedCoins = Math.max(0, Math.min(100000000, Math.round(newCoins)));
  const clampedWeekly = Math.max(0, Math.min(100000000, Math.round(newWeeklyCoins)));
  const qualified = clampedWeekly >= qualificationThreshold;
  const delta = clampedCoins - player.coins;
  const path = `leaderboard/${player.uid}`;

  const batch = writeBatch(db);
  batch.update(doc(db, 'leaderboard', player.uid), {
    coins: clampedCoins,
    weeklyCoins: clampedWeekly,
    qualified,
    updatedAt: serverTimestamp(),
  });

  if (delta !== 0) {
    batch.set(doc(db, 'playerPrivate', player.uid, 'transactions', buildTransactionId('a')), {
      uid: player.uid,
      type: 'adjustment',
      category: 'admin-adjustment',
      title: delta > 0 ? 'Admin Coin Credit' : 'Admin Coin Deduction',
      amount: delta,
      balanceAfter: clampedCoins,
      createdAt: serverTimestamp(),
    });
  }

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function resetPlayerCoinsToZero(uid: string): Promise<void> {
  const path = `leaderboard/${uid}`;
  try {
    await updateDoc(doc(db, 'leaderboard', uid), {
      coins: 0,
      weeklyCoins: 0,
      qualified: false,
      updatedAt: serverTimestamp(),
    });
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}

export async function recordPrizeWinAndNotifyEmail(params: {
  uid: string;
  username: string;
  contact?: string;
  prizeType: PrizeWinType;
  amountZar: number;
  coinsAwarded: number;
  voucherCode?: string;
  boxNumber?: number;
  rank?: number;
  weekKey?: string;
  summary: string;
}): Promise<string> {
  const actorUid = auth.currentUser?.uid || params.uid;
  const winId = `pw-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const mailId = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const cleanSummary = params.summary.trim().slice(0, 300);

  const winDoc: Record<string, unknown> = {
    uid: params.uid.slice(0, 128),
    createdByUid: actorUid.slice(0, 128),
    username: params.username.trim().slice(0, 32) || 'Player',
    prizeType: params.prizeType,
    amountZar: Math.max(0, Math.round(params.amountZar)),
    coinsAwarded: Math.max(0, Math.round(params.coinsAwarded)),
    summary: cleanSummary,
    status: 'recorded',
    createdAt: serverTimestamp(),
  };

  if (params.contact) winDoc.contact = params.contact.trim().slice(0, 120);
  if (params.voucherCode) winDoc.voucherCode = params.voucherCode.trim().slice(0, 40);
  if (typeof params.boxNumber === 'number') winDoc.boxNumber = params.boxNumber;
  if (typeof params.rank === 'number') winDoc.rank = params.rank;
  if (params.weekKey) winDoc.weekKey = params.weekKey.trim().slice(0, 16);

  const subject = `[DramaWin Prize Win] ${params.username} — ${cleanSummary}`.slice(0, 200);
  const text = [
    `DramaWin Prize Notification`,
    `Player: ${params.username} (${params.uid})`,
    params.contact ? `Contact: ${params.contact}` : '',
    `Type: ${params.prizeType}`,
    `Amount ZAR: R${Math.max(0, Math.round(params.amountZar))}`,
    `Coins Awarded: ${Math.max(0, Math.round(params.coinsAwarded)).toLocaleString()}`,
    params.voucherCode ? `Voucher Code: ${params.voucherCode}` : '',
    `Summary: ${cleanSummary}`,
  ]
    .filter(Boolean)
    .join('\n');

  const html = `<h2>DramaWin Prize Win Notification</h2>
<p><strong>Player:</strong> ${escapeHtml(params.username)} (${escapeHtml(params.uid)})</p>
${params.contact ? `<p><strong>Contact:</strong> ${escapeHtml(params.contact)}</p>` : ''}
<p><strong>Prize Type:</strong> ${escapeHtml(params.prizeType)}</p>
<p><strong>Amount:</strong> R${Math.max(0, Math.round(params.amountZar))} &middot; <strong>Coins:</strong> ${Math.max(0, Math.round(params.coinsAwarded)).toLocaleString()}</p>
${params.voucherCode ? `<p><strong>Voucher:</strong> <code>${escapeHtml(params.voucherCode)}</code></p>` : ''}
<p><strong>Summary:</strong> ${escapeHtml(cleanSummary)}</p>`;

  const batch = writeBatch(db);
  batch.set(doc(db, 'prize_wins', winId), winDoc);
  batch.set(
    doc(db, 'mail', mailId),
    buildMailPayload({
      uid: actorUid,
      eventType: 'prize_win',
      subject,
      text,
      html,
    })
  );

  try {
    await batch.commit();
  } catch (error) {
    handleFirestoreError(error, OperationType.WRITE, `prize_wins/${winId}`);
  }

  return winId;
}

export async function submitSupportMessageAndNotifyEmail(params: {
  id?: string;
  uid: string;
  username: string;
  contact: string;
  category: SupportCategory;
  subject: string;
  message: string;
}): Promise<string> {
    const actorUid = auth.currentUser?.uid || params.uid?.trim() || `guest_${Date.now()}`;


  const msgId =
    params.id?.trim() || `msg-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const mailId = `mail-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;

  const cleanUsername = (params.username.trim() || 'Player').slice(0, 40);
  const cleanContact = (params.contact.trim() || 'Not provided').slice(0, 120);
  const cleanSubject = (params.subject.trim() || 'Player Support Request').slice(0, 120);
  const rawMsg = params.message.trim().slice(0, 2000);
  const cleanMessage = rawMsg.length >= 2 ? rawMsg : `${rawMsg}.`;
  

  
  await setDoc(doc(db, 'support_messages', msgId), {
    
    uid: actorUid,
    username: cleanUsername.length >= 2 ? cleanUsername : 'Player',
    contact: cleanContact.length >= 2 ? cleanContact : 'N/A',
    category: params.category,
    subject: cleanSubject.length >= 2 ? cleanSubject : 'Support Ticket',
    message: cleanMessage,
    status: 'open',
    createdAt: serverTimestamp(),
    updatedAt: serverTimestamp(),
  });

  const emailSubject = `[DramaWin Support - ${params.category}] ${cleanSubject}`.slice(0, 200);
  const emailText = [
    `New DramaWin Support / Claim Help Message`,
    `Ticket ID: ${msgId}`,
    `Player: ${cleanUsername} (UID: ${actorUid})`,
    `Contact: ${cleanContact}`,
    `Category: ${params.category}`,
    `Subject: ${cleanSubject}`,
    ``,
    cleanMessage,
  ].join('\n');

  const emailHtml = `<h2>New DramaWin Support / Claim Prize Help Ticket</h2>
<p><strong>Ticket ID:</strong> <code>${escapeHtml(msgId)}</code></p>
<p><strong>Player:</strong> ${escapeHtml(cleanUsername)} (${escapeHtml(actorUid)})</p>
<p><strong>Contact:</strong> ${escapeHtml(cleanContact)}</p>
<p><strong>Category:</strong> ${escapeHtml(params.category)}</p>
<p><strong>Subject:</strong> ${escapeHtml(cleanSubject)}</p>`;
  setDoc(
    doc(db, 'mail', mailId),
    buildMailPayload({
      uid: actorUid,
      eventType: 'support_message',
      subject: emailSubject,
      text: emailText,
      html: emailHtml,
    })
  ).catch((err) => console.warn('Mail queue skipped:', err));
  
    

  return msgId;
}

export function subscribeSupportMessages(
  onData: (messages: SupportMessageRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'support_messages';
  return onSnapshot(
    query(collection(db, 'support_messages'), limit(200)),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          source: 'cloud' as const,
          ...(d.data() as Omit<SupportMessageRecord, 'id' | 'source'>),
        }))
        .sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || a.createdAtMs || 0;
          const tB = b.createdAt?.toMillis?.() || b.createdAtMs || 0;
          return tB - tA;
        });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export function subscribePrizeWins(
  onData: (wins: PrizeWinRecord[]) => void,
  onError?: (err: Error) => void
): Unsubscribe {
  const path = 'prize_wins';
  return onSnapshot(
    query(collection(db, 'prize_wins'), limit(200)),
    (snapshot) => {
      const list = snapshot.docs
        .map((d) => ({
          id: d.id,
          ...(d.data() as Omit<PrizeWinRecord, 'id'>),
        }))
        .sort((a, b) => {
          const tA = a.createdAt?.toMillis?.() || a.createdAtMs || 0;
          const tB = b.createdAt?.toMillis?.() || b.createdAtMs || 0;
          return tB - tA;
        });
      onData(list);
    },
    (error) => {
      try {
        handleFirestoreError(error, OperationType.LIST, path);
      } catch (wrapped) {
        if (onError && wrapped instanceof Error) onError(wrapped);
      }
    }
  );
}

export async function updateSupportMessageStatus(
  messageId: string,
  status: SupportStatus,
  adminNote?: string
): Promise<void> {
  const path = `support_messages/${messageId}`;
  const payload: Record<string, unknown> = {
    status,
    updatedAt: serverTimestamp(),
  };
  if (adminNote !== undefined) {
    payload.adminNote = adminNote.trim().slice(0, 500);
  }
  if (status === 'resolved' && auth.currentUser?.email) {
    payload.resolvedBy = auth.currentUser.email.slice(0, 120);
  }
  try {
    await updateDoc(doc(db, 'support_messages', messageId), payload);
  } catch (error) {
    handleFirestoreError(error, OperationType.UPDATE, path);
  }
}
