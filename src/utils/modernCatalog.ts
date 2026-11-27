import alphaVirginCover from '../assets/images/poster_alpha_virgin_1795442047670.jpg';
import americanTenantCover from '../assets/images/poster_american_tenant_1795442046536.jpg';
import crimsonEclipseCover from '../assets/images/poster_anime_crimson_eclipse_1795639197066.jpg';
import cyberValkyrieCover from '../assets/images/poster_anime_cyber_valkyrie_1795639197869.jpg';
import sakuraVowCover from '../assets/images/poster_anime_sakura_vow_1795639197824.jpg';
import shadowAcademyCover from '../assets/images/poster_anime_shadow_academy_1795639197998.jpg';
import chainedSatanCover from '../assets/images/poster_chained_satan_1795442046842.jpg';
import dragonEarCover from '../assets/images/poster_dragon_ear_1795442047366.jpg';
import forbiddenVampireCover from '../assets/images/poster_forbidden_vampire_1795442047332.jpg';
import fourHusbandsCover from '../assets/images/poster_four_husbands_1795442046615.jpg';
import midnightMirrorCover from '../assets/images/poster_horror_midnight_mirror_1795639196045.jpg';
import whisperingWardCover from '../assets/images/poster_horror_whispering_ward_1795639197079.jpg';
import taintedDesireCover from '../assets/images/poster_tainted_desire_1795442046704.jpg';
import wrongCrownCover from '../assets/images/poster_wrong_crown_1795442047677.jpg';
import goldenAlibiCover from '../assets/images/drama_golden_alibi_1794573506492.jpg';
import obsidianHeirCover from '../assets/images/drama_obsidian_heir_1794573505731.jpg';
import silentDynastyCover from '../assets/images/drama_silent_dynasty_1794573508735.jpg';
import velvetCrownCover from '../assets/images/drama_velvet_crown_1794573505264.jpg';
import { COIN_POT_BASE_REWARD, DEFAULT_SPONSOR_URL } from '../constants';
import { DramaEpisode } from '../types';

export const MODERN_GENRES = [
  'All',
  'Horror',
  'Romance',
  'Drama',
  'Anime',
] as const;

export type ModernGenre = (typeof MODERN_GENRES)[number];

export const PREVIEW_FREE_SECONDS = 180;
export const FULL_EPISODE_UNLOCK_COINS = 500;

export interface ModernShowItem {
  id: string;
  title: string;
  genre: Exclude<ModernGenre, 'All'>;
  episodesLabel: string;
  tagline: string;
  description: string;
  coverUrl: string;
  youtubeId?: string;
  dailymotionId?: string;
}

export const SPLASH_MODERN_POSTERS: readonly string[] = [
  taintedDesireCover,
  americanTenantCover,
  midnightMirrorCover,
  crimsonEclipseCover,
  alphaVirginCover,
  whisperingWardCover,
  cyberValkyrieCover,
  fourHusbandsCover,
  wrongCrownCover,
  sakuraVowCover,
  forbiddenVampireCover,
  dragonEarCover,
  shadowAcademyCover,
  chainedSatanCover,
  velvetCrownCover,
  goldenAlibiCover,
  obsidianHeirCover,
  silentDynastyCover,
];

export const MODERN_CURATED_CATALOG: ModernShowItem[] = [
  {
    id: 'modern-tainted-desire',
    title: 'Tainted Desire',
    genre: 'Drama',
    episodesLabel: '60 Eps',
    tagline: 'Forbidden Passion · Shattered Vows',
    description:
      'Caught in a high-stakes marriage pact, a fierce heiress uncovers a dangerous obsession inside her billionaire husband’s empire.',
    coverUrl: taintedDesireCover,
    youtubeId: 'ZyovwVVUiCs',
  },
  {
    id: 'modern-american-tenant',
    title: 'The American Tenant',
    genre: 'Drama',
    episodesLabel: '30 Eps',
    tagline: 'Secret Heir · Penthouse Secrets',
    description:
      'She dialed the wrong penthouse number and rented her spare suite to a mysterious stranger—unaware he owns the entire skyline.',
    coverUrl: americanTenantCover,
    youtubeId: 'L0ELDnzgdLc',
  },
  {
    id: 'modern-midnight-mirror',
    title: 'Midnight Mirror',
    genre: 'Horror',
    episodesLabel: 'Horror Short',
    tagline: 'Do No Harm · Reflections Lie',
    description:
      'During an overnight penthouse shift, an antique vanity begins revealing a chilling reflection that moves seconds before she does.',
    coverUrl: midnightMirrorCover,
    youtubeId: 'tBlQdys8MzI',
  },
  {
    id: 'modern-crimson-eclipse',
    title: 'Crimson Eclipse',
    genre: 'Anime',
    episodesLabel: 'EP 01',
    tagline: 'Awakened Blade · Dark Magic',
    description:
      'Under a blood-red eclipse above the capital, rival magic knights clash for an ancient grimoire that rewrites destiny.',
    coverUrl: crimsonEclipseCover,
    youtubeId: 'Y3gDKzPTtpY',
  },
  {
    id: 'modern-alpha-virgin',
    title: 'The Alpha Virgin',
    genre: 'Romance',
    episodesLabel: '60 Eps',
    tagline: 'Moonlit Bond · Untamed Fate',
    description:
      'A sudden chance encounter sparks an undeniable attraction between two strangers bound by an unspoken promise.',
    coverUrl: alphaVirginCover,
    youtubeId: 'hbYiRNCAVa4',
  },
  {
    id: 'modern-whispering-ward',
    title: 'Whispering Ward',
    genre: 'Horror',
    episodesLabel: 'Horror Short',
    tagline: 'Shut Eye · Never Fall Asleep',
    description:
      'Trapped in a candlelit east-wing corridor after midnight, a sleepless witness realizes the shadows only step closer when she blinks.',
    coverUrl: whisperingWardCover,
    youtubeId: 'OX9oy5QXEck',
  },
  {
    id: 'modern-cyber-valkyrie',
    title: 'Cyber Valkyrie',
    genre: 'Anime',
    episodesLabel: 'EP 01',
    tagline: 'Legendary Class · Neon Realm',
    description:
      'An underdog challenger unlocks a forbidden mythic class inside a hyper-realistic virtual world and rises to claim the crown.',
    coverUrl: cyberValkyrieCover,
    youtubeId: '5LM0iTQrnP4',
  },
  {
    id: 'modern-four-wild-husbands',
    title: 'Taming My Four Wild Husbands',
    genre: 'Romance',
    episodesLabel: '60 Eps',
    tagline: 'Four Rivals · One Bride',
    description:
      'After an unexpected matchmaking twist, four fiercely protective rivals compete to win one fearless woman’s heart.',
    coverUrl: fourHusbandsCover,
    youtubeId: 's3s27I3tTgw',
  },
  {
    id: 'modern-wrong-crown',
    title: 'Feeding The Wrong Crown',
    genre: 'Drama',
    episodesLabel: '60 Eps',
    tagline: 'Stolen Throne · Royal Betrayal',
    description:
      'When a billionaire CEO hides his identity to test true loyalty, betrayal turns into an unforgettable reckoning.',
    coverUrl: wrongCrownCover,
    youtubeId: 'A2yxYijfl_8',
  },
  {
    id: 'modern-chained-satan',
    title: 'Chained Satan',
    genre: 'Horror',
    episodesLabel: 'Horror Short',
    tagline: 'The Look-See · Dark Pact',
    description:
      'Every heirloom left behind carries a price—when someone refuses to let go, an entity comes to collect.',
    coverUrl: chainedSatanCover,
    youtubeId: 'VUdR6vMucHU',
  },
  {
    id: 'modern-sakura-vow',
    title: 'Sakura Vow',
    genre: 'Anime',
    episodesLabel: 'EP 01',
    tagline: 'Secret Transfer · First Love',
    description:
      'Determined to meet her idol beneath the spring blossoms, a spirited transfer student steps into an unforgettable academy romance.',
    coverUrl: sakuraVowCover,
    youtubeId: 'LZXMo7xMNRs',
  },
  {
    id: 'modern-dragon-ear',
    title: 'She Stole My Dragon Ear',
    genre: 'Romance',
    episodesLabel: '60 Eps',
    tagline: 'Ancient Bloodline · Mystic Claim',
    description:
      'Two sworn rivals are forced to team up on a romantic weekend assignment where sparks fly past every guarded secret.',
    coverUrl: dragonEarCover,
    youtubeId: 'KHcqhzEelzU',
  },
  {
    id: 'modern-forbidden-vampire',
    title: 'Feeding My Forbidden Vampire',
    genre: 'Horror',
    episodesLabel: 'Horror Short',
    tagline: 'Body Cam · Midnight Hunt',
    description:
      'Late-night security footage captures an unnatural predator stalking an isolated district after curfew.',
    coverUrl: forbiddenVampireCover,
    youtubeId: 'WnVrJh-s538',
  },
  {
    id: 'modern-shadow-academy',
    title: 'Shadow Academy',
    genre: 'Anime',
    episodesLabel: 'EP 01',
    tagline: 'Royal Mysteries · Hidden Alchemy',
    description:
      'A brilliant young apothecary unravels poisoned secrets and supernatural conspiracies behind the imperial palace walls.',
    coverUrl: shadowAcademyCover,
    youtubeId: 'EHRmWyzIpSw',
  },
  {
    id: 'modern-velvet-crown',
    title: 'Velvet Crown',
    genre: 'Drama',
    episodesLabel: '45 Eps',
    tagline: 'Empire Scandal · Secret Heir',
    description:
      'A skeptical tycoon who swore off love finds his ruthless plans upended by the one chef who refuses to bow.',
    coverUrl: velvetCrownCover,
    youtubeId: '3OJ5lMzwGKg',
  },
  {
    id: 'modern-golden-alibi',
    title: 'Golden Alibi',
    genre: 'Romance',
    episodesLabel: '48 Eps',
    tagline: 'Midnight Encounter · True Devotion',
    description:
      'A quiet evening reception turns electric when two strangers uncover a shared secret neither expected.',
    coverUrl: goldenAlibiCover,
    youtubeId: 'z9ncrJM4gd4',
  },
  {
    id: 'modern-obsidian-heir',
    title: 'Obsidian Heir',
    genre: 'Drama',
    episodesLabel: '52 Eps',
    tagline: 'Corporate War · Hidden Identity',
    description:
      'Behind boardroom alliances lies a high-society deception that could cost the city’s sharpest heir everything.',
    coverUrl: obsidianHeirCover,
    youtubeId: 'pUCAHR1G4pY',
  },
  {
    id: 'modern-silent-dynasty',
    title: 'Silent Dynasty',
    genre: 'Romance',
    episodesLabel: '56 Eps',
    tagline: 'Secret Estate · Second Chance',
    description:
      'Reunited after years apart, two heirs navigate family feuds and lingering desire under the estate lights.',
    coverUrl: silentDynastyCover,
    youtubeId: 'y5OIM01h9Zo',
  },
];

interface DailymotionVideoRaw {
  id?: string;
  title?: string;
  thumbnail_720_url?: string;
  language?: string;
}

interface DailymotionSearchResponse {
  list?: DailymotionVideoRaw[];
}

const dailymotionGenreCache = new Map<ModernGenre, ModernShowItem[]>();

const NON_ENGLISH_SCRIPT_REGEX =
  /[\u3040-\u30ff\u3400-\u4dbf\u4e00-\u9fff\uf900-\ufaff\uac00-\ud7af\u0400-\u04ff\u0600-\u06ff\u0900-\u097f\u0e00-\u0e7f]/;
const NON_ENGLISH_TAG_REGEX =
  /\b(raw|no\s*sub|unsubbed|vostfr|sub\s*espa[nñ]ol|espa[nñ]ol|castellano|indo\s*sub|sub\s*indo|leg\s*pt|dublado|vf|fran[cç]ais|deutsch|italiano|chinese|mandarin|cantonese|tagalog|hindi|urdu|tamil|telugu|viet|khmer|bahasa|pinoy|sub\s*chi|chi\s*sub|eng\s*sub\s*raw)\b/i;

export function isEnglishCatalogTitle(title?: string): boolean {
  const clean = (title || '').trim();
  if (!clean) return false;
  if (NON_ENGLISH_SCRIPT_REGEX.test(clean)) return false;
  if (NON_ENGLISH_TAG_REGEX.test(clean)) return false;
  return true;
}

function isValidEnglishCatalogUpload(raw: DailymotionVideoRaw, title: string): boolean {
  if (!isEnglishCatalogTitle(title)) {
    return false;
  }
  const lang = typeof raw.language === 'string' ? raw.language.trim().toLowerCase() : '';
  if (lang && !lang.startsWith('en')) {
    return false;
  }
  return true;
}

function mapDailymotionRawToShow(
  raw: DailymotionVideoRaw,
  genre: Exclude<ModernGenre, 'All'>
): ModernShowItem | null {
  const id = typeof raw.id === 'string' ? raw.id.trim() : '';
  const title = typeof raw.title === 'string' ? raw.title.trim() : '';
  const thumb =
    typeof raw.thumbnail_720_url === 'string' ? raw.thumbnail_720_url.trim() : '';
  if (!id || !title || !thumb) return null;
  if (!isValidEnglishCatalogUpload(raw, title)) return null;

  return {
    id: `dm-${id}`,
    title,
    genre,
    episodesLabel: genre === 'Anime' ? 'HD Anime' : `${genre} HD`,
    tagline: `Full HD ${genre} · Watch & Earn`,
    description: `Stream "${title}" in HD inside DramaWin and earn coin rewards while watching.`,
    coverUrl: thumb.replace(/^http:\/\//i, 'https://'),
    dailymotionId: id,
  };
}

async function queryDailymotionGenre(
  genre: Exclude<ModernGenre, 'All'>,
  limit: number,
  signal?: AbortSignal
): Promise<ModernShowItem[]> {
  const searchQuery =
    genre === 'Anime'
      ? 'english+dub+anime+full+episode'
      : encodeURIComponent(`${genre} short film english`);
  const fetchLimit = Math.min(50, limit * 3);
  const url = `https://api.dailymotion.com/videos?search=${searchQuery}&fields=id,title,thumbnail_720_url,language&limit=${fetchLimit}&family_filter=1&flags=no_live&languages=en`;

  const response = await fetch(url, { signal });
  if (!response.ok) {
    throw new Error(`Dailymotion API returned ${response.status}`);
  }
  const payload = (await response.json()) as DailymotionSearchResponse;
  const list = Array.isArray(payload?.list) ? payload.list : [];

  const seen = new Set<string>();
  const items: ModernShowItem[] = [];

  for (const raw of list) {
    const mapped = mapDailymotionRawToShow(raw, genre);
    if (!mapped || !mapped.dailymotionId || seen.has(mapped.dailymotionId)) continue;
    seen.add(mapped.dailymotionId);
    items.push(mapped);
    if (items.length >= limit) break;
  }

  return items;
}

export async function searchDailymotionShows(
  searchText: string,
  signal?: AbortSignal
): Promise<ModernShowItem[]> {
  const clean = searchText.trim();
  if (clean.length < 2) return [];
  const url = `https://api.dailymotion.com/videos?search=${encodeURIComponent(clean)}+english&fields=id,title,thumbnail_720_url,language&limit=15&family_filter=1&flags=no_live&languages=en`;
  const response = await fetch(url, { signal });
  if (!response.ok) return [];
  const payload = (await response.json()) as DailymotionSearchResponse;
  const list = Array.isArray(payload?.list) ? payload.list : [];

  const seen = new Set<string>();
  const items: ModernShowItem[] = [];
  for (const raw of list) {
    const rawTitle = typeof raw.title === 'string' ? raw.title : '';
    const lowerTitle = rawTitle.toLowerCase();
    const inferredGenre: Exclude<ModernGenre, 'All'> =
      /anime|manga|ninja|otaku|shonen/i.test(lowerTitle)
        ? 'Anime'
        : /horror|ghost|scary|demon|haunt|zombie|vampire|slasher/i.test(lowerTitle)
          ? 'Horror'
          : /romance|love|kiss|wedding|bride|billionaire|ceo|husband/i.test(lowerTitle)
            ? 'Romance'
            : 'Drama';
    const mapped = mapDailymotionRawToShow(raw, inferredGenre);
    if (!mapped || !mapped.dailymotionId || seen.has(mapped.dailymotionId)) continue;
    seen.add(mapped.dailymotionId);
    items.push(mapped);
    if (items.length >= 15) break;
  }
  return items;
}

export function getCachedDailymotionShowsByGenre(
  genre: ModernGenre
): ModernShowItem[] | null {
  return dailymotionGenreCache.get(genre) || null;
}

export async function fetchDailymotionShowsByGenre(
  genre: ModernGenre,
  signal?: AbortSignal
): Promise<ModernShowItem[]> {
  const cached = dailymotionGenreCache.get(genre);
  if (cached && cached.length > 0) {
    return cached;
  }

  let items: ModernShowItem[] = [];

  if (genre === 'All') {
    const [horrorList, romanceList, dramaList, animeList] = await Promise.all([
      queryDailymotionGenre('Horror', 7, signal).catch(() => []),
      queryDailymotionGenre('Romance', 6, signal).catch(() => []),
      queryDailymotionGenre('Drama', 6, signal).catch(() => []),
      queryDailymotionGenre('Anime', 6, signal).catch(() => []),
    ]);

    const interleaved: ModernShowItem[] = [];
    const seenIds = new Set<string>();
    const maxLen = Math.max(
      horrorList.length,
      romanceList.length,
      dramaList.length,
      animeList.length
    );
    for (let i = 0; i < maxLen; i += 1) {
      for (const bucket of [horrorList, romanceList, dramaList, animeList]) {
        const candidate = bucket[i];
        if (candidate && !seenIds.has(candidate.id)) {
          seenIds.add(candidate.id);
          interleaved.push(candidate);
        }
      }
    }
    items = interleaved.slice(0, 25);
  } else {
    items = await queryDailymotionGenre(genre, 25, signal);
  }

  if (items.length > 0) {
    dailymotionGenreCache.set(genre, items);
  }
  return items;
}

export function getModernCatalogByGenre(
  genre: ModernGenre,
  extraShows: ModernShowItem[] = []
): ModernShowItem[] {
  const featured = (
    genre === 'All'
      ? MODERN_CURATED_CATALOG
      : MODERN_CURATED_CATALOG.filter((item) => item.genre === genre)
  ).filter((item) => isEnglishCatalogTitle(item.title));

  if (!extraShows.length) return featured;

  const seen = new Set(featured.map((item) => item.id));
  const merged = [...featured];
  for (const extra of extraShows) {
    if (!isEnglishCatalogTitle(extra.title)) continue;
    if (!seen.has(extra.id)) {
      seen.add(extra.id);
      merged.push(extra);
    }
  }
  return merged;
}

export function buildModernPlayerEpisode(item: ModernShowItem): DramaEpisode {
  const embedUrl = item.dailymotionId
    ? `https://www.dailymotion.com/embed/video/${item.dailymotionId}?autoplay=1&mute=0&ui-logo=0&queue-enable=false&subtitles-default=en&playsinline=1&api=postMessage&ui-start-screen-info=false`
    : `https://www.youtube-nocookie.com/embed/${item.youtubeId || ''}?enablejsapi=1&controls=0&modestbranding=1&rel=0&iv_load_policy=3&playsinline=1`;

  return {
    id: `modern-${item.id}`,
    title: item.title,
    series: item.title,
    seriesId: `series-${item.id}`,
    category: item.genre,
    episodeLabel: item.episodesLabel,
    duration: 'Watch & Earn',
    rewardCoins: COIN_POT_BASE_REWARD,
    coverImage: item.coverUrl,
    posterUrl: item.coverUrl,
    thumbnailUrl: item.coverUrl,
    synopsis: item.description,
    sponsorUrl: DEFAULT_SPONSOR_URL,
    youtubeUrl: embedUrl,
    videoUrl: embedUrl,
    startTime: 0,
    sortOrder: 1,
    isPublic: true,
    archiveIdentifier: item.id,
  };
}
