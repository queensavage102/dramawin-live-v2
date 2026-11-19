import {
  CURATED_DEFAULT_EPISODES,
  DEFAULT_LIVE_TICKER_NAMES,
  DEFAULT_POOL_PRIZE_ZAR,
  DEFAULT_POOL_TARGET_COINS,
  DEFAULT_QUALIFICATION_THRESHOLD,
  DEFAULT_SPONSOR_URL,
  LEGACY_BROKEN_SERIES_NAMES,
  MYSTERY_ENTRY_COST,
  R3_BOOST_ZAR,
  R3_MYSTERY_CYCLE_ADS,
  SAST_OFFSET_MS,
  SEEDED_TOURNAMENT_PLAYERS,
  deduplicateEpisodeList,
  getCurrentWeekKey,
  getEpisodeSeriesId,
  getMondayStartTimestampSAST,
  getTodayDateKey,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  isLegacyOrBareSponsorUrl,
  normalizeEpisodeStartSeconds,
  sanitizeExternalUrl,
  sanitizeMediaUrl,
  toSeriesId,
} from '../constants';
import {
  AppConfig,
  CoinTransaction,
  DramaEpisode,
  LeaderboardPlayer,
  MysteryWinnerRecord,
  PlayerPrivate,
  PrizeWinRecord,
  SupportMessageRecord,
  SupportStatus,
  TransactionCategory,
  WeekDayKey,
} from '../types';
import { BoxOutcome } from '../components/MysteryVaultCard';

const GUEST_PLAYER_KEY = 'dramawin_guest_player_v1';
const GUEST_PRIVATE_KEY = 'dramawin_guest_private_v1';
const GUEST_LEADERBOARD_KEY = 'dramawin_local_leaderboard_v1';
const GUEST_TX_KEY = 'dramawin_local_transactions_v1';
const LOCAL_EPISODES_KEY = 'dramawin_episodes';
const LOCAL_SECTIONS_KEY = 'dramawin_sections_v1';
const LOCAL_CONFIG_KEY = 'dramawin_app_config_v1';
const LOCAL_WINNERS_KEY = 'dramawin_mystery_winners_v1';
const LOCAL_PRIZE_WINS_KEY = 'dramawin_prize_wins_v1';
const LOCAL_SUPPORT_MESSAGES_KEY = 'dramawin_support_messages_v1';
const LOCAL_DELETED_IDS_KEY = 'dramawin_deleted_ids_v1';

export const DEFAULT_LOCAL_APP_CONFIG: AppConfig = {
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
  episodesSeeded: true,
  isPublic: true,
};

function safeReadJson<T>(key: string, fallback: T): T {
  if (typeof window === 'undefined' || !window.localStorage) return fallback;
  try {
    const raw = window.localStorage.getItem(key);
    if (!raw) return fallback;
    return JSON.parse(raw) as T;
  } catch {
    return fallback;
  }
}

function safeWriteJson(key: string, value: unknown): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    window.localStorage.setItem(key, JSON.stringify(value));
  } catch {
    // Ignore storage quota errors
  }
}

export function getOrCreateGuestSession(): {
  player: LeaderboardPlayer;
  privateProfile: PlayerPrivate;
} {
  const currentWeek = getCurrentWeekKey();
  const savedPlayer = safeReadJson<LeaderboardPlayer | null>(GUEST_PLAYER_KEY, null);
  const savedPrivate = safeReadJson<PlayerPrivate | null>(GUEST_PRIVATE_KEY, null);

  if (savedPlayer && savedPrivate && savedPlayer.uid === savedPrivate.uid) {
    // Ensure weekly reset check matches current week and never lock after 11-ad cycle
    const rawBoxes =
      savedPrivate.openedMysteryBoxesDate === getTodayDateKey()
        ? savedPrivate.openedMysteryBoxesToday || []
        : [];
    const normalizedBoxes = rawBoxes.length >= R3_MYSTERY_CYCLE_ADS ? [] : rawBoxes;
    const normalizedPrivate: PlayerPrivate = {
      ...savedPrivate,
      claimedDays:
        savedPrivate.weekKey === currentWeek ? savedPrivate.claimedDays || [] : [],
      weekKey: currentWeek,
      openedMysteryBoxesToday: normalizedBoxes,
      openedMysteryBoxesDate: getTodayDateKey(),
      lastMysteryPickDate: '',
      streakActivityDates: savedPrivate.streakActivityDates || [],
    };
    safeWriteJson(GUEST_PRIVATE_KEY, normalizedPrivate);
    return { player: savedPlayer, privateProfile: normalizedPrivate };
  }

  const suffix = Math.random().toString(36).slice(2, 6).toUpperCase();
  const uid = `guest-${Date.now().toString(36)}-${suffix.toLowerCase()}`;
  const player: LeaderboardPlayer = {
    uid,
    username: `Player_${suffix}`,
    coins: 0,
    weeklyCoins: 0,
    qualified: false,
    streakCount: 0,
    sundayBonusZar: 0,
    isPublic: true,
  };
  const privateProfile: PlayerPrivate = {
    uid,
    contact: 'Instant Play',
    dailyGiftLastClaimed: '',
    weekKey: currentWeek,
    claimedDays: [],
    watchedEpisodeIds: [],
    lastKeepWatchingDate: '',
    lastBannerClaimAt: 0,
    lastActivityDate: '',
    lastMysteryPickDate: '',
    openedMysteryBoxesDate: getTodayDateKey(),
    openedMysteryBoxesToday: [],
    streakActivityDates: [],
  };

  safeWriteJson(GUEST_PLAYER_KEY, player);
  safeWriteJson(GUEST_PRIVATE_KEY, privateProfile);
  upsertLocalLeaderboardPlayer(player);
  return { player, privateProfile };
}

export function mergeLeaderboardWithSeedPlayers(
  basePlayers: LeaderboardPlayer[],
  currentPlayer?: LeaderboardPlayer
): LeaderboardPlayer[] {
  const map = new Map<string, LeaderboardPlayer>();

  // Populate the 15 realistic active tournament players
  SEEDED_TOURNAMENT_PLAYERS.forEach((seed) => {
    map.set(seed.uid, {
      uid: seed.uid,
      username: seed.username,
      avatar: (seed as { avatar?: string }).avatar || seed.username.slice(0, 2).toUpperCase(),
      coins: seed.coins,
      weeklyCoins: seed.weeklyCoins,
      qualified: seed.weeklyCoins >= DEFAULT_QUALIFICATION_THRESHOLD,
      streakCount: seed.streakCount,
      sundayBonusZar: 0,
      isPublic: true,
    });
  });

  // Merge non-seed live/saved players (preserving real user scores)
  basePlayers.forEach((p) => {
    if (!p?.uid || p.uid.startsWith('seed-')) return;
    map.set(p.uid, {
      ...p,
      avatar: p.avatar || p.username.slice(0, 2).toUpperCase(),
      qualified: (p.weeklyCoins || 0) >= DEFAULT_QUALIFICATION_THRESHOLD,
    });
  });

  if (currentPlayer?.uid) {
    map.set(currentPlayer.uid, {
      ...currentPlayer,
      avatar: currentPlayer.avatar || currentPlayer.username.slice(0, 2).toUpperCase(),
      qualified: (currentPlayer.weeklyCoins || 0) >= DEFAULT_QUALIFICATION_THRESHOLD,
    });
  }

  return Array.from(map.values()).sort((a, b) => {
    const weeklyDiff = (b.weeklyCoins || 0) - (a.weeklyCoins || 0);
    if (weeklyDiff !== 0) return weeklyDiff;
    return (b.coins || 0) - (a.coins || 0);
  });
}

export function loadLocalLeaderboard(currentPlayer: LeaderboardPlayer): LeaderboardPlayer[] {
  const list = safeReadJson<LeaderboardPlayer[]>(GUEST_LEADERBOARD_KEY, []);
  const sorted = mergeLeaderboardWithSeedPlayers(list, currentPlayer);
  safeWriteJson(GUEST_LEADERBOARD_KEY, sorted);
  return sorted;
}

export function updateLocalGuestUsername(
  player: LeaderboardPlayer,
  rawUsername: string
): LeaderboardPlayer {
  const cleaned = rawUsername.trim().slice(0, 32);
  if (cleaned.length < 2) {
    throw new Error('Player name must be at least 2 characters.');
  }
  const updated: LeaderboardPlayer = {
    ...player,
    username: cleaned,
  };
  safeWriteJson(GUEST_PLAYER_KEY, updated);
  upsertLocalLeaderboardPlayer(updated);
  return updated;
}

export function resetLocalPlayerCoins(player: LeaderboardPlayer): {
  player: LeaderboardPlayer;
  leaderboard: LeaderboardPlayer[];
} {
  const updated: LeaderboardPlayer = {
    ...player,
    coins: 0,
    weeklyCoins: 0,
    qualified: false,
  };
  safeWriteJson(GUEST_PLAYER_KEY, updated);
  const leaderboard = upsertLocalLeaderboardPlayer(updated);
  return { player: updated, leaderboard };
}

export function upsertLocalLeaderboardPlayer(player: LeaderboardPlayer): LeaderboardPlayer[] {
  const list = safeReadJson<LeaderboardPlayer[]>(GUEST_LEADERBOARD_KEY, []);
  const sorted = mergeLeaderboardWithSeedPlayers(list, player);
  safeWriteJson(GUEST_LEADERBOARD_KEY, sorted);
  return sorted;
}

export function loadLocalTransactions(uid: string): CoinTransaction[] {
  const raw = safeReadJson<CoinTransaction[]>(GUEST_TX_KEY, []);
  return raw
    .filter((tx) => tx.uid === uid)
    .sort((a, b) => (b.createdAtMs || 0) - (a.createdAtMs || 0));
}

export function loadLocalAppConfig(): AppConfig {
  const saved = safeReadJson<Partial<AppConfig> | null>(LOCAL_CONFIG_KEY, null);
  const merged: AppConfig = {
    ...DEFAULT_LOCAL_APP_CONFIG,
    ...(saved || {}),
  };
  if (isLegacyOrBareSponsorUrl(merged.sponsorAdUrl)) {
    merged.sponsorAdUrl = DEFAULT_SPONSOR_URL;
    safeWriteJson(LOCAL_CONFIG_KEY, merged);
  }
  // Migrate legacy 500 coin threshold caches up to 500,000 coins
  if (!merged.qualificationThreshold || merged.qualificationThreshold < DEFAULT_QUALIFICATION_THRESHOLD) {
    merged.qualificationThreshold = DEFAULT_QUALIFICATION_THRESHOLD;
    safeWriteJson(LOCAL_CONFIG_KEY, merged);
  }
  return merged;
}

export function saveLocalAppConfig(next: AppConfig): AppConfig {
  safeWriteJson(LOCAL_CONFIG_KEY, next);
  return next;
}

export function loadLocalMysteryWinners(): MysteryWinnerRecord[] {
  return safeReadJson<MysteryWinnerRecord[]>(LOCAL_WINNERS_KEY, []);
}

export function loadDeletedIds(): string[] {
  const raw = safeReadJson<unknown>(LOCAL_DELETED_IDS_KEY, []);
  if (!Array.isArray(raw)) return [];
  return Array.from(
    new Set(raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0))
  );
}

export function recordDeletedIds(ids: string[]): string[] {
  const cleanNew = ids.map((id) => id.trim()).filter(Boolean);
  const current = loadDeletedIds();
  const next = Array.from(new Set([...current, ...cleanNew]));
  safeWriteJson(LOCAL_DELETED_IDS_KEY, next);
  return next;
}

export function removeDeletedSeriesMarker(seriesNameOrId: string): string[] {
  const targetId = seriesNameOrId.startsWith('series-')
    ? seriesNameOrId
    : toSeriesId(seriesNameOrId);
  const next = loadDeletedIds().filter((id) => id !== targetId);
  safeWriteJson(LOCAL_DELETED_IDS_KEY, next);
  return next;
}

export function isEpisodeDeleted(
  ep: Partial<DramaEpisode>,
  deletedSet = new Set(loadDeletedIds())
): boolean {
  if (ep.id && deletedSet.has(ep.id)) return true;
  const sId = getEpisodeSeriesId(ep);
  if (sId && deletedSet.has(sId)) return true;
  return false;
}

export function loadLocalSections(episodes: DramaEpisode[]): string[] {
  const saved = safeReadJson<string[]>(LOCAL_SECTIONS_KEY, []);
  const deletedSet = new Set(loadDeletedIds());
  const activeEpisodeSeries = new Set(
    episodes
      .filter((ep) => !isLegacyBrokenEpisode(ep) && !isEpisodeDeleted(ep, deletedSet))
      .map((ep) => ep.series?.trim().replace(/\s+/g, ' '))
      .filter((s): s is string => Boolean(s))
  );
  const canonicalMap = new Map<string, string>();
  saved.forEach((s) => {
    const clean = typeof s === 'string' ? s.trim().replace(/\s+/g, ' ') : '';
    if (!clean || clean === 'Rang Ngao (แรงเงา) [ENG SUB]') return;
    if (/gojo|jujutsu|jjk|candy\s*man/i.test(clean)) return;
    if (LEGACY_BROKEN_SERIES_NAMES.includes(clean) && !activeEpisodeSeries.has(clean)) return;
    const sId = toSeriesId(clean);
    if (deletedSet.has(sId) && !activeEpisodeSeries.has(clean)) return;
    if (!canonicalMap.has(sId)) {
      canonicalMap.set(sId, clean);
    }
  });
  activeEpisodeSeries.forEach((clean) => {
    if (/gojo|jujutsu|jjk|candy\s*man/i.test(clean)) return;
    const sId = toSeriesId(clean);
    if (deletedSet.has(sId)) return;
    if (!canonicalMap.has(sId)) {
      canonicalMap.set(sId, clean);
    }
  });
  const result = Array.from(canonicalMap.values());
  safeWriteJson(LOCAL_SECTIONS_KEY, result);
  return result;
}

export function saveLocalSection(sectionName: string): string[] {
  const trimmed = sectionName.trim().slice(0, 60);
  if (!trimmed) return safeReadJson<string[]>(LOCAL_SECTIONS_KEY, []);
  removeDeletedSeriesMarker(trimmed);
  const existing = safeReadJson<string[]>(LOCAL_SECTIONS_KEY, []);
  if (!existing.includes(trimmed)) {
    const next = [...existing, trimmed];
    safeWriteJson(LOCAL_SECTIONS_KEY, next);
    return next;
  }
  return existing;
}

export function renameLocalSection(
  oldName: string,
  newName: string
): { sections: string[]; episodes: DramaEpisode[] } {
  const cleanOld = oldName.trim();
  const cleanNew = newName.trim().slice(0, 60);
  const currentEpisodes = loadLocalEpisodes();
  if (!cleanOld || !cleanNew || cleanOld === cleanNew) {
    return { sections: loadLocalSections(currentEpisodes), episodes: currentEpisodes };
  }

  const oldSeriesId = toSeriesId(cleanOld);
  const newSeriesId = toSeriesId(cleanNew);
  removeDeletedSeriesMarker(cleanNew);
  const existingSections = loadLocalSections(currentEpisodes);
  const mappedSections = Array.from(
    new Set(existingSections.map((s) => (s === cleanOld || toSeriesId(s) === oldSeriesId ? cleanNew : s)))
  );
  safeWriteJson(LOCAL_SECTIONS_KEY, mappedSections);

  const now = Date.now();
  const updatedEpisodes = currentEpisodes.map((ep) =>
    ep.series === cleanOld || getEpisodeSeriesId(ep) === oldSeriesId
      ? {
          ...ep,
          series: cleanNew,
          seriesId: newSeriesId,
          category: inferEpisodeCategory(cleanNew, ep.title, ep.category),
          updatedAtMs: now,
        }
      : ep
  );
  saveLocalEpisodes(updatedEpisodes);

  return { sections: mappedSections, episodes: updatedEpisodes };
}

export function deleteLocalSection(
  sectionName: string,
  removeEpisodes = true
): { sections: string[]; episodes: DramaEpisode[]; deletedIds: string[] } {
  const targetSeriesId = toSeriesId(sectionName);
  const currentEpisodes = loadLocalEpisodes();
  const removedEpisodes = currentEpisodes.filter(
    (ep) => ep.series === sectionName || getEpisodeSeriesId(ep) === targetSeriesId
  );
  const deletedIds = recordDeletedIds([
    targetSeriesId,
    ...(removeEpisodes ? removedEpisodes.map((ep) => ep.id) : []),
  ]);

  const nextEpisodes = removeEpisodes
    ? currentEpisodes.filter(
        (ep) => ep.series !== sectionName && getEpisodeSeriesId(ep) !== targetSeriesId
      )
    : currentEpisodes;
  safeWriteJson(LOCAL_EPISODES_KEY, nextEpisodes);

  const existing = loadLocalSections(nextEpisodes);
  const nextSections = existing.filter(
    (s) => s !== sectionName && toSeriesId(s) !== targetSeriesId
  );
  safeWriteJson(LOCAL_SECTIONS_KEY, nextSections);
  return { sections: nextSections, episodes: nextEpisodes, deletedIds };
}

export function loadLocalEpisodes(): DramaEpisode[] {
  const deletedSet = new Set(loadDeletedIds());
  if (typeof window !== 'undefined' && window.localStorage) {
    const rawStr = window.localStorage.getItem(LOCAL_EPISODES_KEY);
    if (rawStr !== null) {
      try {
        const parsed = JSON.parse(rawStr) as unknown;
        if (Array.isArray(parsed)) {
          const cleaned = deduplicateEpisodeList(parsed as DramaEpisode[]).filter(
            (ep) => !isEpisodeDeleted(ep, deletedSet)
          );
          if (cleaned.length !== parsed.length) {
            safeWriteJson(LOCAL_EPISODES_KEY, cleaned);
          }
          return cleaned;
        }
      } catch {
        // Fall through to empty initial list if corrupted
      }
    }
  }
  safeWriteJson(LOCAL_EPISODES_KEY, CURATED_DEFAULT_EPISODES);
  return CURATED_DEFAULT_EPISODES;
}

export function saveLocalEpisodes(episodes: DramaEpisode[]): DramaEpisode[] {
  const deletedSet = new Set(loadDeletedIds());
  const deduped = deduplicateEpisodeList(episodes).filter(
    (ep) => !isEpisodeDeleted(ep, deletedSet)
  );
  safeWriteJson(LOCAL_EPISODES_KEY, deduped);
  return deduped;
}

export function reorderLocalSeries(orderedSeriesNames: string[]): {
  sections: string[];
  episodes: DramaEpisode[];
} {
  const cleanSections = Array.from(
    new Set(orderedSeriesNames.map((s) => s.trim()).filter(Boolean))
  );
  safeWriteJson(LOCAL_SECTIONS_KEY, cleanSections);

  const currentEpisodes = loadLocalEpisodes();
  const orderMap = new Map<string, number>();
  cleanSections.forEach((name, idx) => orderMap.set(name, idx));

  const reordered = [...currentEpisodes]
    .sort((a, b) => {
      const idxA = orderMap.get(a.series?.trim() || '') ?? 9999;
      const idxB = orderMap.get(b.series?.trim() || '') ?? 9999;
      if (idxA !== idxB) return idxA - idxB;
      return (a.sortOrder || 0) - (b.sortOrder || 0);
    })
    .map((ep, idx) => ({
      ...ep,
      sortOrder: idx + 1,
    }));

  safeWriteJson(LOCAL_EPISODES_KEY, reordered);
  return { sections: cleanSections, episodes: reordered };
}

export function resolveEpisodeCover(ep: {
  coverImage?: string;
  thumbnailUrl?: string;
  youtubeUrl?: string;
  videoUrl?: string;
}): string {
  const rawCover = (ep.thumbnailUrl || ep.coverImage || '').trim();
  const explicitCover = sanitizeMediaUrl(rawCover);
  if (explicitCover) return explicitCover;
  const mediaLink = (ep.videoUrl || ep.youtubeUrl || '').trim();
  const ytThumb = mediaLink ? getYouTubeThumbnailUrl(mediaLink) : null;
  return ytThumb || '';
}

export function addLocalEpisode(input: {
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
}): DramaEpisode[] {
  const current = loadLocalEpisodes();
  const id = input.id?.trim() || `ep-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`;
  const rawVideo = (input.videoUrl || input.youtubeUrl || '').trim();
  const cleanVideo = rawVideo
    ? sanitizeMediaUrl(rawVideo).slice(0, rawVideo.startsWith('data:') ? 2000000 : 500)
    : '';
  const explicitCover = sanitizeMediaUrl(input.thumbnailUrl || input.coverImage || '');
  const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
  const finalCover = explicitCover || autoThumb || '';
  const cleanSeries = input.series.trim().slice(0, 60);
  const cleanTitle = input.title.trim().slice(0, 100);
  const seriesId = toSeriesId(cleanSeries);
  const category = inferEpisodeCategory(cleanSeries, cleanTitle, input.category);

  const created: DramaEpisode = {
    id,
    title: cleanTitle,
    series: cleanSeries,
    seriesId,
    category,
    episodeLabel: input.episodeLabel.trim().slice(0, 24) || 'EP 01',
    duration: input.duration.trim().slice(0, 20) || 'Watch 30s+',
    rewardCoins: Math.max(1, Math.min(5000, Math.round(input.rewardCoins || 100))),
    coverImage: finalCover,
    thumbnailUrl: finalCover,
    synopsis: input.synopsis.trim().slice(0, 240) || `${cleanSeries} episode.`,
    sponsorUrl: input.sponsorUrl.trim() ? sanitizeExternalUrl(input.sponsorUrl).slice(0, 500) : '',
    youtubeUrl: cleanVideo,
    videoUrl: cleanVideo,
    startTime: normalizeEpisodeStartSeconds(input.startTime),
    sortOrder: Math.max(0, Math.round(input.sortOrder || current.length + 1)),
    isPublic: true,
    updatedAtMs: Date.now(),
  };

  saveLocalSection(created.series);
  return saveLocalEpisodes([...current, created]);
}

export function updateLocalEpisode(
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
  }
): DramaEpisode[] {
  const current = loadLocalEpisodes();
  const rawVideo = (input.videoUrl || input.youtubeUrl || '').trim();
  const cleanVideo = rawVideo
    ? sanitizeMediaUrl(rawVideo).slice(0, rawVideo.startsWith('data:') ? 2000000 : 500)
    : '';
  const explicitCover = sanitizeMediaUrl(input.thumbnailUrl || input.coverImage || '');
  const autoThumb = cleanVideo ? getYouTubeThumbnailUrl(cleanVideo) : null;
  const finalCover = explicitCover || autoThumb || '';
  const cleanSeries = input.series.trim().slice(0, 60);
  const cleanTitle = input.title.trim().slice(0, 100);
  const seriesId = toSeriesId(cleanSeries);
  const category = inferEpisodeCategory(cleanSeries, cleanTitle, input.category);

  const next = current.map((ep) => {
    if (ep.id !== episodeId) return ep;
    return {
      ...ep,
      title: cleanTitle,
      series: cleanSeries,
      seriesId,
      category,
      episodeLabel: input.episodeLabel.trim().slice(0, 24) || ep.episodeLabel,
      duration: input.duration.trim().slice(0, 20) || ep.duration,
      rewardCoins: Math.max(1, Math.min(5000, Math.round(input.rewardCoins || ep.rewardCoins))),
      coverImage: finalCover,
      thumbnailUrl: finalCover,
      synopsis: input.synopsis.trim().slice(0, 240) || ep.synopsis,
      sponsorUrl: input.sponsorUrl.trim() ? sanitizeExternalUrl(input.sponsorUrl).slice(0, 500) : '',
      youtubeUrl: cleanVideo,
      videoUrl: cleanVideo,
      startTime: normalizeEpisodeStartSeconds(input.startTime ?? ep.startTime),
      updatedAtMs: Date.now(),
    };
  });

  saveLocalSection(cleanSeries);
  return saveLocalEpisodes(next);
}

export function deleteLocalEpisode(episodeId: string): DramaEpisode[] {
  recordDeletedIds([episodeId]);
  const current = loadLocalEpisodes();
  const next = current.filter((ep) => ep.id !== episodeId);
  safeWriteJson(LOCAL_EPISODES_KEY, next);
  return next;
}

export function applyLocalCoinMutation(params: {
  player: LeaderboardPlayer;
  privateProfile: PlayerPrivate;
  walletDelta: number;
  qualificationThreshold: number;
  privateUpdates?: Partial<PlayerPrivate>;
  nextStreakCount?: number;
  txMeta?: {
    category: TransactionCategory;
    title: string;
  };
  recordStreakActivity?: boolean;
}): {
  player: LeaderboardPlayer;
  privateProfile: PlayerPrivate;
  transactions: CoinTransaction[];
} {
  const {
    player,
    privateProfile,
    walletDelta,
    qualificationThreshold,
    privateUpdates = {},
    nextStreakCount,
    txMeta,
    recordStreakActivity,
  } = params;

  const today = getTodayDateKey();
  const roundedDelta = Math.round(walletDelta);
  const newCoins = Math.max(0, player.coins + roundedDelta);
  const weeklyGain = Math.max(0, roundedDelta);
  const newWeekly = player.weeklyCoins + weeklyGain;
  const qualified = newWeekly >= qualificationThreshold;
  const streakCount =
    typeof nextStreakCount === 'number'
      ? Math.max(0, Math.min(7, nextStreakCount))
      : player.streakCount;

  const updatedPlayer: LeaderboardPlayer = {
    ...player,
    coins: newCoins,
    weeklyCoins: newWeekly,
    qualified,
    streakCount,
  };

  const existingDates = new Set(privateProfile.streakActivityDates || []);
  if (recordStreakActivity) {
    existingDates.add(today);
  }

  const updatedPrivate: PlayerPrivate = {
    ...privateProfile,
    ...privateUpdates,
    lastActivityDate: today,
    streakActivityDates: Array.from(existingDates).slice(-30),
  };

  safeWriteJson(GUEST_PLAYER_KEY, updatedPlayer);
  safeWriteJson(GUEST_PRIVATE_KEY, updatedPrivate);
  upsertLocalLeaderboardPlayer(updatedPlayer);

  const allTx = safeReadJson<CoinTransaction[]>(GUEST_TX_KEY, []);
  if (txMeta) {
    const newTx: CoinTransaction = {
      id: `tx-${Date.now()}-${Math.random().toString(36).slice(2, 7)}`,
      uid: player.uid,
      type: roundedDelta < 0 ? 'spend' : 'earn',
      category: txMeta.category,
      title: txMeta.title,
      amount: roundedDelta,
      balanceAfter: newCoins,
      createdAtMs: Date.now(),
    };
    allTx.unshift(newTx);
    safeWriteJson(GUEST_TX_KEY, allTx.slice(0, 250));
  }

  return {
    player: updatedPlayer,
    privateProfile: updatedPrivate,
    transactions: allTx.filter((t) => t.uid === player.uid),
  };
}

export function claimLocalMysteryBox(params: {
  player: LeaderboardPlayer;
  privateProfile: PlayerPrivate;
  boxNumber: number;
  paidWithCoins: boolean;
  appConfig: AppConfig;
}): {
  outcome: BoxOutcome;
  player: LeaderboardPlayer;
  privateProfile: PlayerPrivate;
  transactions: CoinTransaction[];
  appConfig: AppConfig;
  winnerRecord?: MysteryWinnerRecord;
  newPoolPrizeZar?: number;
} {
  const { player, privateProfile, boxNumber, paidWithCoins, appConfig } = params;
  const todayKey = getTodayDateKey();
  const rawOpened =
    privateProfile.openedMysteryBoxesDate === todayKey
      ? privateProfile.openedMysteryBoxesToday || []
      : [];
  const openedToday = rawOpened.length >= R3_MYSTERY_CYCLE_ADS ? [] : rawOpened;

  if (openedToday.includes(boxNumber)) {
    throw new Error(`You already opened Box #${boxNumber} in this cycle. Try another box!`);
  }
  if (paidWithCoins && player.coins < MYSTERY_ENTRY_COST) {
    throw new Error(`You need at least ${MYSTERY_ENTRY_COST} Coins to unlock.`);
  }

  const targetUsername = (appConfig.r5WinnerUsername || '').trim().toLowerCase();
  const isNamedWinner =
    targetUsername.length > 0 &&
    player.username.trim().toLowerCase() === targetUsername;
  const isR3Winner = Boolean(appConfig.nextPickWinsR5) || isNamedWinner;

  const is11thBoxJackpot = openedToday.length + 1 >= R3_MYSTERY_CYCLE_ADS;
  const isOopsPick = !isR3Winner && !is11thBoxJackpot && openedToday.length > 0 && Math.random() < 0.3;
  const chosen: BoxOutcome = isR3Winner
    ? { boxNumber, kind: 'airtime', coins: 1000 }
    : is11thBoxJackpot
      ? {
          boxNumber,
          kind: 'jackpot',
          coins: 1000,
        }
      : isOopsPick
        ? {
            boxNumber,
            kind: 'oops',
            coins: 0,
          }
        : {
            boxNumber,
            kind: 'coins',
            coins: 100,
          };

  const entryCost = paidWithCoins ? MYSTERY_ENTRY_COST : 0;
  const walletDelta = chosen.coins - entryCost;
  // Automatically reset the Mystery Box grid back to Box 1 right after the 11th video ad is claimed
  const nextOpened = is11thBoxJackpot ? [] : [...openedToday, boxNumber];

  let winnerRecord: MysteryWinnerRecord | undefined;
  let newPoolPrizeZar: number | undefined;
  let nextConfig = appConfig;

  if (chosen.kind === 'airtime') {
    const voucherCode = `DW-R3-${Math.random().toString(36).slice(2, 8).toUpperCase()}`;
    chosen.voucherCode = voucherCode;
    newPoolPrizeZar = (appConfig.poolPrizeZar || DEFAULT_POOL_PRIZE_ZAR) + R3_BOOST_ZAR;
    nextConfig = saveLocalAppConfig({
      ...appConfig,
      poolPrizeZar: newPoolPrizeZar,
      r5WinnerUsername: '',
      nextPickWinsR5: false,
    });
    winnerRecord = {
      id: `win-${Date.now()}-${Math.random().toString(36).slice(2, 6)}`,
      uid: player.uid,
      username: player.username,
      contact: privateProfile.contact,
      voucherCode,
      amountZar: R3_BOOST_ZAR,
      boxNumber,
      createdAtMs: Date.now(),
    };
    const winners = loadLocalMysteryWinners();
    safeWriteJson(LOCAL_WINNERS_KEY, [winnerRecord, ...winners].slice(0, 100));
  }

  const mutation = applyLocalCoinMutation({
    player,
    privateProfile,
    walletDelta,
    qualificationThreshold: appConfig.qualificationThreshold || DEFAULT_QUALIFICATION_THRESHOLD,
    privateUpdates: {
      openedMysteryBoxesDate: todayKey,
      openedMysteryBoxesToday: nextOpened,
      lastMysteryPickDate: '',
    },
    txMeta:
      chosen.kind === 'oops'
        ? undefined
        : {
            category: 'mystery-box',
            title:
              chosen.kind === 'airtime'
                ? `Mystery Box #${boxNumber} — R3 Progress Bar Boost`
                : chosen.kind === 'jackpot'
                  ? `Mystery Box #${boxNumber} — 11th Ad R3 Boost (+1,000 Coins)`
                  : `Mystery Box #${boxNumber} Bonus`,
          },
  });

  return {
    outcome: chosen,
    player: mutation.player,
    privateProfile: mutation.privateProfile,
    transactions: mutation.transactions,
    appConfig: nextConfig,
    winnerRecord,
    newPoolPrizeZar,
  };
}

export function resetLocalMysteryBoxes(privateProfile: PlayerPrivate): PlayerPrivate {
  const updated: PlayerPrivate = {
    ...privateProfile,
    openedMysteryBoxesDate: getTodayDateKey(),
    openedMysteryBoxesToday: [],
    lastMysteryPickDate: '',
  };
  safeWriteJson(GUEST_PRIVATE_KEY, updated);
  return updated;
}

export function loadLocalPrizeWins(): PrizeWinRecord[] {
  return safeReadJson<PrizeWinRecord[]>(LOCAL_PRIZE_WINS_KEY, []);
}

export function addLocalPrizeWin(record: PrizeWinRecord): PrizeWinRecord[] {
  const existing = loadLocalPrizeWins();
  const next = [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 150);
  safeWriteJson(LOCAL_PRIZE_WINS_KEY, next);
  return next;
}

export function loadLocalSupportMessages(): SupportMessageRecord[] {
  return safeReadJson<SupportMessageRecord[]>(LOCAL_SUPPORT_MESSAGES_KEY, []);
}

export function addLocalSupportMessage(record: SupportMessageRecord): SupportMessageRecord[] {
  const existing = loadLocalSupportMessages();
  const next = [record, ...existing.filter((item) => item.id !== record.id)].slice(0, 200);
  safeWriteJson(LOCAL_SUPPORT_MESSAGES_KEY, next);
  return next;
}

export function updateLocalSupportMessageStatus(
  messageId: string,
  status: SupportStatus,
  adminNote?: string
): SupportMessageRecord[] {
  const existing = loadLocalSupportMessages();
  const next = existing.map((item) =>
    item.id === messageId
      ? {
          ...item,
          status,
          adminNote: adminNote !== undefined ? adminNote : item.adminNote,
          updatedAtMs: Date.now(),
        }
      : item
  );
  safeWriteJson(LOCAL_SUPPORT_MESSAGES_KEY, next);
  return next;
}

export function getLast7DaysDateKeysSAST(now = new Date()): {
  dateKey: string;
  weekdayLabel: string;
  shortDate: string;
  isToday: boolean;
}[] {
  const result: {
    dateKey: string;
    weekdayLabel: string;
    shortDate: string;
    isToday: boolean;
  }[] = [];
  const weekdays = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  const months = ['Jan', 'Feb', 'Mar', 'Apr', 'May', 'Jun', 'Jul', 'Aug', 'Sep', 'Oct', 'Nov', 'Dec'];

  for (let offset = 6; offset >= 0; offset--) {
    const d = new Date(now.getTime() - offset * 86400000 + SAST_OFFSET_MS);
    const year = d.getUTCFullYear();
    const monthIdx = d.getUTCMonth();
    const dayNum = d.getUTCDate();
    const dateKey = `${year}-${String(monthIdx + 1).padStart(2, '0')}-${String(dayNum).padStart(2, '0')}`;
    result.push({
      dateKey,
      weekdayLabel: offset === 0 ? 'Today' : weekdays[d.getUTCDay()],
      shortDate: `${months[monthIdx]} ${dayNum}`,
      isToday: offset === 0,
    });
  }
  return result;
}

const MY_LIST_STORAGE_KEY = 'dramawin_my_list_v1';

export function loadMyListSeriesIds(): string[] {
  const raw = safeReadJson<unknown>(MY_LIST_STORAGE_KEY, []);
  if (!Array.isArray(raw)) return [];
  return Array.from(new Set(raw.filter((item): item is string => typeof item === 'string' && item.trim().length > 0)));
}

export function toggleMyListSeriesId(seriesId: string): { list: string[]; added: boolean } {
  const current = loadMyListSeriesIds();
  const exists = current.includes(seriesId);
  const next = exists ? current.filter((id) => id !== seriesId) : [seriesId, ...current];
  safeWriteJson(MY_LIST_STORAGE_KEY, next);
  return { list: next, added: !exists };
}
