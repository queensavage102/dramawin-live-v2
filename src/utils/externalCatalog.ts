import alphaVirginCover from '../assets/images/alpha_virgin_cover_1795432140819.jpg';
import americanTenantCover from '../assets/images/american_tenant_cover_1795432137093.jpg';
import chainedSatanCover from '../assets/images/chained_satan_cover_1795432136882.jpg';
import dragonEarCover from '../assets/images/dragon_ear_cover_1795432137470.jpg';
import forbiddenVampireCover from '../assets/images/forbidden_vampire_cover_1795432138182.jpg';
import fourHusbandsCover from '../assets/images/four_husbands_cover_1795432136468.jpg';
import taintedDesireCover from '../assets/images/tainted_desire_cover_1795432137375.jpg';
import wrongCrownCover from '../assets/images/wrong_crown_cover_1795432137992.jpg';

export interface FeaturedShortDrama {
  id: string;
  title: string;
  episodesCount: number;
  genre: 'Drama' | 'Fantasy' | 'Romance';
  trackingUrl: string;
  tagline: string;
  coverImage: string;
  accentGradient: string;
  badgeTone: string;
}

export interface ExternalCatalogShow {
  id: string;
  source: 'tvmaze' | 'jikan';
  title: string;
  category: 'Drama' | 'Horror' | 'Romance' | 'Anime';
  posterUrl: string;
  synopsis: string;
  episodesLabel: string;
  ratingLabel?: string;
  genres: string[];
  watchUrl: string;
  trailerEmbedUrl?: string | null;
}

export interface ExternalCatalogBuckets {
  drama: ExternalCatalogShow[];
  horror: ExternalCatalogShow[];
  romance: ExternalCatalogShow[];
  anime: ExternalCatalogShow[];
}

export const TOP_SHORTS_FEATURED: FeaturedShortDrama[] = [
  {
    id: 'top-short-tainted-desire',
    title: 'Tainted Desire',
    episodesCount: 30,
    genre: 'Drama',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Forbidden Passion · Shattered Vows',
    coverImage: taintedDesireCover,
    accentGradient: 'from-[#4A0B1F] via-[#1E0813] to-[#08070B]',
    badgeTone: 'text-rose-200 border-rose-400/40 bg-rose-500/20',
  },
  {
    id: 'top-short-american-tenant',
    title: 'The American Tenant',
    episodesCount: 60,
    genre: 'Drama',
    trackingUrl: 'https://r.reelsgo.tv/8a86PlrJpBK9',
    tagline: 'Secret Heir · Penthouse Secrets',
    coverImage: americanTenantCover,
    accentGradient: 'from-[#162844] via-[#0F1626] to-[#08080C]',
    badgeTone: 'text-amber-200 border-amber-400/45 bg-amber-500/20',
  },
  {
    id: 'top-short-dragon-ear',
    title: 'She Stole My Dragon Ear',
    episodesCount: 60,
    genre: 'Fantasy',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Ancient Bloodline · Mystic Claim',
    coverImage: dragonEarCover,
    accentGradient: 'from-[#2A1447] via-[#150D27] to-[#08080D]',
    badgeTone: 'text-fuchsia-200 border-fuchsia-400/40 bg-fuchsia-500/20',
  },
  {
    id: 'top-short-forbidden-vampire',
    title: 'Feeding My Forbidden Vampire',
    episodesCount: 60,
    genre: 'Fantasy',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Crimson Pact · Eternal Hunger',
    coverImage: forbiddenVampireCover,
    accentGradient: 'from-[#4D0C18] via-[#20080E] to-[#08070B]',
    badgeTone: 'text-red-200 border-red-400/40 bg-red-500/20',
  },
  {
    id: 'top-short-wrong-crown',
    title: 'Feeding The Wrong Crown',
    episodesCount: 60,
    genre: 'Drama',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Stolen Throne · Royal Betrayal',
    coverImage: wrongCrownCover,
    accentGradient: 'from-[#473108] via-[#1F1607] to-[#08080B]',
    badgeTone: 'text-amber-200 border-amber-400/45 bg-amber-500/20',
  },
  {
    id: 'top-short-chained-satan',
    title: 'Chained Satan',
    episodesCount: 60,
    genre: 'Fantasy',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Infernal Seal · Dark Awakening',
    coverImage: chainedSatanCover,
    accentGradient: 'from-[#3D1214] via-[#1B0A0D] to-[#08070B]',
    badgeTone: 'text-purple-200 border-purple-400/40 bg-purple-500/20',
  },
  {
    id: 'top-short-alpha-virgin',
    title: 'The Alpha Virgin',
    episodesCount: 60,
    genre: 'Romance',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Moonlit Bond · Untamed Fate',
    coverImage: alphaVirginCover,
    accentGradient: 'from-[#3E1330] via-[#1C0B1B] to-[#08070C]',
    badgeTone: 'text-pink-200 border-pink-400/40 bg-pink-500/20',
  },
  {
    id: 'top-short-four-wild-husbands',
    title: 'Taming My Four Wild Husbands',
    episodesCount: 60,
    genre: 'Romance',
    trackingUrl: 'https://reelsgo.tv',
    tagline: 'Four Rivals · One Bride',
    coverImage: fourHusbandsCover,
    accentGradient: 'from-[#3F1C10] via-[#1E0F0B] to-[#08070B]',
    badgeTone: 'text-rose-200 border-rose-400/40 bg-rose-500/20',
  },
];

export function stripHtmlTags(raw?: string | null): string {
  if (!raw) return '';
  return raw
    .replace(/<[^>]+>/g, ' ')
    .replace(/&nbsp;/gi, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim();
}

function sanitizeSafeHttpsUrl(raw?: string | null): string {
  const clean = (raw || '').trim();
  if (!clean) return '';
  try {
    const parsed = new URL(clean);
    if (parsed.protocol === 'https:' || parsed.protocol === 'http:') {
      if (parsed.protocol === 'http:') {
        parsed.protocol = 'https:';
      }
      return parsed.toString();
    }
  } catch {
    // Ignore malformed external URLs
  }
  return '';
}

export function sanitizeTrailerEmbedUrl(
  rawEmbedUrl?: string | null,
  youtubeId?: string | null
): string | null {
  const candidate = (rawEmbedUrl || '').trim();
  let resolved = '';

  if (candidate) {
    try {
      const parsed = new URL(candidate);
      if (
        parsed.hostname.includes('youtube.com') ||
        parsed.hostname.includes('youtube-nocookie.com')
      ) {
        parsed.protocol = 'https:';
        parsed.searchParams.set('cc_load_policy', '0');
        parsed.searchParams.set('rel', '0');
        parsed.searchParams.set('playsinline', '1');
        parsed.searchParams.set('autoplay', '0');
        resolved = parsed.toString();
      }
    } catch {
      // Fallback below
    }
  }

  if (!resolved && youtubeId && /^[a-zA-Z0-9_-]{11}$/.test(youtubeId.trim())) {
    resolved = `https://www.youtube-nocookie.com/embed/${youtubeId.trim()}?autoplay=0&rel=0&playsinline=1&cc_load_policy=0`;
  }

  return resolved || null;
}

interface TvMazeShowRaw {
  id?: number;
  name?: string;
  url?: string;
  officialSite?: string;
  genres?: string[];
  summary?: string;
  premiered?: string;
  rating?: { average?: number | null };
  image?: { medium?: string; original?: string } | null;
}

interface JikanAnimeRaw {
  mal_id?: number;
  title?: string;
  title_english?: string | null;
  url?: string;
  episodes?: number | null;
  score?: number | null;
  synopsis?: string | null;
  genres?: { name?: string }[];
  images?: {
    jpg?: { large_image_url?: string; image_url?: string };
    webp?: { large_image_url?: string; image_url?: string };
  };
  trailer?: {
    youtube_id?: string | null;
    embed_url?: string | null;
  } | null;
}

function mapTvMazeShow(
  show: TvMazeShowRaw,
  category: 'Drama' | 'Horror' | 'Romance'
): ExternalCatalogShow | null {
  const title = (show.name || '').trim();
  const poster = sanitizeSafeHttpsUrl(show.image?.original || show.image?.medium);
  const watchUrl = sanitizeSafeHttpsUrl(show.officialSite || show.url);
  if (!title || !poster || !watchUrl || !show.id) return null;

  const genres = Array.isArray(show.genres)
    ? show.genres.filter((g): g is string => typeof g === 'string' && g.trim().length > 0)
    : [category];

  return {
    id: `tvmaze-${category.toLowerCase()}-${show.id}`,
    source: 'tvmaze',
    title,
    category,
    posterUrl: poster,
    synopsis:
      stripHtmlTags(show.summary) ||
      `${title} — Featured ${category} series catalogued via TVMaze.`,
    episodesLabel: show.premiered ? `${show.premiered.slice(0, 4)} Series` : 'Full Series',
    ratingLabel:
      typeof show.rating?.average === 'number' ? `★ ${show.rating.average.toFixed(1)}` : undefined,
    genres: genres.length > 0 ? genres : [category],
    watchUrl,
    trailerEmbedUrl: null,
  };
}

let cachedCatalog: ExternalCatalogBuckets | null = null;
let inFlightCatalogPromise: Promise<ExternalCatalogBuckets> | null = null;
const SESSION_CACHE_KEY = 'dramawin_external_catalog_v1';

export async function fetchExternalCatalog(): Promise<ExternalCatalogBuckets> {
  if (cachedCatalog) return cachedCatalog;

  try {
    const rawCached = window.sessionStorage.getItem(SESSION_CACHE_KEY);
    if (rawCached) {
      const parsed = JSON.parse(rawCached) as ExternalCatalogBuckets;
      if (
        parsed &&
        Array.isArray(parsed.drama) &&
        Array.isArray(parsed.horror) &&
        Array.isArray(parsed.romance) &&
        Array.isArray(parsed.anime) &&
        (parsed.drama.length > 0 || parsed.anime.length > 0)
      ) {
        cachedCatalog = parsed;
        return parsed;
      }
    }
  } catch {
    // Ignore sessionStorage read errors
  }

  if (inFlightCatalogPromise) {
    return inFlightCatalogPromise;
  }

  inFlightCatalogPromise = (async () => {
    const buckets: ExternalCatalogBuckets = {
      drama: [],
      horror: [],
      romance: [],
      anime: [],
    };

    try {
      const [tvPageRes, tvHorrorRes, tvRomanceRes, jikanRes] = await Promise.allSettled([
        fetch('https://api.tvmaze.com/shows?page=0', { signal: AbortSignal.timeout(7000) }),
        fetch('https://api.tvmaze.com/search/shows?q=horror', { signal: AbortSignal.timeout(7000) }),
        fetch('https://api.tvmaze.com/search/shows?q=romance', { signal: AbortSignal.timeout(7000) }),
        fetch('https://api.jikan.moe/v4/top/anime?limit=16&sfw=true', {
          signal: AbortSignal.timeout(7000),
        }),
      ]);

      const seenTvIds = new Set<number>();

      if (tvPageRes.status === 'fulfilled' && tvPageRes.value.ok) {
        const list = (await tvPageRes.value.json()) as TvMazeShowRaw[];
        if (Array.isArray(list)) {
          for (const show of list) {
            if (!show?.id || !Array.isArray(show.genres)) continue;
            const lowerGenres = show.genres.map((g) => g.toLowerCase());

            if (lowerGenres.includes('horror') && buckets.horror.length < 14 && !seenTvIds.has(show.id)) {
              const mapped = mapTvMazeShow(show, 'Horror');
              if (mapped) {
                seenTvIds.add(show.id);
                buckets.horror.push(mapped);
                continue;
              }
            }
            if (lowerGenres.includes('romance') && buckets.romance.length < 14 && !seenTvIds.has(show.id)) {
              const mapped = mapTvMazeShow(show, 'Romance');
              if (mapped) {
                seenTvIds.add(show.id);
                buckets.romance.push(mapped);
                continue;
              }
            }
            if (lowerGenres.includes('drama') && buckets.drama.length < 14 && !seenTvIds.has(show.id)) {
              const mapped = mapTvMazeShow(show, 'Drama');
              if (mapped) {
                seenTvIds.add(show.id);
                buckets.drama.push(mapped);
              }
            }
          }
        }
      }

      if (tvHorrorRes.status === 'fulfilled' && tvHorrorRes.value.ok) {
        const results = (await tvHorrorRes.value.json()) as { show?: TvMazeShowRaw }[];
        if (Array.isArray(results)) {
          for (const entry of results) {
            if (buckets.horror.length >= 14) break;
            const show = entry?.show;
            if (!show?.id || seenTvIds.has(show.id)) continue;
            const mapped = mapTvMazeShow(show, 'Horror');
            if (mapped) {
              seenTvIds.add(show.id);
              buckets.horror.push(mapped);
            }
          }
        }
      }

      if (tvRomanceRes.status === 'fulfilled' && tvRomanceRes.value.ok) {
        const results = (await tvRomanceRes.value.json()) as { show?: TvMazeShowRaw }[];
        if (Array.isArray(results)) {
          for (const entry of results) {
            if (buckets.romance.length >= 14) break;
            const show = entry?.show;
            if (!show?.id || seenTvIds.has(show.id)) continue;
            const mapped = mapTvMazeShow(show, 'Romance');
            if (mapped) {
              seenTvIds.add(show.id);
              buckets.romance.push(mapped);
            }
          }
        }
      }

      if (jikanRes.status === 'fulfilled' && jikanRes.value.ok) {
        const payload = (await jikanRes.value.json()) as { data?: JikanAnimeRaw[] };
        const animeList = Array.isArray(payload?.data) ? payload.data : [];
        for (const anime of animeList) {
          if (!anime?.mal_id) continue;
          const title = (anime.title_english || anime.title || '').trim();
          const poster = sanitizeSafeHttpsUrl(
            anime.images?.jpg?.large_image_url ||
              anime.images?.webp?.large_image_url ||
              anime.images?.jpg?.image_url
          );
          const watchUrl = sanitizeSafeHttpsUrl(anime.url);
          if (!title || !poster || !watchUrl) continue;

          buckets.anime.push({
            id: `jikan-anime-${anime.mal_id}`,
            source: 'jikan',
            title,
            category: 'Anime',
            posterUrl: poster,
            synopsis:
              stripHtmlTags(anime.synopsis) ||
              `${title} — Popular anime series indexed via Jikan.`,
            episodesLabel: anime.episodes ? `${anime.episodes} Eps` : 'Anime Series',
            ratingLabel: typeof anime.score === 'number' ? `★ ${anime.score.toFixed(1)}` : undefined,
            genres: Array.isArray(anime.genres)
              ? anime.genres
                  .map((g) => (g?.name || '').trim())
                  .filter(Boolean)
                  .slice(0, 3)
              : ['Anime'],
            watchUrl,
            trailerEmbedUrl: sanitizeTrailerEmbedUrl(
              anime.trailer?.embed_url,
              anime.trailer?.youtube_id
            ),
          });
        }
      }
    } catch {
      // Fail gracefully with any buckets already populated
    } finally {
      inFlightCatalogPromise = null;
    }

    if (
      buckets.drama.length > 0 ||
      buckets.horror.length > 0 ||
      buckets.romance.length > 0 ||
      buckets.anime.length > 0
    ) {
      cachedCatalog = buckets;
      try {
        window.sessionStorage.setItem(SESSION_CACHE_KEY, JSON.stringify(buckets));
      } catch {
        // Ignore storage quota errors
      }
    }

    return buckets;
  })();

  return inFlightCatalogPromise;
}
