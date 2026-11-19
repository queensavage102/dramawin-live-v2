import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Coins,
  Film,
  Flame,
  Layers,
  Play,
  Sparkles,
  X,
} from 'lucide-react';
import {
  DEFAULT_SPONSOR_URL,
  DRAMA_CATEGORIES,
  getCanonicalVideoKey,
  getEpisodeSeriesId,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  isStrayGojoOrAnimeInWrongSeries,
  sanitizeMediaUrl,
  toSeriesId,
} from '../constants';
import { DramaEpisode, DramaSeries, PlayerPrivate } from '../types';
import { resolveEpisodeCover } from '../utils/localState';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { EpisodeWatchScreen } from './EpisodeWatchScreen';
import { InstallAppWidget } from './InstallAppWidget';

interface SeriesFoldersSectionProps {
  sections: string[];
  episodes: DramaEpisode[];
  cloudSeries?: DramaSeries[];
  privateState: PlayerPrivate;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onClaimHeroBonus?: () => Promise<void>;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
}

interface SeriesFolderGroup {
  seriesId: string;
  seriesName: string;
  category: string;
  coverImage: string;
  fallbackYtThumb: string;
  synopsis: string;
  episodes: DramaEpisode[];
  isNew: boolean;
}

function containsJjkGojoRef(value?: string): boolean {
  const text = (value || '').toLowerCase();
  return (
    text.includes('gojo') ||
    text.includes('jujutsu') ||
    text.includes('jjk') ||
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
  const cleanSrc = sanitizeMediaUrl(src);
  const cleanFallback = sanitizeMediaUrl(fallbackSrc);
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
      <div className="w-full h-full bg-gradient-to-br from-[#1f1629] via-[#13121a] to-[#09090b] flex flex-col items-center justify-center gap-2 p-4 text-center">
        <Film className="w-7 h-7 text-amber-400/70" />
        <span className="text-xs text-zinc-400 line-clamp-2">{alt}</span>
      </div>
    );
  }

  return (
    <img
      key={activeSrc}
      src={activeSrc}
      alt={alt}
      referrerPolicy="no-referrer"
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
      className={`group text-left rounded-2xl bg-[#111116] border border-white/[0.08] hover:border-amber-400/50 overflow-hidden transition-all active:scale-[0.98] flex flex-col cursor-pointer ${
        scrollable
          ? 'w-[152px] sm:w-[176px] shrink-0 snap-start'
          : 'w-full'
      }`}
    >
      {/* Crisp 2:3 Vertical Movie Poster */}
      <div className="relative aspect-[2/3] w-full overflow-hidden bg-[#09090b]">
        <EpisodeCover
          key={`${group.seriesId}::${group.coverImage}::${group.fallbackYtThumb}`}
          src={group.coverImage}
          fallbackSrc={group.fallbackYtThumb}
          alt={group.seriesName}
        />
        <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-black/20 to-transparent" />

        {/* Top Badges: NEW + Episode Count */}
        <div className="absolute top-2 left-2 right-2 flex items-center justify-between gap-1">
          {group.isNew ? (
            <span className="px-2 py-0.5 rounded-md bg-gradient-to-r from-fuchsia-500 to-amber-400 text-zinc-950 font-black text-[9px] tracking-wider uppercase shadow">
              NEW
            </span>
          ) : (
            <span className="px-2 py-0.5 rounded-md bg-black/70 backdrop-blur-sm border border-white/15 text-[10px] font-semibold text-zinc-200">
              {group.category}
            </span>
          )}
          <span className="px-1.5 py-0.5 rounded-md bg-black/75 backdrop-blur-sm border border-amber-400/35 font-mono-num text-[10px] font-bold text-amber-200">
            {group.episodes.length} {group.episodes.length === 1 ? 'Ep' : 'Eps'}
          </span>
        </div>

        {/* Bottom Poster Pill: Earn up to... */}
        <div className="absolute bottom-2 left-2 right-2 flex items-center justify-between gap-1">
          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-amber-400/45 text-[10px] font-bold text-amber-300 shadow-[0_0_12px_rgba(251,191,36,0.3)] truncate">
            <Coins className="w-3 h-3 shrink-0" />
            <span className="truncate">Earn up to +600</span>
          </span>
        </div>
      </div>

      {/* Poster Caption */}
      <div className="p-2.5 sm:p-3 space-y-1 flex-1 flex flex-col justify-between">
        <h3 className="text-xs sm:text-sm font-display font-bold text-white line-clamp-2 leading-snug group-hover:text-amber-300 transition-colors">
          {group.seriesName}
        </h3>
        <div className="flex items-center justify-between gap-1.5 text-[10px] text-zinc-400">
          <span className="px-1.5 py-0.5 rounded bg-white/[0.06] text-zinc-300 font-medium truncate">
            {group.category}
          </span>
          <span className="inline-flex items-center gap-0.5 text-amber-300 font-semibold shrink-0">
            <Play className="w-2.5 h-2.5 fill-current" />
            <span>Watch</span>
          </span>
        </div>
      </div>
    </button>
  );
};

export const SeriesFoldersSection: React.FC<SeriesFoldersSectionProps> = ({
  sections,
  episodes,
  cloudSeries = [],
  privateState,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal,
  onToggleMute,
  onAwardCoinPot,
  onStartSponsorReward,
  onClaimHeroBonus,
  onMarkEpisodeWatched,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<string>('All');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [activePlayerEpisode, setActivePlayerEpisode] = useState<DramaEpisode | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const heroTouchStartX = useRef<number | null>(null);

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
      const cloudCover =
        cloudMeta?.coverImage && cloudMeta.coverImage !== 'none' && !containsJjkGojoRef(cloudMeta.coverImage)
          ? sanitizeMediaUrl(cloudMeta.coverImage)
          : '';
      const leadThumb =
        filteredEps.map((ep) => resolveIsolatedEpisodeCover(ep)).find(Boolean) || cloudCover || '';
      const firstVideoUrl = filteredEps
        .map((ep) => (ep.videoUrl || ep.youtubeUrl || '').trim())
        .find(Boolean);
      const rawYtThumb = firstVideoUrl ? getYouTubeThumbnailUrl(firstVideoUrl) || '' : '';
      const fallbackYtThumb = containsJjkGojoRef(rawYtThumb) ? '' : rawYtThumb;

      return {
        seriesId,
        seriesName: displayName,
        category,
        coverImage: leadThumb,
        fallbackYtThumb,
        synopsis:
          lead?.synopsis || cloudMeta?.synopsis || `${displayName} short-drama collection.`,
        episodes: filteredEps,
        isNew: idx < 4 || filteredEps.length === 0,
      };
    });
  }, [sections, episodes, cloudSeries]);

  // Hero Carousel slides (up to 5 featured series; prefer series with episodes/artwork first)
  const heroSlides = useMemo(() => {
    const withMedia = seriesGroups.filter(
      (g) => g.episodes.length > 0 || Boolean(g.coverImage || g.fallbackYtThumb)
    );
    return (withMedia.length > 0 ? withMedia : seriesGroups).slice(0, 5);
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

  // Group series into ordered genre buckets (Drama, Horror, Anime, Comedy, ...)
  const categoryBuckets = useMemo(() => {
    const map = new Map<string, SeriesFolderGroup[]>();
    seriesGroups.forEach((group) => {
      const cat = group.category || 'Drama';
      const list = map.get(cat) || [];
      list.push(group);
      map.set(cat, list);
    });

    const knownOrder: string[] = [...DRAMA_CATEGORIES];
    const sortedKeys = Array.from(map.keys()).sort((a, b) => {
      const idxA = knownOrder.indexOf(a);
      const idxB = knownOrder.indexOf(b);
      if (idxA !== -1 && idxB !== -1) return idxA - idxB;
      if (idxA !== -1) return -1;
      if (idxB !== -1) return 1;
      return a.localeCompare(b);
    });

    return sortedKeys.map((category) => ({
      category,
      groups: map.get(category) || [],
    }));
  }, [seriesGroups]);

  useEffect(() => {
    if (
      selectedCategory !== 'All' &&
      !categoryBuckets.some((bucket) => bucket.category === selectedCategory)
    ) {
      setSelectedCategory('All');
    }
  }, [categoryBuckets, selectedCategory]);

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

  const isModalOpen = Boolean(activeSeriesGroup || activePlayerEpisode);
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
    if (!activeSeriesGroup || activePlayerEpisode) return;
    const onKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setSelectedSeriesId(null);
      }
    };
    window.addEventListener('keydown', onKeyDown);
    return () => window.removeEventListener('keydown', onKeyDown);
  }, [activeSeriesGroup, activePlayerEpisode]);

  const activeCategoryBucket = useMemo(
    () => categoryBuckets.find((b) => b.category === selectedCategory) || null,
    [categoryBuckets, selectedCategory]
  );

  const activeHero = heroSlides[heroIndex] || null;
  const horrorBucketIndex = categoryBuckets.findIndex(
    (b) => b.category.toLowerCase() === 'horror'
  );

  // Split category buckets into Drama/pre-Horror rows and Horror+ rows
  const preAdBuckets =
    horrorBucketIndex >= 0
      ? categoryBuckets.slice(0, horrorBucketIndex)
      : categoryBuckets.slice(0, 1);
  const postAdBuckets =
    horrorBucketIndex >= 0
      ? categoryBuckets.slice(horrorBucketIndex)
      : categoryBuckets.slice(1);

  return (
    <>
      <section className="space-y-6">
        {/* 1. Full-Bleed Auto-Sliding Hero Carousel with Touch-Swipe */}
        {heroSlides.length > 0 && activeHero ? (
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
              className="relative w-full aspect-[16/10] sm:aspect-[21/9] rounded-2xl overflow-hidden border border-white/[0.1] bg-[#111116] shadow-[0_16px_48px_rgba(0,0,0,0.7)] group"
            >
              <button
                type="button"
                onClick={() => setSelectedSeriesId(activeHero.seriesId)}
                className="w-full h-full relative text-left cursor-pointer block"
              >
                <EpisodeCover
                  key={`hero-${activeHero.seriesId}-${activeHero.coverImage}`}
                  src={activeHero.coverImage}
                  fallbackSrc={activeHero.fallbackYtThumb}
                  alt={activeHero.seriesName}
                  className="w-full h-full object-cover transition-transform duration-500 group-hover:scale-[1.03]"
                />
                <div className="absolute inset-0 bg-gradient-to-t from-[#09090b] via-[#09090b]/40 to-transparent" />
                <div className="absolute inset-0 bg-gradient-to-r from-[#09090b]/85 via-transparent to-transparent" />

                {/* Bottom-Left Overlay: Genre Pills & Series Title */}
                <div className="absolute bottom-3.5 left-3.5 right-3.5 sm:bottom-5 sm:left-6 sm:right-6 flex items-end justify-between gap-3">
                  <div className="min-w-0 space-y-1.5">
                    <div className="flex flex-wrap items-center gap-1.5">
                      <span className="px-2.5 py-0.5 rounded-full bg-fuchsia-500/25 backdrop-blur-md border border-fuchsia-400/40 text-[10px] font-bold text-fuchsia-200 uppercase tracking-wider">
                        {activeHero.category}
                      </span>
                      <span className="px-2.5 py-0.5 rounded-full bg-white/10 backdrop-blur-md border border-white/15 text-[10px] font-mono-num font-semibold text-zinc-200">
                        {activeHero.episodes.length}{' '}
                        {activeHero.episodes.length === 1 ? 'Episode' : 'Episodes'}
                      </span>
                    </div>
                    <h1 className="text-xl sm:text-3xl font-display font-bold text-white truncate drop-shadow">
                      {activeHero.seriesName}
                    </h1>
                    <p className="text-xs text-zinc-300 line-clamp-1 max-w-xl hidden sm:block">
                      {activeHero.synopsis}
                    </p>
                  </div>

                  <span className="shrink-0 min-h-[40px] px-3.5 rounded-full bg-white/15 backdrop-blur-md border border-white/25 text-white text-xs font-bold inline-flex items-center gap-1.5 group-hover:bg-amber-400 group-hover:text-zinc-950 group-hover:border-amber-300 transition-colors">
                    <Play className="w-3.5 h-3.5 fill-current" />
                    <span>Watch Now</span>
                  </span>
                </div>
              </button>

              {/* Floating Right Reward Button (Opens Sponsor Ad + Claims Bonus Coins without opening player) */}
              <button
                type="button"
                onClick={(e) => {
                  e.preventDefault();
                  e.stopPropagation();
                  window.open(DEFAULT_SPONSOR_URL, '_blank');
                  onStartSponsorReward?.();
                  if (onClaimHeroBonus) {
                    void onClaimHeroBonus();
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
                    className="hidden sm:flex absolute left-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white items-center justify-center hover:border-amber-400/50 cursor-pointer"
                  >
                    <ChevronLeft className="w-4 h-4" />
                  </button>
                  <button
                    type="button"
                    onClick={() => setHeroIndex((prev) => (prev + 1) % heroSlides.length)}
                    aria-label="Next featured series"
                    className="hidden sm:flex absolute right-3 top-1/2 -translate-y-1/2 w-9 h-9 rounded-full bg-black/60 backdrop-blur-md border border-white/15 text-white items-center justify-center hover:border-amber-400/50 cursor-pointer"
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
                      key={slide.seriesId}
                      type="button"
                      onClick={() => setHeroIndex(idx)}
                      aria-label={`Slide ${idx + 1}: ${slide.seriesName}`}
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
        ) : (
          <div className="rounded-2xl bg-[#111116] border border-white/[0.08] p-8 text-center space-y-2">
            <Film className="w-8 h-8 text-amber-400/70 mx-auto" />
            <p className="text-sm font-semibold text-white">No series published yet</p>
            <p className="text-xs text-zinc-400">
              Open /admin to create series and publish episodes.
            </p>
          </div>
        )}

        {/* Install DramaWin App (PWA) Widget below Hero Carousel */}
        <InstallAppWidget storageKey="dramawin_install_home_dismissed_v1" />

        {/* 2. Genre Filter Pills */}
        {seriesGroups.length > 0 && (
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
                  <span className="font-mono-num text-[10px] opacity-75">
                    ({bucket.groups.length})
                  </span>
                </button>
              );
            })}
          </div>
        )}

        {/* 3. "Top Shorts" Vertical 2:3 Poster Row + Inline Ad + Genre Sections */}
        {seriesGroups.length > 0 && selectedCategory === 'All' ? (
          <div className="space-y-6">
            {/* Top Shorts Shelf */}
            <div className="space-y-3">
              <div className="flex items-center justify-between gap-2 px-1">
                <div className="flex items-center gap-2">
                  <Flame className="w-5 h-5 text-amber-400" />
                  <h2 className="text-lg sm:text-xl font-display font-bold text-white">
                    Top Shorts
                  </h2>
                </div>
                <span className="text-[11px] font-mono-num text-amber-300 font-semibold">
                  2:3 Posters · Earn Coins
                </span>
              </div>

              <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                {seriesGroups.map((group) => (
                  <VerticalPosterCard
                    key={`top-${group.seriesId}`}
                    group={group}
                    scrollable
                    onOpen={setSelectedSeriesId}
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
                    <span className="font-mono-num text-xs text-zinc-500">
                      ({bucket.groups.length})
                    </span>
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

                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                  {bucket.groups.map((group) => (
                    <VerticalPosterCard
                      key={group.seriesId}
                      group={group}
                      scrollable
                      onOpen={setSelectedSeriesId}
                    />
                  ))}
                </div>
              </div>
            ))}

            {/* Horror & Remaining Genre Rows */}
            {postAdBuckets.map((bucket) => (
              <div key={bucket.category} className="space-y-3">
                <div className="flex items-center justify-between gap-2 px-1">
                  <div className="flex items-center gap-2">
                    <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-fuchsia-500 shrink-0" />
                    <h3 className="text-base sm:text-lg font-display font-bold text-white">
                      {bucket.category}
                    </h3>
                    <span className="font-mono-num text-xs text-zinc-500">
                      ({bucket.groups.length})
                    </span>
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

                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                  {bucket.groups.map((group) => (
                    <VerticalPosterCard
                      key={group.seriesId}
                      group={group}
                      scrollable
                      onOpen={setSelectedSeriesId}
                    />
                  ))}
                </div>
              </div>
            ))}
          </div>
        ) : seriesGroups.length > 0 ? (
          <div className="space-y-5">
            <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-3 sm:gap-4">
              {(activeCategoryBucket?.groups || []).map((group) => (
                <VerticalPosterCard
                  key={group.seriesId}
                  group={group}
                  onOpen={setSelectedSeriesId}
                />
              ))}
            </div>
          </div>
        ) : null}
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
                  const coverSrc = resolveIsolatedEpisodeCover(episode);
                  const epVideo = (episode.videoUrl || episode.youtubeUrl || '').trim();
                  const rawYtFallback = epVideo ? getYouTubeThumbnailUrl(epVideo) || '' : '';
                  const ytFallback = containsJjkGojoRef(rawYtFallback) ? '' : rawYtFallback;
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

      {/* Fullscreen Episode Watch Screen */}
      {activePlayerEpisode && (
        <EpisodeWatchScreen
          key={activePlayerEpisode.id}
          episode={
            episodes.find((ep) => ep.id === activePlayerEpisode.id) || activePlayerEpisode
          }
          sponsorAdUrl={sponsorAdUrl}
          playerWeeklyCoins={playerWeeklyCoins}
          playerTotalCoins={playerTotalCoins}
          qualificationThreshold={qualificationThreshold}
          muted={muted}
          resumePlaybackSignal={resumePlaybackSignal}
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
