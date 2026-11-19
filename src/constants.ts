import { DramaEpisode, StreakDaySpec, WeekDayKey } from './types';

export const BRAND_NAME = 'DRAMA WIN TORNEMENT';
export const DEFAULT_SPONSOR_URL = 'https://directyp.org/4/4edba239bcd7c2593952b6466d0c92ed';

export const ADMIN_PASSCODE = 'Gideon_123';
export const ADMIN_NOTIFICATION_EMAIL = 'gerinaicker04@gmail.com';
export const DEFAULT_POOL_PRIZE_ZAR = 50;
export const DEFAULT_POOL_TARGET_COINS = 500000;
export const DEFAULT_QUALIFICATION_THRESHOLD = 500000;
export const DAILY_GOAL_COINS = 500;
export const DAILY_GIFT_COINS = 50;
export const KEEP_WATCHING_COINS = 100;
export const BANNER_AD_COINS = 25;
export const BANNER_COOLDOWN_MS = 15000;
export const VIDEO_MIN_WATCH_SECONDS = 30;
export const COIN_POT_CYCLE_SECONDS = 60;
export const COIN_POT_BASE_REWARD = 300;
export const COIN_POT_MIN_COINS = 100;
export const COIN_POT_MAX_COINS = 300;
export const DEFAULT_VIDEO_START_SECONDS = 28;
export const MYSTERY_ENTRY_COST = 250;
export const R3_MYSTERY_CYCLE_ADS = 11;
export const R3_BOOST_ZAR = 3;
export const DEFAULT_REAL_AD_SCRIPT = `<script>
  atOptions = {
      'key' : 'c56306a7ff730db6775be12acff0f104',
      
    'format' : 'iframe',
    'height' : 50,
    'width' : 320,
    'params' : {}
  };
</script>
<script src="https://bancadeltempoidea.org/22/c56306a7ff730db6775be12acff0f104"></script>`;
export const DEFAULT_LIVE_TICKER_NAMES = [
  'Thabo M.',
  'Lerato K.',
  'Zinhle N.',
  'Sipho D.',
  'Amina P.',
];

export const SEEDED_TOURNAMENT_PLAYERS = [
  { uid: 'seed-thabo-m', username: 'Thabo M.', coins: 412500, weeklyCoins: 374500, streakCount: 6 },
  { uid: 'seed-lerato-k', username: 'Lerato K.', coins: 356200, weeklyCoins: 318200, streakCount: 5 },
  { uid: 'seed-zinhle-n', username: 'Zinhle N.', coins: 291800, weeklyCoins: 264800, streakCount: 5 },
  { uid: 'seed-sipho-d', username: 'Sipho D.', coins: 248400, weeklyCoins: 215400, streakCount: 4 },
  { uid: 'seed-amina-p', username: 'Amina P.', coins: 194900, weeklyCoins: 168900, streakCount: 4 },
  { uid: 'seed-kabelo-r', username: 'Kabelo R.', coins: 138300, weeklyCoins: 112300, streakCount: 3 },
  { uid: 'seed-naledi-s', username: 'Naledi S.', coins: 84750, weeklyCoins: 68750, streakCount: 2 },
  { uid: 'seed-bongani-t', username: 'Bongani T.', coins: 31600, weeklyCoins: 24600, streakCount: 1 },
];

export const LEGACY_PLACEHOLDER_EPISODE_IDS = [
  'ep-velvet-crown-01',
  'ep-obsidian-heir-04',
  'ep-golden-alibi-02',
  'ep-silent-dynasty-07',
  'rang-ngao-ep-01',
  'rang-ngao-ep-02',
  'rang-ngao-ep-03',
  'rang-ngao-ep-04',
  'rang-ngao-ep-05',
  'rang-ngao-ep-05-09',
  'featured-drama-playlist-01',
  'royal-romance-series-01',
  'jjk-gojo-special-01',
];

export const LEGACY_BROKEN_SERIES_NAMES = [
  'Rang Ngao (แรงเงา) [ENG SUB]',
  'Featured Drama Playlist',
  'Royal Romance Series',
  'Jujutsu Kaisen — Gojo Special',
];

export const DRAMA_CATEGORIES = [
  'Drama',
  'Horror',
  'Anime',
  'Comedy',
  'Romance',
  'Thriller',
  'Action',
  'Sci-Fi',
] as const;

export function toSeriesId(seriesName: string): string {
  const slug = seriesName
    .trim()
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '')
    .slice(0, 68);
  return `series-${slug || 'featured'}`;
}

export function getEpisodeSeriesId(
  ep: Pick<Partial<DramaEpisode>, 'series' | 'seriesId'>
): string {
  const explicit = (ep.seriesId || '').trim();
  if (explicit) return explicit;
  return toSeriesId(ep.series?.trim() || 'Featured Series');
}

export function inferEpisodeCategory(
  series?: string,
  title?: string,
  explicitCategory?: string
): string {
  const cleanExplicit = (explicitCategory || '').trim();
  if (cleanExplicit) return cleanExplicit.slice(0, 32);
  const text = `${series || ''} ${title || ''}`.toLowerCase();
  if (/candy\s*man|horror|ghost|haunt|conjuring|demon|nightmare|terror/.test(text)) {
    return 'Horror';
  }
  if (/anime|jujutsu|gojo|naruto|one piece|bleach|shonen|manga/.test(text)) {
    return 'Anime';
  }
  if (/comedy|funny|sitcom|parody|laugh/.test(text)) {
    return 'Comedy';
  }
  if (/romance|love|wedding|bride|crush|kiss/.test(text)) {
    return 'Romance';
  }
  if (/thriller|mystery|crime|detective|murder|revenge|alibi/.test(text)) {
    return 'Thriller';
  }
  if (/action|fight|assassin|martial|warrior/.test(text)) {
    return 'Action';
  }
  if (/sci-fi|scifi|cyber|space|alien|future/.test(text)) {
    return 'Sci-Fi';
  }
  return 'Drama';
}

export function isStrayGojoOrAnimeInWrongSeries(
  ep: Partial<DramaEpisode> | null | undefined
): boolean {
  if (!ep) return false;
  const seriesText = (ep.series || '').toLowerCase();
  const seriesIsAnimeOrGojo =
    seriesText.includes('jujutsu') ||
    seriesText.includes('gojo') ||
    seriesText.includes('jjk') ||
    seriesText.includes('anime');
  if (seriesIsAnimeOrGojo) return false;

  const titleAndMedia = `${ep.id || ''} ${ep.title || ''} ${ep.coverImage || ''} ${ep.thumbnailUrl || ''} ${ep.youtubeUrl || ''} ${ep.videoUrl || ''}`.toLowerCase();
  return (
    titleAndMedia.includes('gojo') ||
    titleAndMedia.includes('jujutsu') ||
    titleAndMedia.includes('jjk-gojo') ||
    titleAndMedia.includes('satoru') ||
    (seriesText.includes('candy man') && (ep.category || '').trim().toLowerCase() === 'anime')
  );
}

export function isLegacyBrokenEpisode(ep: Partial<DramaEpisode> | null | undefined): boolean {
  if (!ep) return true;
  if (ep.id && LEGACY_PLACEHOLDER_EPISODE_IDS.includes(ep.id)) return true;
  if (isStrayGojoOrAnimeInWrongSeries(ep)) return true;
  const video = (ep.videoUrl || ep.youtubeUrl || '').trim();
  if (video.includes('PLJnfGa7ztjGs')) return true;
  const seriesName = (ep.series || '').trim();
  if (seriesName === 'Rang Ngao (แรงเงา) [ENG SUB]') return true;
  if (
    LEGACY_BROKEN_SERIES_NAMES.includes(seriesName) &&
    (!ep.id || !ep.id.startsWith('ep-') || LEGACY_PLACEHOLDER_EPISODE_IDS.includes(ep.id))
  ) {
    return true;
  }
  return false;
}

export function normalizeEpisodeStartSeconds(value?: unknown): number {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return Math.max(0, Math.min(36000, Math.floor(value)));
  }
  if (typeof value === 'string' && value.trim() !== '') {
    const parsed = Number(value.trim());
    if (Number.isFinite(parsed)) {
      return Math.max(0, Math.min(36000, Math.floor(parsed)));
    }
  }
  return DEFAULT_VIDEO_START_SECONDS;
}

export function getCanonicalVideoKey(rawUrl?: string): string {
  const cleaned = (rawUrl || '').trim();
  if (!cleaned) return '';
  const yt = extractYouTubeMedia(cleaned);
  if (yt.videoId) return `yt:${yt.videoId}`;
  if (yt.playlistId) return `ytpl:${yt.playlistId}`;
  return cleaned.toLowerCase();
}

export function deduplicateEpisodeList(list: DramaEpisode[]): DramaEpisode[] {
  const seenIds = new Set<string>();
  const seenSeriesVideo = new Set<string>();
  const sorted = [...list].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  const result: DramaEpisode[] = [];

  for (const ep of sorted) {
    if (!ep || isLegacyBrokenEpisode(ep)) continue;
    if (ep.id && seenIds.has(ep.id)) continue;

    const seriesId = getEpisodeSeriesId(ep);
    const videoKey = getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl);
    if (videoKey) {
      const sig = `${seriesId}::${videoKey}`;
      if (seenSeriesVideo.has(sig)) continue;
      seenSeriesVideo.add(sig);
    }

    if (ep.id) seenIds.add(ep.id);
    result.push(ep);
  }

  return result;
}

export const STREAK_DAYS: StreakDaySpec[] = [
  { key: 'Mon', label: 'Monday', reward: 100 },
  { key: 'Tue', label: 'Tuesday', reward: 125 },
  { key: 'Wed', label: 'Wednesday', reward: 150 },
  { key: 'Thu', label: 'Thursday', reward: 175 },
  { key: 'Fri', label: 'Friday', reward: 200 },
  { key: 'Sat', label: 'Saturday', reward: 250 },
  { key: 'Sun', label: 'Sunday', reward: 300 },
];

export const COVER_GALLERY = [
  {
    label: 'Penthouse Velvet',
    url: '/src/assets/images/drama_velvet_crown_1794573505264.jpg',
  },
  {
    label: 'Obsidian Skyline',
    url: '/src/assets/images/drama_obsidian_heir_1794573505731.jpg',
  },
  {
    label: 'Candlelit Alibi',
    url: '/src/assets/images/drama_golden_alibi_1794573506492.jpg',
  },
  {
    label: 'Gilded Dynasty',
    url: '/src/assets/images/drama_silent_dynasty_1794573508735.jpg',
  },
];

export const CURATED_DEFAULT_EPISODES: Omit<DramaEpisode, 'createdAt' | 'updatedAt'>[] = [];

const LOCAL_STORAGE_MIGRATION_KEY = 'dramawin_catalog_v10_no_sample_series';

export function forceSaveDefaultEpisodesToLocalStorage(): DramaEpisode[] {
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('dramawin_episodes', JSON.stringify([]));
      window.localStorage.setItem('dramawin_sections_v1', JSON.stringify([]));
      window.localStorage.setItem(LOCAL_STORAGE_MIGRATION_KEY, 'true');
    } catch {
      // Ignore storage quota errors in restricted webviews
    }
  }
  return [];
}

export function getLocalFallbackEpisodes(): DramaEpisode[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [];
  }
  try {
    const raw = window.localStorage.getItem('dramawin_episodes');
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) {
      return (parsed as DramaEpisode[]).filter((ep) => !isLegacyBrokenEpisode(ep));
    }
  } catch {
    // Fall through to empty initial list
  }
  return [];
}

export function syncLocalStorageCatalogMigration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const alreadyMigrated = window.localStorage.getItem(LOCAL_STORAGE_MIGRATION_KEY);

    const rawEpisodes = window.localStorage.getItem('dramawin_episodes');
    let customEpisodes: DramaEpisode[] = [];
    if (rawEpisodes) {
      try {
        const parsed = JSON.parse(rawEpisodes) as unknown;
        if (Array.isArray(parsed)) {
          customEpisodes = (parsed as DramaEpisode[]).filter(
            (ep) => !isLegacyBrokenEpisode(ep)
          );
        }
      } catch {
        customEpisodes = [];
      }
    }

    const sortedEpisodes = customEpisodes.sort(
      (a, b) => (a.sortOrder || 0) - (b.sortOrder || 0)
    );
    window.localStorage.setItem('dramawin_episodes', JSON.stringify(sortedEpisodes));

    const existingSectionsRaw = window.localStorage.getItem('dramawin_sections_v1');
    let existingSections: string[] = [];
    if (existingSectionsRaw) {
      try {
        const parsedSec = JSON.parse(existingSectionsRaw) as unknown;
        if (Array.isArray(parsedSec)) {
          existingSections = parsedSec.filter((s): s is string => typeof s === 'string');
        }
      } catch {
        existingSections = [];
      }
    }

    const activeEpisodeSeries = new Set(
      sortedEpisodes.map((ep) => ep.series?.trim()).filter((s): s is string => Boolean(s))
    );

    const filteredSections = existingSections.filter((s) => {
      const clean = s.trim();
      if (!clean) return false;
      if (clean === 'Rang Ngao (แรงเงา) [ENG SUB]') return false;
      if (LEGACY_BROKEN_SERIES_NAMES.includes(clean) && !activeEpisodeSeries.has(clean)) {
        return false;
      }
      return true;
    });

    const cleanSections = Array.from(
      new Set([
        ...filteredSections,
        ...Array.from(activeEpisodeSeries),
      ])
    );

    window.localStorage.setItem('dramawin_sections_v1', JSON.stringify(cleanSections));
    if (!alreadyMigrated) {
      if (!window.localStorage.getItem('dramawin_sponsor_ad_url')) {
        window.localStorage.setItem('dramawin_sponsor_ad_url', DEFAULT_SPONSOR_URL);
      }
      window.localStorage.setItem(LOCAL_STORAGE_MIGRATION_KEY, 'true');
    }
  } catch {
    // Ignore storage quota errors in restricted webviews
  }
}

export const SAST_OFFSET_MS = 2 * 60 * 60 * 1000;
export const WEEK_MS = 7 * 24 * 60 * 60 * 1000;

export function getMondayStartTimestampSAST(now = new Date()): number {
  const sastMs = now.getTime() + SAST_OFFSET_MS;
  const sastDate = new Date(sastMs);
  const day = sastDate.getUTCDay(); // 0=Sun .. 6=Sat
  const daysSinceMonday = day === 0 ? 6 : day - 1;
  sastDate.setUTCDate(sastDate.getUTCDate() - daysSinceMonday);
  sastDate.setUTCHours(0, 0, 0, 0);
  return sastDate.getTime() - SAST_OFFSET_MS;
}

export function getTodayDateKey(now = new Date()): string {
  const sast = new Date(now.getTime() + SAST_OFFSET_MS);
  const year = sast.getUTCFullYear();
  const month = String(sast.getUTCMonth() + 1).padStart(2, '0');
  const day = String(sast.getUTCDate()).padStart(2, '0');
  return `${year}-${month}-${day}`;
}

export function getTodayWeekdayKey(now = new Date()): WeekDayKey {
  const sast = new Date(now.getTime() + SAST_OFFSET_MS);
  const dayIndex = sast.getUTCDay();
  const map: WeekDayKey[] = ['Sun', 'Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat'];
  return map[dayIndex];
}

export function getCurrentWeekKey(now = new Date()): string {
  const sast = new Date(now.getTime() + SAST_OFFSET_MS);
  const date = new Date(Date.UTC(sast.getUTCFullYear(), sast.getUTCMonth(), sast.getUTCDate()));
  const dayNum = date.getUTCDay() || 7;
  date.setUTCDate(date.getUTCDate() + 4 - dayNum);
  const yearStart = new Date(Date.UTC(date.getUTCFullYear(), 0, 1));
  const weekNo = Math.ceil(((date.getTime() - yearStart.getTime()) / 86400000 + 1) / 7);
  return `${date.getUTCFullYear()}-W${String(weekNo).padStart(2, '0')}`;
}

export interface CountdownParts {
  days: string;
  hours: string;
  minutes: string;
  seconds: string;
}

export function getSundayCountdown(now = new Date()): CountdownParts {
  const weekStartMs = getMondayStartTimestampSAST(now);
  const sundayCutoffMs = weekStartMs + WEEK_MS - 1000;
  const diffMs = Math.max(0, sundayCutoffMs - now.getTime());

  const totalSeconds = Math.floor(diffMs / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  return {
    days: String(days).padStart(2, '0'),
    hours: String(hours).padStart(2, '0'),
    minutes: String(minutes).padStart(2, '0'),
    seconds: String(seconds).padStart(2, '0'),
  };
}

export function isLegacyOrBareSponsorUrl(raw?: string): boolean {
  const trimmed = (raw || '').trim();
  if (!trimmed) return true;
  if (!/^https?:\/\//i.test(trimmed)) return true;
  return trimmed === 'https://directyp.org' || trimmed === 'https://directyp.org/';
}

export function sanitizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed) return DEFAULT_SPONSOR_URL;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

export function sanitizeMediaUrl(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || trimmed === 'none') return '';
  if (
    trimmed.startsWith('https://') ||
    trimmed.startsWith('http://') ||
    trimmed.startsWith('idb://') ||
    trimmed.startsWith('data:') ||
    trimmed.startsWith('blob:') ||
    trimmed.startsWith('/')
  ) {
    return trimmed;
  }
  return `https://${trimmed}`;
}

function safeDecodeUriComponent(value: string): string {
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

function unwrapRedirectUrl(rawUrl: string): string {
  let current = rawUrl.trim();
  for (let hop = 0; hop < 3; hop += 1) {
    try {
      const normalized =
        /^https?:\/\//i.test(current)
          ? current
          : current.startsWith('//')
            ? `https:${current}`
            : `https://${current}`;
      const parsed = new URL(normalized);
      const redirectParam =
        parsed.searchParams.get('q') ||
        parsed.searchParams.get('u') ||
        parsed.searchParams.get('url') ||
        parsed.searchParams.get('dest') ||
        parsed.searchParams.get('redirect') ||
        parsed.searchParams.get('next') ||
        parsed.searchParams.get('link');
      if (redirectParam) {
        const decoded = safeDecodeUriComponent(redirectParam).trim();
        if (decoded.startsWith('/')) {
          current = `https://www.youtube.com${decoded}`;
          continue;
        }
        if (/^(https?:)?\/\//i.test(decoded) || /youtu\.be|youtube/i.test(decoded)) {
          current = decoded;
          continue;
        }
      }
    } catch {
      break;
    }
    break;
  }
  return current;
}

function normalizeYouTubeInput(rawInput: string): string {
  const trimmed = rawInput.trim();
  if (!trimmed) return '';
  // Extract src="..." if someone pasted an <iframe> embed snippet
  const iframeSrcMatch = trimmed.match(/<iframe[^>]*\ssrc=["']([^"']+)["']/i);
  if (iframeSrcMatch?.[1]) {
    return unwrapRedirectUrl(iframeSrcMatch[1].trim());
  }
  // Extract first http(s) URL if surrounded by stray text
  const urlMatch = trimmed.match(/https?:\/\/[^\s"'<>]+/i);
  if (urlMatch?.[0]) {
    return unwrapRedirectUrl(urlMatch[0].trim());
  }
  return unwrapRedirectUrl(trimmed);
}

function extract11CharVideoIdRegexFallback(input: string): string | null {
  const candidates = [input, safeDecodeUriComponent(input)];
  const patterns = [
    /(?:youtu\.be\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i,
    /(?:youtube(?:-nocookie)?\.com\/(?:shorts|live|embed|v|e|watch)\/)([a-zA-Z0-9_-]{11})(?:[?&#/]|$)/i,
    /[?&](?:v|vi)=([a-zA-Z0-9_-]{11})(?:[&#]|$)/i,
  ];
  for (const candidate of candidates) {
    for (const regex of patterns) {
      const match = candidate.match(regex);
      if (match?.[1] && /^[a-zA-Z0-9_-]{11}$/.test(match[1])) {
        return match[1];
      }
    }
  }
  return null;
}

export interface YouTubeMediaInfo {
  videoId: string | null;
  playlistId: string | null;
  isYouTubeDomainWithoutMedia: boolean;
  embedUrl: string | null;
  previewEmbedUrl: string | null;
  watchUrl: string | null;
  thumbnailUrl: string | null;
}

export function extractYouTubeMedia(rawUrl: string): YouTubeMediaInfo {
  const empty: YouTubeMediaInfo = {
    videoId: null,
    playlistId: null,
    isYouTubeDomainWithoutMedia: false,
    embedUrl: null,
    previewEmbedUrl: null,
    watchUrl: null,
    thumbnailUrl: null,
  };
  const trimmed = normalizeYouTubeInput(rawUrl);
  if (!trimmed) return empty;

  // Allow pasting a raw YouTube Playlist ID directly (e.g. PL...)
  if (/^(PL|UU|LL|OL|RD|FL)[a-zA-Z0-9_-]{4,120}$/.test(trimmed)) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(trimmed)}&autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    const previewEmbedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(trimmed)}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    return {
      videoId: null,
      playlistId: trimmed,
      isYouTubeDomainWithoutMedia: false,
      embedUrl,
      previewEmbedUrl,
      watchUrl: `https://www.youtube.com/playlist?list=${encodeURIComponent(trimmed)}`,
      thumbnailUrl: null,
    };
  }

  // Allow pasting a bare 11-char YouTube Video ID directly
  if (/^[a-zA-Z0-9_-]{11}$/.test(trimmed)) {
    const embedUrl = `https://www.youtube-nocookie.com/embed/${trimmed}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    const previewEmbedUrl = `https://www.youtube-nocookie.com/embed/${trimmed}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
    return {
      videoId: trimmed,
      playlistId: null,
      isYouTubeDomainWithoutMedia: false,
      embedUrl,
      previewEmbedUrl,
      watchUrl: `https://www.youtube.com/watch?v=${trimmed}`,
      thumbnailUrl: `https://i.ytimg.com/vi/${trimmed}/hqdefault.jpg`,
    };
  }

  // Try regex extraction first on the unwrapped input (catches any non-standard redirect formats too)
  let videoId: string | null = extract11CharVideoIdRegexFallback(trimmed);
  let playlistId: string | null = null;

  try {
    const normalized =
      /^https?:\/\//i.test(trimmed)
        ? trimmed
        : trimmed.startsWith('//')
          ? `https:${trimmed}`
          : `https://${trimmed}`;
    const url = new URL(normalized);
    const host = url.hostname.replace(/^(www|m|music)\./i, '').toLowerCase();

    const isYouTubeHost =
      host === 'youtu.be' ||
      host === 'youtube.com' ||
      host.endsWith('.youtube.com') ||
      host === 'youtube-nocookie.com';

    if (!isYouTubeHost && !videoId) {
      return empty;
    }

    const rawList = url.searchParams.get('list');
    if (rawList && /^[a-zA-Z0-9_-]{2,120}$/.test(rawList)) {
      playlistId = rawList;
    }

    if (!videoId) {
      if (host === 'youtu.be') {
        const id = url.pathname.split('/').filter(Boolean)[0];
        if (id && /^[a-zA-Z0-9_-]{11}$/.test(id)) {
          videoId = id;
        }
      } else {
        const vParam = url.searchParams.get('v') || url.searchParams.get('vi');
        if (vParam && /^[a-zA-Z0-9_-]{11}$/.test(vParam)) {
          videoId = vParam;
        } else {
          const parts = url.pathname.split('/').filter(Boolean);
          if (
            parts.length >= 2 &&
            ['shorts', 'embed', 'live', 'v', 'e', 'watch'].includes(parts[0].toLowerCase()) &&
            parts[1].toLowerCase() !== 'videoseries' &&
            /^[a-zA-Z0-9_-]{11}$/.test(parts[1])
          ) {
            videoId = parts[1];
          }
        }
      }
    }

    let embedUrl: string | null = null;
    let previewEmbedUrl: string | null = null;
    let watchUrl: string | null = null;

    if (videoId) {
      // Convert directly into valid youtube-nocookie.com/embed/{VIDEO_ID}
      embedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      previewEmbedUrl = `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      watchUrl = `https://www.youtube.com/watch?v=${videoId}`;
    } else if (playlistId) {
      embedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      previewEmbedUrl = `https://www.youtube-nocookie.com/embed/videoseries?list=${encodeURIComponent(playlistId)}&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`;
      watchUrl = `https://www.youtube.com/playlist?list=${encodeURIComponent(playlistId)}`;
    }

    const thumbnailUrl = videoId
      ? `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`
      : null;

    return {
      videoId,
      playlistId,
      isYouTubeDomainWithoutMedia: isYouTubeHost && !videoId && !playlistId,
      embedUrl,
      previewEmbedUrl,
      watchUrl,
      thumbnailUrl,
    };
  } catch {
    if (videoId) {
      return {
        videoId,
        playlistId: null,
        isYouTubeDomainWithoutMedia: false,
        embedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?autoplay=1&rel=0&modestbranding=1&playsinline=1&enablejsapi=1`,
        previewEmbedUrl: `https://www.youtube-nocookie.com/embed/${videoId}?rel=0&modestbranding=1&playsinline=1&enablejsapi=1`,
        watchUrl: `https://www.youtube.com/watch?v=${videoId}`,
        thumbnailUrl: `https://i.ytimg.com/vi/${videoId}/hqdefault.jpg`,
      };
    }
    return empty;
  }
}

export function extractYouTubeId(rawUrl: string): string | null {
  return extractYouTubeMedia(rawUrl).videoId;
}

export function extractYouTubePlaylistId(rawUrl: string): string | null {
  return extractYouTubeMedia(rawUrl).playlistId;
}

export function isYouTubeDomainOnly(rawUrl: string): boolean {
  return extractYouTubeMedia(rawUrl).isYouTubeDomainWithoutMedia;
}

export function getYouTubeThumbnailUrl(rawUrl: string): string | null {
  return extractYouTubeMedia(rawUrl).thumbnailUrl;
}


export function getYouTubeEmbedUrl(
  rawUrl: string,
  startSeconds?: number,
  muted = false
): string | null {
  const rawEmbed = extractYouTubeMedia(rawUrl).embedUrl;
  if (!rawEmbed) return null;

  let finalUrl = rawEmbed.replace(
    'https://www.youtube-nocookie.com',
    'https://www.youtube.com'
  );

  const appendParam = (url: string, key: string, value: string) => {
    if (new RegExp(`[?&]${key}=`).test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${key}=${value}`;
  };

  finalUrl = appendParam(finalUrl, 'playsinline', '1');
  finalUrl = appendParam(finalUrl, 'enablejsapi', '1');
  finalUrl = appendParam(finalUrl, 'mute', muted ? '1' : '0');

  if (typeof window !== 'undefined' && window.location?.origin) {
    finalUrl = appendParam(finalUrl, 'origin', encodeURIComponent(window.location.origin));
  }

  if (typeof startSeconds === 'number' && Number.isFinite(startSeconds) && startSeconds > 0) {
    finalUrl = appendParam(finalUrl, 'start', String(Math.floor(startSeconds)));
  }

  return finalUrl;
}

export function getYouTubePreviewEmbedUrl(rawUrl: string): string | null {
  return extractYouTubeMedia(rawUrl).previewEmbedUrl;
}

export function getYouTubeWatchUrl(rawUrl: string): string | null {
  return extractYouTubeMedia(rawUrl).watchUrl;
}



