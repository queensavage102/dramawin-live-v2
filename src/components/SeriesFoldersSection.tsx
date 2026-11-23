import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  ExternalLink,
  Film,
  Flame,
  Layers,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DRAMA_CATEGORIES,
  getCanonicalVideoKey,
  getEpisodeSeriesId,
  getYouTubeFallbackThumbnailUrl,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  isStrayGojoOrAnimeInWrongSeries,
  resolveSponsorLink,
  sanitizePosterUrl,
  toSeriesId,
} from '../constants';
import { DramaEpisode, DramaSeries, PlayerPrivate } from '../types';
import {
  ExternalCatalogBuckets,
  ExternalCatalogShow,
  FeaturedShortDrama,
  TOP_SHORTS_FEATURED,
  fetchExternalCatalog,
} from '../utils/externalCatalog';
import { resolveEpisodeCover } from '../utils/localState';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { EpisodeWatchScreen } from './EpisodeWatchScreen';
import { FeaturedShortPosterArtwork } from './FeaturedShortPosterArtwork';
import { InstallAppWidget } from './InstallAppWidget';

interface SeriesFoldersSectionProps {
  sections: string[];
  episodes: DramaEpisode[];
  cloudSeries?: DramaSeries[];
  privateState: PlayerPrivate;
  isAdmin?: boolean;
  referralUserId?: string;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onClaimGiftBoxCoins?: () => Promise<void>;
  onShareEpisode?: (episode: DramaEpisode) => void;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: { claimLabel?: string; readyHeadline?: string }
  ) => void;
  onClaimHeroBonus?: () => Promise<void>;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
}

interface SeriesFolderGroup {
  seriesId: string;
  seriesName: string;
  category: string;
  posterUrl: string;
  fallbackYtThumb: string;
  synopsis: string;
  episodes: DramaEpisode[];
  displayEpisodeCount: number;
  isNew: boolean;
}

const VARIED_EPISODE_COUNTS = [54, 80, 62, 74, 48, 68, 92, 58, 64, 76, 84, 52];

function containsJjkGojoRef(value?: string): boolean {
  const text = (value || '').toLowerCase();
  return (
    text.includes('gojo') ||
    text.includes('jjk-gojo') ||
    text.includes('satoru') ||
    /candy\s*man/i.test(text)
  );
}

function isStrayJjkGojoEpisodeForSeries(ep: DramaEpisode): boolean {
  return (
    isLegacyBrokenEpisode(ep) ||
    isStrayGojoOrAnimeInWrongSeries(ep) ||
    containsJjkGojoRef(ep.id) ||
    containsJjkGojoRef(ep.series) ||
    containsJjkGojoRef(ep.title) ||
    containsJjkGojoRef(ep.posterUrl) ||
    containsJjkGojoRef(ep.coverImage) ||
    containsJjkGojoRef(ep.thumbnailUrl) ||
    containsJjkGojoRef(ep.youtubeUrl) ||
    containsJjkGojoRef(ep.videoUrl)
  );
}

function resolveIsolatedEpisodeCover(ep: DramaEpisode): string {
  const raw = resolveEpisodeCover(ep);
  if (!raw || containsJjkGojoRef(raw)) return '';
  return raw;
}

const EpisodeCover: React.FC<{
  src: string;
  fallbackSrc?: string;
  alt: string;
  className?: string;
}> = ({
  src,
  fallbackSrc = '',
  alt,
  className = 'w-full h-full object-cover transition-transform duration-300 group-hover:scale-[1.04]',
}) => {
  const cleanSrc = sanitizePosterUrl(src);
  const cleanFallback =
    sanitizePosterUrl(fallbackSrc) ||
    (cleanSrc ? getYouTubeFallbackThumbnailUrl(cleanSrc) || '' : '');
  const resolvedPrimary = useResolvedMediaUrl(cleanSrc);
  const [useFallback, setUseFallback] = useState(false);
  const [failed, setFailed] = useState(false);

  useEffect(() => {
    setUseFallback(false);
    setFailed(false);
  }, [cleanSrc, resolvedPrimary, cleanFallback]);

  const activeSrc = useFallback && cleanFallback ? cleanFallback : resolvedPrimary || cleanFallback;

  if (failed || !activeSrc) {
    return (
      <div className="w-full h-full bg-gradient-to-br from-[#1b1526] via-[#121218] to-[#08080b] flex items-center justify-center p-4 text-center">
        <span className="text-xs font-display font-semibold text-zinc-400 line-clamp-3">
          {alt}
        </span>
      </div>
    );
  }

  return (
    <img
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
      onLoad={(e) => {
        // YouTube returns a 120x90 grey stub with HTTP 200 when maxresdefault.jpg is absent
        if (
          activeSrc.includes('/maxresdefault.jpg') &&
          e.currentTarget.naturalWidth > 0 &&
          e.currentTarget.naturalWidth <= 120
        ) {
          if (!useFallback && cleanFallback && activeSrc !== cleanFallback) {
            setUseFallback(true);
          } else {
            setFailed(true);
          }
        }
      }}
      onError={() => {
        if (!useFallback && cleanFallback && activeSrc !== cleanFallback) {
          setUseFallback(true);
        } else {
          setFailed(true);
        }
      }}
      className={className}
    />
  );
};

const VerticalPosterCard: React.FC<{
  group: SeriesFolderGroup;
  scrollable?: boolean;
  onOpen: (seriesId: string) => void;
}> = ({ group, scrollable = false, onOpen }) => {
  return (
    <button
      type="button"
      onClick={() => onOpen(group.seriesId)}
      className={`group relative aspect-[2/3] text-left rounded-2xl bg-[#111116] border border-white/[0.08] hover:border-amber-400/50 overflow-hidden transition-all active:scale-[0.98] cursor-pointer ${
        scrollable
          ? 'w-[152px] sm:w-[176px] shrink-0 snap-start'
          : 'w-full'
      }`}
    >
      {/* Full-Bleed 2:3 Vertical Cover Image */}
      <EpisodeCover
        key={`${group.seriesId}::${group.posterUrl}`}
        src={group.posterUrl}
        fallbackSrc={group.fallbackYtThumb}
        alt={group.seriesName}
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />

      {/* Dark Bottom Gradient for Text Readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />

      {/* Top Corner: Varied Episode Count */}
      <div className="absolute top-2.5 right-2.5">
        <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md border border-white/15 font-mono-num text-[11px] font-semibold text-white/95 tracking-tight shadow-sm">
          {group.displayEpisodeCount} {group.displayEpisodeCount === 1 ? 'Ep' : 'Eps'}
        </span>
      </div>

      {/* Bottom: Show Title */}
      <div className="absolute inset-x-0 bottom-0 p-3">
        <h3 className="text-[13px] sm:text-sm font-display font-bold text-white line-clamp-2 leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:text-amber-300 transition-colors">
          {group.seriesName}
        </h3>
      </div>
    </button>
  );
};

const FeaturedShortPosterCard: React.FC<{
  item: FeaturedShortDrama;
  matchedPosterUrl?: string;
  scrollable?: boolean;
  className?: string;
}> = ({ item, matchedPosterUrl, scrollable = false, className = '' }) => {
  return (
    <div
      className={`group relative rounded-2xl bg-[#111116] border border-[#D4AF37]/40 hover:border-[#FBBF24]/85 overflow-hidden transition-all shadow-[0_12px_30px_rgba(0,0,0,0.65)] flex flex-col justify-between ${
        scrollable
          ? 'aspect-[2/3] w-[166px] sm:w-[190px] shrink-0 snap-start'
          : className || 'aspect-[2/3] w-full'
      }`}
    >
      {matchedPosterUrl ? (
        <EpisodeCover
          src={matchedPosterUrl}
          alt={item.title}
          className="absolute inset-0 w-full h-full object-cover brightness-100 contrast-105 saturate-115 transition-transform duration-500 group-hover:scale-[1.04]"
        />
      ) : (
        <FeaturedShortPosterArtwork item={item} showCenterTitle={false} variant="card" />
      )}

      {/* Dark gradient strictly confined to bottom ~25–30% behind title text */}
      <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[30%] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

      {/* Top Metadata Strip: Genre & Episodes */}
      <div className="relative z-10 p-2.5 flex items-center justify-between gap-1.5">
        <span className="px-2 py-0.5 rounded-md border border-white/20 bg-black/75 text-white text-[10px] font-bold uppercase tracking-wider backdrop-blur-md shadow-sm">
          {item.genre}
        </span>
        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 font-mono-num text-[10px] font-semibold text-white shadow-sm">
          {item.episodesCount} Eps
        </span>
      </div>

      {/* Bottom: Series Title + Gold "Watch Full Series" Link Button */}
      <div className="relative z-10 p-2.5 sm:p-3 space-y-2">
        <h3 className="text-[13px] sm:text-sm font-display font-bold text-white line-clamp-2 leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] group-hover:text-amber-300 transition-colors">
          {item.title}
        </h3>
        <a
          href={item.trackingUrl}
          target="_blank"
          rel="noopener noreferrer"
          className="w-full min-h-[34px] px-2.5 rounded-xl gold-gradient-bg text-[#181307] text-[11px] font-extrabold inline-flex items-center justify-center gap-1 hover:brightness-105 active:scale-[0.98] shadow-[0_4px_14px_rgba(212,175,55,0.35)] transition"
        >
          <span>Watch Full Series</span>
          <ExternalLink className="w-3 h-3 shrink-0" />
        </a>
      </div>
    </div>
  );
};

const ExternalCatalogPosterCard: React.FC<{
  show: ExternalCatalogShow;
  scrollable?: boolean;
  onSelect: (show: ExternalCatalogShow) => void;
}> = ({ show, scrollable = false, onSelect }) => {
  return (
    <button
      type="button"
      onClick={() => onSelect(show)}
      className={`group relative aspect-[2/3] text-left rounded-2xl bg-[#111116] border border-white/[0.08] hover:border-amber-400/50 overflow-hidden transition-all active:scale-[0.98] cursor-pointer ${
        scrollable
          ? 'w-[152px] sm:w-[176px] shrink-0 snap-start'
          : 'w-full'
      }`}
    >
      <img
        src={show.posterUrl}
        alt={show.title}
        loading="lazy"
        referrerPolicy="no-referrer"
        className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.04]"
      />
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/40 to-black/20" />

      <div className="absolute top-2.5 left-2.5 right-2.5 flex items-center justify-between gap-1.5">
        {show.ratingLabel ? (
          <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-md border border-amber-400/35 font-mono-num text-[10px] font-bold text-amber-300">
            {show.ratingLabel}
          </span>
        ) : (
          <span />
        )}
        <span className="px-2 py-0.5 rounded-md bg-black/65 backdrop-blur-md border border-white/15 font-mono-num text-[10px] font-semibold text-white/95 tracking-tight shadow-sm">
          {show.episodesLabel}
        </span>
      </div>

      <div className="absolute inset-x-0 bottom-0 p-3 space-y-1">
        <h3 className="text-[13px] sm:text-sm font-display font-bold text-white line-clamp-2 leading-snug drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] group-hover:text-amber-300 transition-colors">
          {show.title}
        </h3>
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold text-amber-300/90">
          <Play className="w-2.5 h-2.5 fill-current" />
          <span>{show.trailerEmbedUrl ? 'Trailer & Details' : 'Details & Watch'}</span>
        </span>
      </div>
    </button>
  );
};

export const SeriesFoldersSection: React.FC<SeriesFoldersSectionProps> = ({
  sections,
  episodes,
  cloudSeries = [],
  privateState,
  referralUserId,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal,
  onToggleMute,
  onAwardCoinPot,
  onClaimGiftBoxCoins,
  onShareEpisode,
  onStartSponsorReward,
  onClaimHeroBonus,
  onMarkEpisodeWatched,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [selectedExternalShow, setSelectedExternalShow] = useState<ExternalCatalogShow | null>(null);
  const [externalCatalog, setExternalCatalog] = useState<ExternalCatalogBuckets>({
    drama: [],
    horror: [],
    romance: [],
    anime: [],
  });
  const [externalLoading, setExternalLoading] = useState<boolean>(true);
  const [activePlayerEpisode, setActivePlayerEpisode] = useState<DramaEpisode | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef<number | null>(null);
  const topShortsCarouselRef = useRef<HTMLDivElement | null>(null);

  useEffect(() => {
    let cancelled = false;
    setExternalLoading(true);
    void fetchExternalCatalog()
      .then((buckets) => {
        if (!cancelled) {
          setExternalCatalog(buckets);
        }
      })
      .finally(() => {
        if (!cancelled) {
          setExternalLoading(false);
        }
      });
    return () => {
      cancelled = true;
    };
  }, []);

  const watchedEpisodeIdSet = useMemo(() => {
    const set = new Set<string>();
    (privateState?.watchedEpisodeIds || []).forEach((entry) => {
      if (typeof entry !== 'string') return;
      const clean = entry.trim();
      if (!clean) return;
      const sepIdx = clean.indexOf('::');
      set.add(sepIdx >= 0 ? clean.slice(0, sepIdx) : clean);
    });
    return set;
  }, [privateState?.watchedEpisodeIds]);

  // Build deduplicated distinct Series folders keyed strictly by canonical seriesId
  const seriesGroups: SeriesFolderGroup[] = useMemo(() => {
    const map = new Map<string, { displayName: string; episodes: DramaEpisode[] }>();

    sections.forEach((secName) => {
      const clean = secName.trim().replace(/\s+/g, ' ');
      if (!clean || containsJjkGojoRef(clean)) return;
      const sId = toSeriesId(clean);
      if (!map.has(sId)) {
        map.set(sId, { displayName: clean, episodes: [] });
      }
    });

    episodes.forEach((ep) => {
      if (!ep?.id || isStrayJjkGojoEpisodeForSeries(ep)) return;
      const clean = (ep.series || '').trim().replace(/\s+/g, ' ') || 'Featured Series';
      const sId = getEpisodeSeriesId({ series: clean, seriesId: ep.seriesId });
      const entry = map.get(sId) || { displayName: clean, episodes: [] };

      const epVideoKey = getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl);
      const epSig = `${(ep.episodeLabel || '').trim().toLowerCase()}::${(
        ep.videoUrl ||
        ep.youtubeUrl ||
        ep.title ||
        ''
      )
        .trim()
        .toLowerCase()}`;

      const alreadyHas = entry.episodes.some((existing) => {
        if (existing.id === ep.id) return true;
        if (epVideoKey && getCanonicalVideoKey(existing.videoUrl || existing.youtubeUrl) === epVideoKey) {
          return true;
        }
        const exSig = `${(existing.episodeLabel || '').trim().toLowerCase()}::${(
          existing.videoUrl ||
          existing.youtubeUrl ||
          existing.title ||
          ''
        )
          .trim()
          .toLowerCase()}`;
        return epSig !== '::' && exSig === epSig;
      });

      if (!alreadyHas) {
        entry.episodes.push(ep);
      }
      map.set(sId, entry);
    });

    const cloudSeriesById = new Map<string, DramaSeries>();
    cloudSeries.forEach((s) => {
      if (s?.seriesId) {
        cloudSeriesById.set(s.seriesId, s);
      }
    });

    const usedCounts = new Set<number>();

    return Array.from(map.entries()).map(([seriesId, { displayName, episodes: groupEps }], idx) => {
      const filteredEps = groupEps
        .filter((ep) => {
          return (
            getEpisodeSeriesId(ep) === seriesId &&
            !isStrayJjkGojoEpisodeForSeries(ep)
          );
        })
        .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

      const cloudMeta = cloudSeriesById.get(seriesId);
      const lead = filteredEps[0];
      const explicitCategory =
        filteredEps.map((ep) => ep.category?.trim()).find(Boolean) ||
        cloudMeta?.category?.trim();
      const category = inferEpisodeCategory(displayName, lead?.title, explicitCategory);
      const rawCloudPoster = cloudMeta?.posterUrl || cloudMeta?.coverImage || '';
      const cloudPoster =
        rawCloudPoster && !containsJjkGojoRef(rawCloudPoster)
          ? sanitizePosterUrl(rawCloudPoster)
          : '';
      const epPoster =
        filteredEps.map((ep) => resolveIsolatedEpisodeCover(ep)).find(Boolean) || '';
      const firstVideoUrl = filteredEps
        .map((ep) => (ep.videoUrl || ep.youtubeUrl || '').trim())
        .find(Boolean);
      const rawYtThumb = firstVideoUrl ? getYouTubeThumbnailUrl(firstVideoUrl) || '' : '';
      const cleanAutoYt =
        rawYtThumb && !containsJjkGojoRef(rawYtThumb) ? sanitizePosterUrl(rawYtThumb) : '';
      const resolvedPoster = cloudPoster || epPoster || cleanAutoYt || '';
      const rawFallbackYt =
        resolvedPoster || firstVideoUrl
          ? getYouTubeFallbackThumbnailUrl(resolvedPoster || firstVideoUrl) || ''
          : '';
      const fallbackYtThumb =
        rawFallbackYt && !containsJjkGojoRef(rawFallbackYt)
          ? sanitizePosterUrl(rawFallbackYt)
          : '';

      const baseHash = Array.from(seriesId).reduce((acc, ch) => acc + ch.charCodeAt(0), 0);
      let variedCount = VARIED_EPISODE_COUNTS[(baseHash + idx) % VARIED_EPISODE_COUNTS.length];
      if (usedCounts.has(variedCount)) {
        const unused = VARIED_EPISODE_COUNTS.find((c) => !usedCounts.has(c));
        if (unused !== undefined) variedCount = unused;
      }
      usedCounts.add(variedCount);
      const displayEpisodeCount = filteredEps.length >= 10 ? filteredEps.length : variedCount;

      return {
        seriesId,
        seriesName: displayName,
        category,
        posterUrl: resolvedPoster,
        fallbackYtThumb,
        synopsis:
          lead?.synopsis || cloudMeta?.synopsis || `${displayName} short-drama collection.`,
        episodes: filteredEps,
        displayEpisodeCount,
        isNew: idx < 4 || filteredEps.length === 0,
      };
    });
  }, [sections, episodes, cloudSeries]);

  // Hero Carousel slides: custom /admin series first, or the 8 Featured Top Shorts when none are published yet
  const heroSlides = useMemo(() => {
    if (seriesGroups.length > 0) {
      const withMedia = seriesGroups.filter(
        (g) => g.episodes.length > 0 || Boolean(g.posterUrl || g.fallbackYtThumb)
      );
      const chosen = (withMedia.length > 0 ? withMedia : seriesGroups).slice(0, 5);
      return chosen.map((series) => ({
        key: series.seriesId,
        label: series.seriesName,
        kind: 'series' as const,
        series,
      }));
    }
    return TOP_SHORTS_FEATURED.map((drama) => ({
      key: drama.id,
      label: drama.title,
      kind: 'featured' as const,
      drama,
    }));
  }, [seriesGroups]);

  useEffect(() => {
    if (heroIndex >= heroSlides.length && heroSlides.length > 0) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 5000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  // Group series + auto-filled TVMaze/Jikan shows into ordered genre buckets
  const categoryBuckets = useMemo(() => {
    const map = new Map<
      string,
      { groups: SeriesFolderGroup[]; externalShows: ExternalCatalogShow[] }
    >();

    const ensureBucket = (cat: string) => {
      if (!map.has(cat)) {
        map.set(cat, { groups: [], externalShows: [] });
      }
      return map.get(cat)!;
    };

    // Always ensure core TVMaze + Jikan + Featured genre tabs exist cleanly
    ['Drama', 'Fantasy', 'Horror', 'Romance', 'Anime'].forEach(ensureBucket);

    seriesGroups.forEach((group) => {
      const cat = group.category || 'Drama';
      ensureBucket(cat).groups.push(group);
    });

    ensureBucket('Drama').externalShows.push(...externalCatalog.drama);
    ensureBucket('Horror').externalShows.push(...externalCatalog.horror);
    ensureBucket('Romance').externalShows.push(...externalCatalog.romance);
    ensureBucket('Anime').externalShows.push(...externalCatalog.anime);

    const knownOrder: string[] = ['Drama', 'Fantasy', 'Horror', 'Romance', 'Anime', ...DRAMA_CATEGORIES];
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const idxA = knownOrder.indexOf(a);
      const idxB = knownOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys
      .map((category) => {
        const entry = map.get(category)!;
        const featuredCount = TOP_SHORTS_FEATURED.filter(
          (item) => item.genre.toLowerCase() === category.toLowerCase()
        ).length;
        return {
          category,
          groups: entry.groups,
          externalShows: entry.externalShows,
          featuredCount,
          totalCount: entry.groups.length + entry.externalShows.length + featuredCount,
        };
      })
      .filter(
        (b) =>
          b.totalCount > 0 ||
          b.category === 'Drama' ||
          b.category === 'Horror' ||
          b.category === 'Romance' ||
          b.category === 'Anime'
      );
  }, [seriesGroups, externalCatalog]);

  useEffect(() => {
    if (
      selectedCategory !== 'All' &&
      !categoryBuckets.some((bucket) => bucket.category === selectedCategory)
    ) {
      setSelectedCategory('All');
    }
  }, [categoryBuckets, selectedCategory]);

  const featuredPosterByTitle = useMemo(() => {
    const lookup = new Map<string, string>();
    seriesGroups.forEach((g) => {
      const poster = g.posterUrl || g.fallbackYtThumb;
      if (poster) {
        lookup.set(g.seriesName.trim().toLowerCase(), poster);
      }
    });
    return lookup;
  }, [seriesGroups]);

  const activeSeriesGroup = useMemo(() => {
    if (!selectedSeriesId) return null;
    const baseGroup = seriesGroups.find((g) => g.seriesId === selectedSeriesId) || null;
    if (!baseGroup) return null;

    const seenIds = new Set<string>();
    const seenVideoKeys = new Set<string>();
    const strictlyFiltered = episodes
      .filter((ep) => {
        if (!ep?.id || seenIds.has(ep.id)) return false;
        if (getEpisodeSeriesId(ep) !== baseGroup.seriesId) return false;
        if (isStrayJjkGojoEpisodeForSeries(ep)) return false;
        const vKey = getCanonicalVideoKey(ep.videoUrl || ep.youtubeUrl);
        if (vKey) {
          if (seenVideoKeys.has(vKey)) return false;
          seenVideoKeys.add(vKey);
        }
        seenIds.add(ep.id);
        return true;
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));

    return {
      ...baseGroup,
      episodes: strictlyFiltered,
    };
  }, [seriesGroups, selectedSeriesId, episodes]);

  const isModalOpen = Boolean(activeSeriesGroup || selectedExternalShow || activePlayerEpisode);
  useEffect(() => {
    if (!isModalOpen || typeof document === 'undefined') return;
    const htmlEl = document.documentElement;
    const bodyEl = document.body;
    const prevHtmlOverflow = htmlEl.style.overflow;
    const prevBodyOverflow = bodyEl.style.overflow;
    const prevBodyOverscroll = bodyEl.style.overscrollBehavior;

    htmlEl.style.overflow = 'hidden';
    bodyEl.style.overflow = 'hidden';
    bodyEl.style.overscrollBehavior = 'none';

    return () => {
      htmlEl.style.overflow = prevHtmlOverflow;
      bodyEl.style.overflow = prevBodyOverflow;
      bodyEl.style.overscrollBehavior = prevBodyOverscroll;
    };
  }, [isModalOpen]);

  useEffect(() => {
    if ((!activeSeriesGroup && !selectedExternalShow) || activePlayerEpisode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSeriesId(null);
        setSelectedExternalShow(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSeriesGroup, selectedExternalShow, activePlayerEpisode]);

  const activeCategoryBucket = useMemo(
    () => categoryBuckets.find((b) => b.category === selectedCategory) || null,
    [categoryBuckets, selectedCategory]
  );

  const nextEpisodeForActivePlayer = useMemo(() => {
    if (!activePlayerEpisode) return null;
    const orderedSeries = seriesGroups.flatMap((g) => g.episodes);
    if (orderedSeries.length > 1) {
      const currentIdx = orderedSeries.findIndex((ep) => ep.id === activePlayerEpisode.id);
      if (currentIdx >= 0) {
        const candidate = orderedSeries[(currentIdx + 1) % orderedSeries.length];
        return candidate && candidate.id !== activePlayerEpisode.id ? candidate : null;
      }
    }
    const fallbackSorted = [...episodes].sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    if (fallbackSorted.length <= 1) return null;
    const fbIdx = fallbackSorted.findIndex((ep) => ep.id === activePlayerEpisode.id);
    const candidate = fbIdx >= 0 ? fallbackSorted[(fbIdx + 1) % fallbackSorted.length] : fallbackSorted[0];
    return candidate && candidate.id !== activePlayerEpisode.id ? candidate : null;
  }, [activePlayerEpisode, seriesGroups, episodes]);

  const activeHero = heroSlides[heroIndex] || null;
  const shelfBuckets = useMemo(
    () =>
      categoryBuckets.filter(
        (b) =>
          b.groups.length > 0 ||
          b.externalShows.length > 0 ||
          (externalLoading && ['Drama', 'Horror', 'Romance', 'Anime'].includes(b.category))
      ),
    [categoryBuckets, externalLoading]
  );
  const horrorBucketIndex = shelfBuckets.findIndex(
    (b) => b.category.toLowerCase() === 'horror'
  );

  // Split category buckets into Drama/pre-Horror rows and Horror+ rows
  const preAdBuckets =
    horrorBucketIndex >= 0
      ? shelfBuckets.slice(0, horrorBucketIndex)
      : shelfBuckets.slice(0, 1);
  const postAdBuckets =
    horrorBucketIndex >= 0
      ? shelfBuckets.slice(horrorBucketIndex)
      : shelfBuckets.slice(1);

  return (
    <>
      <section className="space-y-6">
        {/* 1. Full-Bleed Auto-Sliding Hero Carousel with Touch-Swipe */}
        {heroSlides.length > 0 && activeHero && (
          <div className="space-y-3">
            <div
              onTouchStart={(e) => {
                heroTouchStartX.current = e.touches[0]?.clientX ?? null;
              }}
              onTouchEnd={(e) => {
                const startX = heroTouchStartX.current;
                heroTouchStartX.current = null;
                if (startX === null || heroSlides.length <= 1) return;
                const endX = e.changedTouches[0]?.clientX ?? startX;
                const diff = startX - endX;
                if (diff > 45) {
                  setHeroIndex((prev) => (prev + 1) % heroSlides.length);
                } else if (diff < -45) {
                  setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length);
                }
              }}
              className="relative w-full aspect-[4/3] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-white/[0.1] bg-[#111116] shadow-[0_16px_48px_rgba(0,0,0,0.7)] group"
            >
              {activeHero.kind === 'series' ? (
                <button
                  type="button"
                  onClick={() => setSelectedSeriesId(activeHero.series.seriesId)}
                  className="w-full h-full relative text-left cursor-pointer block"
                >
                  <EpisodeCover
                    key={`hero-${activeHero.series.seriesId}-${activeHero.series.posterUrl}`}
                    src={activeHero.series.posterUrl}
                    fallbackSrc={activeHero.series.fallbackYtThumb}
                    alt={activeHero.series.seriesName}
                    className="w-full h-full object-cover object-[center_22%] opacity-100 brightness-100 contrast-105 saturate-115 transition-transform duration-500 group-hover:scale-[1.03]"
                  />
                  {/* Dark gradient strictly confined to bottom behind title text */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Bottom-Left Overlay: Genre Pills & Series Title (2-line wrap) */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-6 sm:right-6 flex flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0 max-w-2xl space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                          {activeHero.series.category}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono-num font-semibold text-white shadow-sm">
                          {activeHero.series.episodes.length}{' '}
                          {activeHero.series.episodes.length === 1 ? 'Episode' : 'Episodes'}
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-3xl font-display font-bold text-white line-clamp-2 leading-tight text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                        {activeHero.series.seriesName}
                      </h1>
                      <p className="text-xs text-zinc-200 line-clamp-1 max-w-xl hidden sm:block">
                        {activeHero.series.synopsis}
                      </p>
                    </div>

                    <span className="shrink-0 min-h-[38px] px-4 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 group-hover:bg-amber-400 group-hover:text-zinc-950 group-hover:border-amber-300 transition-colors">
                      <Play className="w-3.5 h-3.5 fill-current" />
                      <span>Watch Now</span>
                    </span>
                  </div>
                </button>
              ) : (
                <div className="w-full h-full relative text-left">
                  <FeaturedShortPosterArtwork
                    key={`hero-${activeHero.drama.id}`}
                    item={activeHero.drama}
                    showCenterTitle={false}
                    variant="stage"
                  />
                  {/* Dark gradient strictly confined to bottom behind title text */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[32%] bg-gradient-to-t from-black/85 via-black/30 to-transparent" />

                  {/* Bottom Overlay: Genre & Episode Badges, 2-Line Full Title, Tagline, and Gold Affiliate CTA */}
                  <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-6 sm:right-6 flex flex-col items-start gap-2.5 sm:flex-row sm:items-end sm:justify-between sm:gap-4">
                    <div className="min-w-0 max-w-2xl space-y-1.5">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2.5 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {activeHero.drama.genre}
                        </span>
                        <span className="px-2.5 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono-num font-semibold text-white shadow-sm">
                          {activeHero.drama.episodesCount} Eps
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-3xl font-display font-bold text-white line-clamp-2 leading-tight text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                        {activeHero.drama.title}
                      </h1>
                      <p className="text-xs text-zinc-200/90 line-clamp-1 max-w-xl hidden sm:block">
                        {activeHero.drama.tagline}
                      </p>
                    </div>

                    <a
                      href={activeHero.drama.trackingUrl}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="shrink-0 min-h-[38px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1.5 hover:brightness-105 active:scale-95 shadow-[0_6px_20px_rgba(212,175,55,0.4)] transition"
                    >
                      <span>Watch Full Series</span>
                      <ExternalLink className="w-3.5 h-3.5 shrink-0" />
                    </a>
                  </div>
                </div>
              )}

              {/* Floating Right Reward Button (Opens Sponsor Ad + Claims Bonus Coins without opening player) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  if (onStartSponsorReward) {
                    onStartSponsorReward(
                      async () => {
                        if (onClaimHeroBonus) {
                          await onClaimHeroBonus();
                        }
                      },
                      {
                        claimLabel: 'Claim +100',
                        readyHeadline: 'Sponsor Ad • Ready! +100 Coins Unlocked',
                      }
                    );
                  } else {
                    const activeSponsorLink = resolveSponsorLink(sponsorAdUrl);
                    if (activeSponsorLink && activeSponsorLink !== '#') {
                      window.open(activeSponsorLink, '_blank', 'noopener,noreferrer');
                    }
                    if (onClaimHeroBonus) {
                      void onClaimHeroBonus();
                    }
                  }
                }}
                aria-label="Click to claim Coins"
                className="absolute top-3 right-3 sm:top-4 sm:right-4 z-20 inline-flex items-center gap-1.5 px-3.5 py-2 rounded-full bg-gradient-to-r from-amber-400 via-yellow-300 to-fuchsia-400 text-zinc-950 text-[11px] font-extrabold shadow-[0_0_20px_rgba(251,191,36,0.6)] hover:brightness-110 active:scale-95 transition-transform cursor-pointer"
              >
                <Sparkles className="w-3.5 h-3.5" />
                <span>Click to claim Coins</span>
              </button>

              {heroSlides.length > 1 && (
                <>
                  <button
                    type="button"
                    onClick={() =>
                      setHeroIndex((prev) => (prev - 1 + heroSlides.length) % heroSlides.length)
                    }
                    aria-label="Previous featured series"
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white items-center justify-center hover:border-amber-400/50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
                    aria-label="Next featured series"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 z-20 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white items-center justify-center hover:border-amber-400/50 cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </>
              )}
            </div>

            {/* Centered Glowing Pill Pagination Dots */}
            {heroSlides.length > 1 && (
              <div className="flex items-center justify-center gap-1.5" role="tablist" aria-label="Hero slides">
                {heroSlides.map((slide, idx) => {
                  const active = idx === heroIndex;
                  return (
                    <button
                      key={slide.key}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      aria-label={`Slide ${idx + 1}: ${slide.label}`}
                      aria-selected={active}
                      className={`h-2 rounded-full transition-all cursor-pointer ${
                        active
                          ? 'w-7 bg-gradient-to-r from-amber-300 via-yellow-400 to-fuchsia-500 shadow-[0_0_12px_rgba(251,191,36,0.75)]'
                          : 'w-2 bg-white/20 hover:bg-white/40'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        )}

        {/* Install DramaWin App (PWA) Widget below Hero Carousel */}
        <InstallAppWidget storageKey="dramawin_install_home_dismissed_v1" />

        {/* 2. Genre Filter Pills */}
        <div
          role="tablist"
          aria-label="Filter series by genre"
          className="flex items-center gap-2 overflow-x-auto pb-1"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedCategory === 'All'}
            onClick={() => setSelectedCategory('All')}
            className={`min-h-[38px] px-4 rounded-full border text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
              selectedCategory === 'All'
                ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 border-amber-200 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]'
                : 'bg-white/[0.05] border-white/[0.1] text-zinc-300 hover:text-white hover:border-amber-400/40'
            }`}
          >
            <Layers className="w-3.5 h-3.5" />
            <span>All Genres</span>
          </button>

          {categoryBuckets.map((bucket) => {
            const isSelected = selectedCategory === bucket.category;
            return (
              <button
                key={bucket.category}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(bucket.category)}
                className={`min-h-[38px] px-4 rounded-full border text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 border-amber-200 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,0.3)]'
                    : 'bg-white/[0.05] border-white/[0.1] text-zinc-300 hover:text-white hover:border-amber-400/40'
                }`}
              >
                <span>{bucket.category}</span>
                {bucket.totalCount > 0 && (
                  <span className="font-mono-num text-[10px] opacity-75">
                    ({bucket.totalCount})
                  </span>
                )}
              </button>
            );
          })}
        </div>

        {/* 3. "Top Shorts" Featured Short Dramas + Auto-Filled TVMaze & Jikan Catalog */}
        {selectedCategory === 'All' ? (
          <div className="space-y-6">
            {/* Top Shorts Shelf (8 Featured Short Dramas — Smooth Horizontal Carousel) */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    Top Shorts
                  </h2>
                  <span className="text-[11px] font-mono-num text-amber-300/90 font-semibold">
                    · 8 Featured
                  </span>
                </div>
                <div className="flex items-center gap-1.5">
                  <button
                    type="button"
                    onClick={() =>
                      topShortsCarouselRef.current?.scrollBy({ left: -340, behavior: 'smooth' })
                    }
                    aria-label="Scroll Top Shorts left"
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/45 text-zinc-200 flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() =>
                      topShortsCarouselRef.current?.scrollBy({ left: 340, behavior: 'smooth' })
                    }
                    aria-label="Scroll Top Shorts right"
                    className="w-8 h-8 rounded-full bg-white/[0.06] hover:bg-amber-400/20 border border-white/10 hover:border-amber-400/45 text-zinc-200 flex items-center justify-center transition cursor-pointer"
                  >
                    <ChevronRight className="w-4 h-4" />
                  </button>
                </div>
              </div>

              <div
                ref={topShortsCarouselRef}
                className="flex gap-3 sm:gap-4 overflow-x-auto no-scrollbar pb-2 snap-x snap-mandatory scroll-smooth"
              >
                {TOP_SHORTS_FEATURED.map((item) => (
                  <FeaturedShortPosterCard
                    key={item.id}
                    item={item}
                    matchedPosterUrl={featuredPosterByTitle.get(item.title.toLowerCase())}
                    scrollable
                  />
                ))}
              </div>
            </div>

            {/* Drama & Pre-Horror Category Rows */}
            {preAdBuckets.map((bucket) => (
              <div key={bucket.category} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-fuchsia-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-display font-bold text-white">
                      {bucket.category}
                    </h3>
                    {bucket.totalCount > 0 && (
                      <span className="font-mono-num text-xs text-zinc-500">
                        ({bucket.totalCount})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(bucket.category)}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {externalLoading && bucket.groups.length === 0 && bucket.externalShows.length === 0 ? (
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`skel-pre-${bucket.category}-${idx}`}
                        className="aspect-[2/3] w-[152px] sm:w-[176px] shrink-0 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                    {bucket.groups.map((group) => (
                      <VerticalPosterCard
                        key={group.seriesId}
                        group={group}
                        scrollable
                        onOpen={setSelectedSeriesId}
                      />
                    ))}
                    {bucket.externalShows.map((show) => (
                      <ExternalCatalogPosterCard
                        key={show.id}
                        show={show}
                        scrollable
                        onSelect={setSelectedExternalShow}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}

            {/* Horror, Romance, Anime & Remaining Genre Rows */}
            {postAdBuckets.map((bucket) => (
              <div key={bucket.category} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-fuchsia-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-display font-bold text-white">
                      {bucket.category}
                    </h3>
                    {bucket.totalCount > 0 && (
                      <span className="font-mono-num text-xs text-zinc-500">
                        ({bucket.totalCount})
                      </span>
                    )}
                  </div>
                  <button
                    type="button"
                    onClick={() => setSelectedCategory(bucket.category)}
                    className="text-xs font-semibold text-amber-300 hover:text-amber-200 inline-flex items-center gap-0.5 cursor-pointer"
                  >
                    <span>See All</span>
                    <ChevronRight className="w-3.5 h-3.5" />
                  </button>
                </div>

                {externalLoading && bucket.groups.length === 0 && bucket.externalShows.length === 0 ? (
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2">
                    {Array.from({ length: 4 }).map((_, idx) => (
                      <div
                        key={`skel-post-${bucket.category}-${idx}`}
                        className="aspect-[2/3] w-[152px] sm:w-[176px] shrink-0 rounded-2xl bg-white/[0.04] border border-white/[0.06] animate-pulse"
                      />
                    ))}
                  </div>
                ) : (
                  <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                    {bucket.groups.map((group) => (
                      <VerticalPosterCard
                        key={group.seriesId}
                        group={group}
                        scrollable
                        onOpen={setSelectedSeriesId}
                      />
                    ))}
                    {bucket.externalShows.map((show) => (
                      <ExternalCatalogPosterCard
                        key={show.id}
                        show={show}
                        scrollable
                        onSelect={setSelectedExternalShow}
                      />
                    ))}
                  </div>
                )}
              </div>
            ))}
          </div>
        ) : (
          <div className="space-y-5">
            {(() => {
              const filteredShorts = TOP_SHORTS_FEATURED.filter(
                (item) => item.genre.toLowerCase() === selectedCategory.toLowerCase()
              );
              if (filteredShorts.length === 0) return null;
              return (
                <div className="space-y-2.5">
                  <div className="flex items-center gap-2 px-1">
                    <Flame className="w-4 h-4 text-amber-400" />
                    <h3 className="text-sm font-display font-bold text-amber-300 uppercase tracking-wider">
                      Featured {selectedCategory} Shorts
                    </h3>
                  </div>
                  <div className="grid grid-cols-2 md:grid-cols-3 lg:grid-cols-4 gap-3 sm:gap-4">
                    {filteredShorts.map((item, idx) => {
                      const isOddTrailingTwoCol =
                        filteredShorts.length % 2 === 1 && idx === filteredShorts.length - 1;
                      return (
                        <FeaturedShortPosterCard
                          key={`cat-${item.id}`}
                          item={item}
                          matchedPosterUrl={featuredPosterByTitle.get(item.title.toLowerCase())}
                          className={
                            isOddTrailingTwoCol
                              ? 'col-span-2 md:col-span-1 aspect-[16/10] md:aspect-[2/3] w-full'
                              : 'aspect-[2/3] w-full'
                          }
                        />
                      );
                    })}
                  </div>
                </div>
              );
            })()}

            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {(activeCategoryBucket?.groups || []).map((group) => (
                <VerticalPosterCard
                  key={group.seriesId}
                  group={group}
                  onOpen={setSelectedSeriesId}
                />
              ))}
              {(activeCategoryBucket?.externalShows || []).map((show) => (
                <ExternalCatalogPosterCard
                  key={show.id}
                  show={show}
                  onSelect={setSelectedExternalShow}
                />
              ))}
            </div>
          </div>
        )}
      </section>

      {/* Episode Selection Modal (Strictly filtered by exact seriesId) */}
      {activeSeriesGroup && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={activeSeriesGroup.seriesName}
          className="fixed inset-0 z-[55] bg-black/80 backdrop-blur-sm flex items-center justify-center px-3.5 py-4 pb-20 sm:p-6 overscroll-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedSeriesId(null);
            }
          }}
        >
          <div
            key={activeSeriesGroup.seriesId}
            className="w-full max-w-2xl max-h-[84dvh] sm:max-h-[82dvh] bg-[#0B0B0F] border border-amber-400/35 rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.92)]"
          >
            <div className="px-4 sm:px-6 py-3.5 sm:py-4 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-[#0D0D13]">
              <div className="min-w-0">
                <p className="text-[11px] sm:text-xs font-mono-num text-amber-300">
                  {activeSeriesGroup.category} · {activeSeriesGroup.episodes.length}{' '}
                  {activeSeriesGroup.episodes.length === 1 ? 'Episode' : 'Episodes'} · Watch &amp; earn +300/+600 Coins
                </p>
                <h2 className="text-base sm:text-xl font-display font-bold text-white truncate">
                  {activeSeriesGroup.seriesName}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedSeriesId(null)}
                aria-label="Close series drawer"
                className="min-h-[42px] min-w-[42px] rounded-xl border border-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white hover:border-amber-400/45 shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            {activeSeriesGroup.episodes.length === 0 ? (
              <div className="p-6 sm:p-8 text-center space-y-2">
                <Film className="w-8 h-8 text-amber-400/60 mx-auto" />
                <p className="text-sm font-semibold text-white">No episodes in this folder yet</p>
                <p className="text-xs text-zinc-400">
                  Open /admin and select &ldquo;{activeSeriesGroup.seriesName}&rdquo; to publish episodes here.
                </p>
              </div>
            ) : (
              <div className="flex-1 min-h-0 overflow-y-auto overflow-x-hidden overscroll-contain scroll-smooth p-3.5 sm:p-5 space-y-3">
                {activeSeriesGroup.episodes.map((episode) => {
                  const rawCover = sanitizePosterUrl(resolveIsolatedEpisodeCover(episode));
                  const epVideo = (episode.videoUrl || episode.youtubeUrl || '').trim();
                  const rawYtFallback = epVideo ? getYouTubeThumbnailUrl(epVideo) || '' : '';
                  const validYtMaxres =
                    rawYtFallback && !containsJjkGojoRef(rawYtFallback)
                      ? sanitizePosterUrl(rawYtFallback)
                      : '';
                  const coverSrc = rawCover || validYtMaxres || activeSeriesGroup.posterUrl;
                  const ytFallback =
                    sanitizePosterUrl(
                      getYouTubeFallbackThumbnailUrl(coverSrc || epVideo) || ''
                    ) ||
                    activeSeriesGroup.fallbackYtThumb ||
                    activeSeriesGroup.posterUrl;
                  const isWatched = watchedEpisodeIdSet.has(episode.id);

                  return (
                    <button
                      key={episode.id}
                      type="button"
                      onClick={() => setActivePlayerEpisode(episode)}
                      className={`w-full text-left group p-3 sm:p-3.5 rounded-xl bg-[#121218] border hover:border-amber-400/45 hover:bg-[#16161E] active:scale-[0.995] flex flex-col sm:flex-row sm:items-center gap-3 sm:gap-4 transition-all cursor-pointer ${
                        isWatched ? 'border-emerald-500/25' : 'border-white/[0.08]'
                      }`}
                    >
                      <div className="relative w-full sm:w-40 aspect-video rounded-lg overflow-hidden bg-[#08080C] border border-white/[0.08] shrink-0">
                        <EpisodeCover
                          key={`${episode.id}::${coverSrc}::${ytFallback}`}
                          src={coverSrc}
                          fallbackSrc={ytFallback}
                          alt={episode.title}
                        />
                        {isWatched && (
                          <span
                            title="Watched"
                            aria-label="Watched"
                            className="absolute top-2 right-2 z-10 inline-flex items-center gap-1 px-1.5 py-0.5 rounded-md bg-black/75 border border-emerald-400/50 text-emerald-300 backdrop-blur-sm shadow-sm"
                          >
                            <Check className="w-3 h-3 stroke-[2.75]" />
                            <span className="text-[10px] font-semibold tracking-tight leading-none">
                              Watched
                            </span>
                          </span>
                        )}
                        <div className="absolute inset-0 bg-black/25 flex items-center justify-center">
                          <span className="w-9 h-9 rounded-full bg-black/70 border border-amber-400/60 flex items-center justify-center text-amber-300">
                            <Play className="w-4 h-4 fill-current ml-0.5" />
                          </span>
                        </div>
                      </div>

                      <div className="flex-1 min-w-0 space-y-1.5">
                        <div className="flex items-center justify-between gap-2 text-xs">
                          <span className="font-mono-num font-semibold text-amber-300 truncate">
                            {episode.episodeLabel}
                          </span>
                          <span className="font-mono-num font-bold text-amber-200 shrink-0">
                            +300 / +600 Coins
                          </span>
                        </div>

                        <h3 className="text-sm sm:text-base font-display font-bold text-white group-hover:text-amber-300 transition-colors line-clamp-1">
                          {episode.title}
                        </h3>

                        <p className="text-xs text-zinc-400 line-clamp-2 leading-relaxed">
                          {episode.synopsis}
                        </p>

                        <div className="pt-1 flex items-center justify-between text-[11px] text-zinc-500">
                          <span className="inline-flex items-center gap-1 font-mono-num">
                            <Clock className="w-3.5 h-3.5 text-amber-400" />
                            {episode.duration}
                          </span>
                          <span className="inline-flex items-center gap-1 font-semibold text-amber-300">
                            <span>Watch Now</span>
                            <ChevronRight className="w-3.5 h-3.5" />
                          </span>
                        </div>
                      </div>
                    </button>
                  );
                })}
              </div>
            )}
          </div>
        </div>
      )}

      {/* External Catalog Show Preview Modal (TVMaze & Jikan API) */}
      {selectedExternalShow && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label={selectedExternalShow.title}
          className="fixed inset-0 z-[56] bg-black/85 backdrop-blur-sm flex items-center justify-center px-3.5 py-4 pb-20 sm:p-6 overscroll-none"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setSelectedExternalShow(null);
            }
          }}
        >
          <div className="w-full max-w-2xl max-h-[86dvh] bg-[#0B0B0F] border border-[#D4AF37]/45 rounded-2xl flex flex-col overflow-hidden shadow-[0_24px_64px_rgba(0,0,0,0.92)]">
            <div className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between gap-3 shrink-0 bg-[#0D0D13]">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-num text-amber-300">
                  {selectedExternalShow.category} · {selectedExternalShow.episodesLabel}
                  {selectedExternalShow.ratingLabel ? ` · ${selectedExternalShow.ratingLabel}` : ''}
                </p>
                <h2 className="text-base sm:text-xl font-display font-bold text-white truncate">
                  {selectedExternalShow.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={() => setSelectedExternalShow(null)}
                aria-label="Close show preview"
                className="min-h-[42px] min-w-[42px] rounded-xl border border-white/[0.12] flex items-center justify-center text-zinc-400 hover:text-white hover:border-amber-400/45 shrink-0 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 min-h-0 overflow-y-auto p-4 sm:p-6 space-y-4">
              {selectedExternalShow.trailerEmbedUrl ? (
                <div className="relative w-full aspect-video rounded-xl overflow-hidden bg-black border border-white/[0.1]">
                  <iframe
                    src={selectedExternalShow.trailerEmbedUrl}
                    title={`${selectedExternalShow.title} Official Trailer`}
                    allow="accelerometer; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
                    allowFullScreen
                    referrerPolicy="strict-origin-when-cross-origin"
                    className="w-full h-full border-0"
                  />
                </div>
              ) : null}

              <div className="flex flex-col sm:flex-row gap-4">
                <div className="w-32 sm:w-36 aspect-[2/3] rounded-xl overflow-hidden border border-white/[0.1] bg-[#121218] shrink-0 mx-auto sm:mx-0">
                  <img
                    src={selectedExternalShow.posterUrl}
                    alt={selectedExternalShow.title}
                    referrerPolicy="no-referrer"
                    className="w-full h-full object-cover"
                  />
                </div>

                <div className="flex-1 min-w-0 space-y-3">
                  <div className="flex flex-wrap gap-1.5">
                    {selectedExternalShow.genres.map((g) => (
                      <span
                        key={g}
                        className="px-2.5 py-0.5 rounded-full bg-amber-400/15 border border-amber-400/35 text-[11px] font-semibold text-amber-200"
                      >
                        {g}
                      </span>
                    ))}
                    <span className="px-2.5 py-0.5 rounded-full bg-white/[0.06] border border-white/10 text-[11px] text-zinc-300">
                      Source: {selectedExternalShow.source === 'jikan' ? 'Jikan' : 'TVMaze'}
                    </span>
                  </div>

                  <p className="text-xs sm:text-sm text-zinc-300 leading-relaxed">
                    {selectedExternalShow.synopsis}
                  </p>
                </div>
              </div>
            </div>

            <div className="px-4 sm:px-6 py-3.5 border-t border-white/[0.08] bg-[#0D0D13] flex items-center justify-end gap-2.5 shrink-0">
              <button
                type="button"
                onClick={() => setSelectedExternalShow(null)}
                className="min-h-[42px] px-4 rounded-xl border border-white/15 text-xs font-semibold text-zinc-300 hover:text-white cursor-pointer"
              >
                Close
              </button>
              <a
                href={selectedExternalShow.watchUrl}
                target="_blank"
                rel="noopener noreferrer"
                className="min-h-[42px] px-5 rounded-xl gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1.5 hover:brightness-105 shadow-[0_6px_20px_rgba(212,175,55,0.35)]"
              >
                <span>Watch Full Series</span>
                <ExternalLink className="w-3.5 h-3.5" />
              </a>
            </div>
          </div>
        </div>
      )}

      {/* Fullscreen Episode Watch Screen */}
      {activePlayerEpisode && (
        <EpisodeWatchScreen
          key={activePlayerEpisode.id}
          episode={
            episodes.find((ep) => ep.id === activePlayerEpisode.id) || activePlayerEpisode
          }
          episodes={episodes}
          referralUserId={referralUserId}
          sponsorAdUrl={sponsorAdUrl}
          playerWeeklyCoins={playerWeeklyCoins}
          playerTotalCoins={playerTotalCoins}
          qualificationThreshold={qualificationThreshold}
          muted={muted}
          resumePlaybackSignal={resumePlaybackSignal}
          hasNextEpisode={Boolean(nextEpisodeForActivePlayer)}
          nextEpisodeLabel={nextEpisodeForActivePlayer?.episodeLabel}
          onNextEpisode={() => {
            if (!nextEpisodeForActivePlayer) return;
            setActivePlayerEpisode(nextEpisodeForActivePlayer);
            if (selectedSeriesId) {
              setSelectedSeriesId(getEpisodeSeriesId(nextEpisodeForActivePlayer));
            }
          }}
          onSelectEpisode={(ep) => {
            setActivePlayerEpisode(ep);
            if (selectedSeriesId) {
              setSelectedSeriesId(getEpisodeSeriesId(ep));
            }
          }}
          onShareEpisode={onShareEpisode}
          onClaimGiftBoxCoins={onClaimGiftBoxCoins}
          onToggleMute={onToggleMute}
          onAwardCoinPot={onAwardCoinPot}
          onStartSponsorReward={onStartSponsorReward}
          onMarkEpisodeWatched={onMarkEpisodeWatched}
          onClose={() => setActivePlayerEpisode(null)}
        />
      )}
    </>
  );
};
