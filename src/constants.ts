import { DramaEpisode, StreakDaySpec, WeekDayKey } from './types';

export const BRAND_NAME = 'DRAMA WIN TORNEMENT';
export const MONETAG_LINK = '[MONETAG_LINK]';
export const DEFAULT_SPONSOR_URL = MONETAG_LINK;

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
export const MYSTERY_CYCLE_BOXES = 11;
export const R3_MYSTERY_CYCLE_ADS = MYSTERY_CYCLE_BOXES;
export const R3_BOOST_ZAR = 0;
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

  const titleAndMedia = `${ep.id || ''} ${ep.title || ''} ${ep.posterUrl || ''} ${ep.coverImage || ''} ${ep.thumbnailUrl || ''} ${ep.youtubeUrl || ''} ${ep.videoUrl || ''}`.toLowerCase();
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

export const CURATED_DEFAULT_EPISODES: Omit<DramaEpisode, 'createdAt' | 'updatedAt'>[] = [
  {
    id: 'ep-jujutsu-kaisen-abridged-0',
    title: 'Jujutsu Kaisen Abridged 0: THE MOVIE',
    series: 'Jujutsu Kaisen Abridged 0: THE MOVIE',
    seriesId: 'series-jujutsu-kaisen-abridged-0-the-movie',
    category: 'Anime / Comedy',
    episodeLabel: 'Full Movie',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      "A hilarious fan-parody retelling of Yuta Okkotsu's arrival at Jujutsu Tech, his powerful curse Rika, and their showdown against Suguru Geto.",
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 1,
    isPublic: true,
  },
  {
    id: 'ep-dark-moon-blood-altar-01',
    title: 'DARK MOON: THE BLOOD ALTAR (Episode 1)',
    series: 'DARK MOON: THE BLOOD ALTAR',
    seriesId: 'series-dark-moon-the-blood-altar',
    category: 'Anime / Vampire Romance',
    episodeLabel: 'EP 01',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      'At Decelis Academy in Riverfield, seven mysterious vampire boys hide their dark pasts until Sooha—a girl who despises vampires—transfers in and changes everything.',
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 2,
    isPublic: true,
  },
  {
    id: 'ep-two-girls-disguised-as-boys-01',
    title: 'Two Girls Disguised as Boys… Then Fell for Their Handsome Dormmates!',
    series: 'Two Girls Disguised as Boys',
    seriesId: 'series-two-girls-disguised-as-boys',
    category: 'Romance / Comedy',
    episodeLabel: 'Full Drama',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      'Two best friends are transported into a novel and wake up inside an all-boys academy, forced to disguise themselves as male students while sharing a dorm with two handsome leads.',
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 3,
    isPublic: true,
  },
  {
    id: 'ep-he-chose-ugliest-bride-01',
    title: 'He Chose the Ugliest Bride… Then Fell Madly in Love!',
    series: 'He Chose the Ugliest Bride… Then Fell Madly in Love!',
    seriesId: 'series-he-chose-the-ugliest-bride-then-fell-madly-in-love',
    category: 'Billionaire Romance / Revenge',
    episodeLabel: 'Full Drama',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      "Sabotaged by her stepsister to look unattractive at a billionaire's bride selection, Ivy shocks everyone when billionaire heir Sebastian Hail chooses her anyway.",
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 4,
    isPublic: true,
  },
  {
    id: 'ep-my-bride-is-a-man-01',
    title: 'My Bride Is A Man',
    series: 'My Bride Is A Man',
    seriesId: 'series-my-bride-is-a-man',
    category: 'Dark Romance / Drama',
    episodeLabel: 'Full Drama',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      "To save his family from ruin after an accident, Elias Voss steps into a wedding dress to take his sister's place at the altar—marrying ruthless heir Orion Gray.",
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 5,
    isPublic: true,
  },
  {
    id: 'ep-love-fantasy-romance-comedy-kdrama-01',
    title: 'Love, Fantasy & Romance Comedy (Korean Drama)',
    series: 'Love, Fantasy & Romance Comedy (Korean Drama)',
    seriesId: 'series-love-fantasy-romance-comedy-korean-drama',
    category: 'K-Drama / Fantasy Romance',
    episodeLabel: 'Full Drama',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      'A narcissistic god seeking his rightful throne comes to Earth in search of a powerful stone and enlists a skeptical psychiatrist destined to become his wife.',
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 6,
    isPublic: true,
  },
  {
    id: 'ep-dumped-gold-digging-ex-billionaire-01',
    title: 'Dumped by Her Gold-Digging Ex, She Married a Stranger—Unaware He Was a Billionaire Heir!',
    series: 'Dumped by Her Gold-Digging Ex, Married a Billionaire',
    seriesId: 'series-dumped-by-her-gold-digging-ex-married-a-billionaire',
    category: 'Billionaire Romance / Revenge',
    episodeLabel: 'Full Drama',
    duration: 'Watch & Earn',
    rewardCoins: 100,
    coverImage: 'https://ytimg.com',
    thumbnailUrl: 'https://ytimg.com',
    synopsis:
      'After dumping her freeloading fiancé, forensic investigator Natalie marries a mysterious stranger on her wedding day—unaware he is secretly a powerful billionaire heir.',
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: 'https://youtube.com',
    videoUrl: 'https://youtube.com',
    startTime: DEFAULT_VIDEO_START_SECONDS,
    sortOrder: 7,
    isPublic: true,
  },
];

const LOCAL_STORAGE_MIGRATION_KEY = 'dramawin_catalog_v12_curated_7_dramas';

function isPlaceholderCatalogUrl(value?: string): boolean {
  const clean = (value || '').trim();
  if (!clean || clean === 'none' || clean === 'about:blank') return true;
  if (clean.startsWith('/src/assets/')) return true;
  return /placeholder|example\.com|sample/i.test(clean);
}

export function forceSaveDefaultEpisodesToLocalStorage(): DramaEpisode[] {
  const defaultSections = Array.from(
    new Set(CURATED_DEFAULT_EPISODES.map((ep) => ep.series.trim()).filter(Boolean))
  );
  if (typeof window !== 'undefined' && window.localStorage) {
    try {
      window.localStorage.setItem('dramawin_episodes', JSON.stringify(CURATED_DEFAULT_EPISODES));
      window.localStorage.setItem('dramawin_sections_v1', JSON.stringify(defaultSections));
      window.localStorage.setItem(LOCAL_STORAGE_MIGRATION_KEY, 'true');
    } catch {
      // Ignore storage quota errors in restricted webviews
    }
  }
  return [...CURATED_DEFAULT_EPISODES];
}

export function getLocalFallbackEpisodes(): DramaEpisode[] {
  if (typeof window === 'undefined' || !window.localStorage) {
    return [...CURATED_DEFAULT_EPISODES];
  }
  try {
    const raw = window.localStorage.getItem('dramawin_episodes');
    const parsed = raw ? (JSON.parse(raw) as unknown) : null;
    if (Array.isArray(parsed)) {
      return (parsed as DramaEpisode[]).filter((ep) => !isLegacyBrokenEpisode(ep));
    }
  } catch {
    // Fall through to curated list
  }
  return [...CURATED_DEFAULT_EPISODES];
}

export function syncLocalStorageCatalogMigration(): void {
  if (typeof window === 'undefined' || !window.localStorage) return;
  try {
    const alreadyMigrated = window.localStorage.getItem(LOCAL_STORAGE_MIGRATION_KEY);

    let deletedSet = new Set<string>();
    try {
      const rawDeleted = window.localStorage.getItem('dramawin_deleted_ids_v1');
      const parsedDeleted = rawDeleted ? (JSON.parse(rawDeleted) as unknown) : [];
      if (Array.isArray(parsedDeleted)) {
        deletedSet = new Set(
          parsedDeleted.filter((id): id is string => typeof id === 'string' && id.trim().length > 0)
        );
      }
    } catch {
      deletedSet = new Set<string>();
    }

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

    if (!alreadyMigrated) {
      const curatedById = new Map(CURATED_DEFAULT_EPISODES.map((ep) => [ep.id, ep]));
      const curatedByTitle = new Map(
        CURATED_DEFAULT_EPISODES.map((ep) => [ep.title.trim().toLowerCase(), ep])
      );

      customEpisodes = customEpisodes.map((ep) => {
        const seedMatch =
          curatedById.get(ep.id) || curatedByTitle.get((ep.title || '').trim().toLowerCase());
        if (!seedMatch) return ep;
        const currentVid = (ep.videoUrl || ep.youtubeUrl || '').trim();
        const currentThumb = (ep.thumbnailUrl || ep.coverImage || '').trim();
        return {
          ...ep,
          category: ep.category?.trim() || seedMatch.category,
          synopsis: ep.synopsis?.trim() || seedMatch.synopsis,
          youtubeUrl: isPlaceholderCatalogUrl(currentVid) ? seedMatch.youtubeUrl : ep.youtubeUrl,
          videoUrl: isPlaceholderCatalogUrl(currentVid) ? seedMatch.videoUrl : ep.videoUrl,
          coverImage: isPlaceholderCatalogUrl(currentThumb) ? seedMatch.coverImage : ep.coverImage,
          thumbnailUrl: isPlaceholderCatalogUrl(currentThumb)
            ? seedMatch.thumbnailUrl
            : ep.thumbnailUrl,
        };
      });

      const existingIds = new Set(customEpisodes.map((ep) => ep.id));
      const existingTitles = new Set(
        customEpisodes.map((ep) => (ep.title || '').trim().toLowerCase()).filter(Boolean)
      );
      for (const seedEp of CURATED_DEFAULT_EPISODES) {
        const sId = getEpisodeSeriesId(seedEp);
        if (
          existingIds.has(seedEp.id) ||
          existingTitles.has(seedEp.title.trim().toLowerCase()) ||
          deletedSet.has(seedEp.id) ||
          deletedSet.has(sId)
        ) {
          continue;
        }
        customEpisodes.push({ ...seedEp });
        existingIds.add(seedEp.id);
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
    const savedSponsorUrl = window.localStorage.getItem('dramawin_sponsor_ad_url');
    if (!savedSponsorUrl || isLegacyOrBareSponsorUrl(savedSponsorUrl)) {
      window.localStorage.setItem('dramawin_sponsor_ad_url', DEFAULT_SPONSOR_URL);
    }
    if (!alreadyMigrated) {
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
  if (!trimmed || trimmed === '#') return true;
  if (trimmed === MONETAG_LINK) return false;
  if (!/^https?:\/\//i.test(trimmed)) return true;
  return /^https?:\/\/([^/]+\.)?directyp\.org(\/|$)/i.test(trimmed);
}

export function resolveSponsorLink(raw?: string): string {
  const trimmed = (raw || '').trim();
  if (!trimmed || isLegacyOrBareSponsorUrl(trimmed)) return MONETAG_LINK;
  return trimmed;
}

export function sanitizeExternalUrl(raw: string): string {
  const trimmed = raw.trim();
  if (!trimmed || trimmed === '#' || trimmed === MONETAG_LINK) return MONETAG_LINK;
  if (trimmed.startsWith('https://') || trimmed.startsWith('http://')) {
    return isLegacyOrBareSponsorUrl(trimmed) ? MONETAG_LINK : trimmed;
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

export function isPlaceholderStockOrNonImageUrl(raw?: string): boolean {
  const clean = sanitizeMediaUrl(raw);
  if (!clean || clean === 'none' || clean === 'about:blank') return true;
  if (clean.startsWith('/src/assets/')) return true;
  if (/picsum\.photos|unsplash\.com|images\.unsplash\.com|source\.unsplash\.com/i.test(clean)) {
    return true;
  }
  if (/placeholder|example\.com/i.test(clean)) return true;
  if (
    clean.startsWith('data:image/') ||
    clean.startsWith('blob:') ||
    clean.startsWith('idb://') ||
    clean.startsWith('/')
  ) {
    return false;
  }
  try {
    const parsed = new URL(clean);
    const host = parsed.hostname.toLowerCase();
    const path = parsed.pathname.toLowerCase();
    if (
      (host === 'ytimg.com' ||
        host === 'www.ytimg.com' ||
        host === 'i.ytimg.com' ||
        host === 'img.youtube.com' ||
        host === 'youtube.com' ||
        host === 'www.youtube.com' ||
        host === 'youtu.be') &&
      !path.includes('/vi/') &&
      !/\.(jpe?g|png|webp|avif|gif)$/i.test(path)
    ) {
      return true;
    }
  } catch {
    return true;
  }
  return false;
}

export function sanitizePosterUrl(raw?: string): string {
  const clean = sanitizeMediaUrl(raw);
  if (!clean || isPlaceholderStockOrNonImageUrl(clean)) return '';
  return clean;
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
      thumbnailUrl: `https://img.youtube.com/vi/${trimmed}/maxresdefault.jpg`,
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
      ? `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`
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
        thumbnailUrl: `https://img.youtube.com/vi/${videoId}/maxresdefault.jpg`,
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

export function getYouTubeFallbackThumbnailUrl(rawUrl?: string): string | null {
  const clean = (rawUrl || '').trim();
  if (!clean) return null;
  const imgMatch = clean.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
  const videoId = imgMatch?.[1] || extractYouTubeId(clean);
  return videoId ? `https://img.youtube.com/vi/${videoId}/hqdefault.jpg` : null;
}

export async function resolveYouTubeAutoPosterUrl(rawUrl: string): Promise<string | null> {
  const trimmed = rawUrl.trim();
  if (!trimmed) return null;
  const media = extractYouTubeMedia(trimmed);
  if (media.videoId) {
    return `https://img.youtube.com/vi/${media.videoId}/maxresdefault.jpg`;
  }
  const targetUrl = media.watchUrl || (media.playlistId ? `https://www.youtube.com/playlist?list=${encodeURIComponent(media.playlistId)}` : trimmed);
  if (!/youtube\.com|youtu\.be|youtube-nocookie\.com/i.test(targetUrl) || isYouTubeDomainOnly(trimmed)) {
    return null;
  }

  try {
    const resp = await fetch(`/api/youtube-thumbnail?url=${encodeURIComponent(targetUrl)}`, {
      signal: AbortSignal.timeout(5000),
    });
    if (resp.ok) {
      const data = (await resp.json()) as { videoId?: string | null; posterUrl?: string | null; fallbackUrl?: string | null };
      if (data.videoId && /^[a-zA-Z0-9_-]{11}$/.test(data.videoId)) {
        return `https://img.youtube.com/vi/${data.videoId}/maxresdefault.jpg`;
      }
      const resolved = sanitizePosterUrl(data.posterUrl || data.fallbackUrl || '');
      if (resolved) return resolved;
    }
  } catch {
    // Fallback to noembed if backend route is unavailable (e.g. static preview)
  }

  try {
    const noembedResp = await fetch(
      `https://noembed.com/embed?url=${encodeURIComponent(targetUrl)}`,
      { signal: AbortSignal.timeout(5000) }
    );
    if (noembedResp.ok) {
      const data = (await noembedResp.json()) as { thumbnail_url?: string };
      const thumb = (data.thumbnail_url || '').trim();
      const idMatch = thumb.match(/\/vi\/([a-zA-Z0-9_-]{11})\//);
      if (idMatch?.[1]) {
        return `https://img.youtube.com/vi/${idMatch[1]}/maxresdefault.jpg`;
      }
      const cleanThumb = sanitizePosterUrl(thumb);
      if (cleanThumb) return cleanThumb;
    }
  } catch {
    // Ignore network errors
  }

  return null;
}


export function getYouTubeEmbedUrl(
  rawUrl: string,
  startSeconds?: number,
  muted = false
): string | null {
  const rawEmbed = extractYouTubeMedia(rawUrl).embedUrl;
  if (!rawEmbed) return null;

  let finalUrl = rawEmbed.replace(
    'https://www.youtube.com/embed/',
    'https://www.youtube-nocookie.com/embed/'
  );

  const appendParam = (url: string, key: string, value: string) => {
    if (new RegExp(`[?&]${key}=`).test(url)) return url;
    const sep = url.includes('?') ? '&' : '?';
    return `${url}${sep}${key}=${value}`;
  };

  finalUrl = appendParam(finalUrl, 'playsinline', '1');
  finalUrl = appendParam(finalUrl, 'rel', '0');
  finalUrl = appendParam(finalUrl, 'modestbranding', '1');
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

export function extractDailymotionVideoId(rawUrl: string): string | null {
  const unwrapped = normalizeYouTubeInput(rawUrl);
  if (!unwrapped) return null;

  const regexPatterns = [
    /(?:dai\.ly\/)([a-zA-Z0-9]+)(?:[?#&_/]|$)/i,
    /(?:dailymotion\.com\/(?:embed\/)?video\/)([a-zA-Z0-9]+)(?:[_?#&/]|$)/i,
    /(?:geo\.dailymotion\.com\/player\.html[^#]*[?&]video=)([a-zA-Z0-9]+)(?:[&#]|$)/i,
  ];

  for (const regex of regexPatterns) {
    const match = unwrapped.match(regex);
    if (match?.[1] && /^[a-zA-Z0-9]{4,24}$/.test(match[1])) {
      return match[1];
    }
  }

  try {
    const normalized =
      /^https?:\/\//i.test(unwrapped)
        ? unwrapped
        : unwrapped.startsWith('//')
          ? `https:${unwrapped}`
          : `https://${unwrapped}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.replace(/^(www|m|touch)\./i, '').toLowerCase();

    if (host === 'dai.ly') {
      const firstSeg = parsed.pathname.split('/').filter(Boolean)[0] || '';
      const cleanId = firstSeg.split('_')[0];
      return cleanId && /^[a-zA-Z0-9]{4,24}$/.test(cleanId) ? cleanId : null;
    }

    if (host === 'dailymotion.com' || host.endsWith('.dailymotion.com')) {
      const videoParam = parsed.searchParams.get('video');
      if (videoParam && /^[a-zA-Z0-9]{4,24}$/.test(videoParam)) {
        return videoParam;
      }
      const hashMatch = parsed.hash.match(/video=([a-zA-Z0-9]{4,24})/i);
      if (hashMatch?.[1]) {
        return hashMatch[1];
      }
      const parts = parsed.pathname.split('/').filter(Boolean);
      const videoIdx = parts.findIndex((p) => p.toLowerCase() === 'video');
      if (videoIdx !== -1 && parts[videoIdx + 1]) {
        const cleanId = parts[videoIdx + 1].split('_')[0];
        if (/^[a-zA-Z0-9]{4,24}$/.test(cleanId)) {
          return cleanId;
        }
      }
    }
  } catch {
    // Regex fallback already attempted above
  }

  return null;
}

export function getDailymotionEmbedUrl(
  rawUrl: string,
  options?: { autoplay?: boolean; muted?: boolean; startSeconds?: number }
): string | null {
  const videoId = extractDailymotionVideoId(rawUrl);
  if (!videoId) return null;

  const params = new URLSearchParams();
  params.set('autoplay', options?.autoplay === false ? '0' : '1');
  params.set('mute', options?.muted ? '1' : '0');
  params.set('api', 'postMessage');
  if (
    typeof options?.startSeconds === 'number' &&
    Number.isFinite(options.startSeconds) &&
    options.startSeconds > 0
  ) {
    params.set('start', String(Math.floor(options.startSeconds)));
  }

  return `https://www.dailymotion.com/embed/video/${videoId}?${params.toString()}`;
}

export function getBunnyEmbedUrl(rawUrl: string): string | null {
  const unwrapped = normalizeYouTubeInput(rawUrl);
  if (!unwrapped) return null;
  try {
    const normalized = /^https?:\/\//i.test(unwrapped) ? unwrapped : `https://${unwrapped}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    if (
      (host === 'iframe.mediadelivery.net' || host === 'video.bunnycdn.com') &&
      /^\/(embed|play)\//i.test(parsed.pathname)
    ) {
      const embedPath = parsed.pathname.replace(/^\/play\//i, '/embed/');
      return `https://iframe.mediadelivery.net${embedPath}${parsed.search}`;
    }
  } catch {
    // Not a valid URL
  }
  return null;
}

export function isDirectVideoStreamUrl(rawUrl?: string): boolean {
  const clean = (rawUrl || '').trim();
  if (!clean) return false;
  if (clean.startsWith('idb://') || clean.startsWith('blob:') || clean.startsWith('data:video')) {
    return true;
  }
  if (/\.(mp4|m3u8|webm|ogg|mov|m4v)(\?|#|$)/i.test(clean)) {
    return true;
  }
  try {
    const normalized = /^https?:\/\//i.test(clean) ? clean : `https://${clean}`;
    const parsed = new URL(normalized);
    const host = parsed.hostname.toLowerCase();
    // Bunny Stream / CDN direct stream pull zones (excluding iframe HTML embed player paths)
    if (
      (host.endsWith('.b-cdn.net') ||
        host.endsWith('.bunnycdn.com') ||
        host.endsWith('.bunny.net')) &&
      !/^\/(embed|play)\//i.test(parsed.pathname)
    ) {
      return true;
    }
  } catch {
    // Ignore parse errors
  }
  return false;
}

export type VideoSourceKind = 'youtube' | 'dailymotion' | 'direct' | 'iframe' | 'empty';

export interface ResolvedVideoSource {
  kind: VideoSourceKind;
  url: string;
  rawUrl: string;
}

export function resolveVideoSource(
  rawInput?: string,
  options?: { startSeconds?: number; muted?: boolean; autoplay?: boolean }
): ResolvedVideoSource {
  const cleaned = sanitizeMediaUrl(rawInput);
  if (!cleaned) {
    return { kind: 'empty', url: '', rawUrl: '' };
  }

  // 1) YouTube (watch, shorts, live, youtu.be, playlists -> youtube-nocookie.com/embed/...)
  const ytEmbed =
    options?.autoplay === false
      ? getYouTubePreviewEmbedUrl(cleaned)
      : getYouTubeEmbedUrl(cleaned, options?.startSeconds, Boolean(options?.muted));
  if (ytEmbed) {
    return { kind: 'youtube', url: ytEmbed, rawUrl: cleaned };
  }

  if (isYouTubeDomainOnly(cleaned)) {
    return { kind: 'empty', url: '', rawUrl: cleaned };
  }

  // 2) Dailymotion (dailymotion.com/video/... or dai.ly/... -> https://www.dailymotion.com/embed/video/...)
  const dmEmbed = getDailymotionEmbedUrl(cleaned, options);
  if (dmEmbed) {
    return { kind: 'dailymotion', url: dmEmbed, rawUrl: cleaned };
  }

  // 3) Bunny Stream HTML embed page (iframe.mediadelivery.net/embed|play/... or video.bunnycdn.com/play/...)
  const bunnyEmbed = getBunnyEmbedUrl(cleaned);
  if (bunnyEmbed) {
    return { kind: 'iframe', url: bunnyEmbed, rawUrl: cleaned };
  }

  // 4) Direct .mp4 / .m3u8 / Bunny Stream CDN / local idb/blob video URL
  if (isDirectVideoStreamUrl(cleaned)) {
    return { kind: 'direct', url: cleaned, rawUrl: cleaned };
  }

  // 5) Any other external embeddable URL
  return { kind: 'iframe', url: cleaned, rawUrl: cleaned };
}


