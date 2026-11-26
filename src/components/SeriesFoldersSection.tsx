import React, { useEffect, useMemo, useRef, useState } from 'react';
import {
  Check,
  ChevronLeft,
  ChevronRight,
  Clock,
  Film,
  Layers,
  Lock,
  Play,
  Sparkles,
  Unlock,
  X,
} from 'lucide-react';
import {
  getCanonicalVideoKey,
  getEpisodeSeriesId,
  getYouTubeFallbackThumbnailUrl,
  getYouTubeThumbnailUrl,
  inferEpisodeCategory,
  isLegacyBrokenEpisode,
  isStrayGojoOrAnimeInWrongSeries,
  resolveSponsorLink,
  resolveVideoSource,
  sanitizePosterUrl,
  toSeriesId,
} from '../constants';
import { DramaEpisode, DramaSeries, PlayerPrivate } from '../types';
import {
  MODERN_GENRES,
  ModernGenre,
  ModernShowItem,
  buildModernPlayerEpisode,
  fetchDailymotionShowsByGenre,
  getCachedDailymotionShowsByGenre,
  getModernCatalogByGenre,
} from '../utils/modernCatalog';
import { resolveEpisodeCover } from '../utils/localState';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { EpisodeWatchScreen } from './EpisodeWatchScreen';
import { InstallAppWidget } from './InstallAppWidget';

interface SeriesFoldersSectionProps {
  sections: string[];
  episodes: DramaEpisode[];
  cloudSeries?: DramaSeries[];
  privateState: PlayerPrivate;
  unlockedMovieIds?: string[];
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
  onUnlockArchiveMovie?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onGoToBoost?: () => void;
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

const ModernShowPosterCard: React.FC<{
  show: ModernShowItem;
  isUnlocked: boolean;
  onWatch: (show: ModernShowItem) => void;
}> = ({ show, isUnlocked, onWatch }) => {
  const [imgFailed, setImgFailed] = useState(false);

  useEffect(() => {
    setImgFailed(false);
  }, [show.coverUrl]);

  return (
    <div className="group relative aspect-[2/3] w-full rounded-2xl bg-[#111116] border border-white/[0.12] hover:border-amber-400/70 overflow-hidden transition-all shadow-[0_12px_32px_rgba(0,0,0,0.62)] flex flex-col justify-between">
      {!imgFailed && show.coverUrl ? (
        <img
          src={show.coverUrl}
          alt={show.title}
          loading="lazy"
          referrerPolicy="no-referrer"
          onError={() => setImgFailed(true)}
          className="absolute inset-0 w-full h-full object-cover object-center brightness-105 saturate-115 transition-transform duration-500 group-hover:scale-[1.05]"
        />
      ) : (
        <div className="absolute inset-0 w-full h-full bg-gradient-to-br from-[#231932] via-[#13131b] to-[#08080c] flex items-center justify-center p-4 text-center">
          <span className="text-sm font-display font-bold text-amber-200/80 line-clamp-3">
            {show.title}
          </span>
        </div>
      )}

      {/* Measured Dark Gradient Scrim for Poster Readability */}
      <div className="pointer-events-none absolute inset-0 bg-gradient-to-t from-black/95 via-black/30 to-black/25" />

      {/* Top Badges: Genre + Unlock Status */}
      <div className="relative z-10 p-2.5 flex items-center justify-between gap-1.5">
        <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider text-white shadow-sm">
          {show.genre}
        </span>

        {isUnlocked ? (
          <span className="px-2 py-0.5 rounded-md bg-emerald-950/85 backdrop-blur-md border border-emerald-400/50 text-[10px] font-bold text-emerald-200 inline-flex items-center gap-1 shadow-sm">
            <Unlock className="w-2.5 h-2.5" />
            <span>Unlocked</span>
          </span>
        ) : (
          <span className="px-2 py-0.5 rounded-md bg-black/75 backdrop-blur-md border border-[#D4AF37]/45 font-mono-num text-[10px] font-bold text-[#FCE7A2] inline-flex items-center gap-1 shadow-sm">
            <Lock className="w-2.5 h-2.5 text-[#FBBF24]" />
            <span>3m Free</span>
          </span>
        )}
      </div>

      {/* Bottom Title + Watch CTA */}
      <div className="relative z-10 p-3 space-y-2.5">
        <div className="space-y-1">
          <div className="flex items-center justify-between gap-1.5">
            <span className="text-[10px] font-mono-num font-bold text-amber-300/95">
              {show.episodesLabel}
            </span>
          </div>
          <h3 className="text-[15px] sm:text-base font-display font-extrabold text-white line-clamp-2 leading-snug drop-shadow-[0_2px_8px_rgba(0,0,0,0.95)] group-hover:text-amber-300 transition-colors">
            {show.title}
          </h3>
          <p className="text-[11px] text-zinc-200/85 line-clamp-1">
            {show.tagline}
          </p>
        </div>

        <button
          type="button"
          onClick={() => onWatch(show)}
          className="w-full min-h-[42px] px-3.5 rounded-xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-black inline-flex items-center justify-center gap-1.5 shadow-[0_8px_20px_rgba(212,175,55,0.45)] hover:brightness-105 active:scale-[0.98] cursor-pointer transition"
        >
          <Play className="w-4 h-4 fill-current" />
          <span>Watch</span>
        </button>
      </div>
    </div>
  );
};

export const SeriesFoldersSection: React.FC<SeriesFoldersSectionProps> = ({
  sections,
  episodes,
  cloudSeries = [],
  privateState,
  unlockedMovieIds = [],
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
  onUnlockArchiveMovie,
  onGoToBoost,
}) => {
  const [selectedCategory, setSelectedCategory] = useState<ModernGenre>('All');
  const [selectedSeriesId, setSelectedSeriesId] = useState<string | null>(null);
  const [activePlayerEpisode, setActivePlayerEpisode] = useState<DramaEpisode | null>(null);
  const [heroIndex, setHeroIndex] = useState(0);
  const [dailymotionShows, setDailymotionShows] = useState<ModernShowItem[]>(
    () => getCachedDailymotionShowsByGenre('All') || []
  );
  const heroTouchStartX = useRef<number | null>(null);

  const unlockedSet = useMemo(() => new Set(unlockedMovieIds), [unlockedMovieIds]);

  useEffect(() => {
    const cached = getCachedDailymotionShowsByGenre(selectedCategory);
    if (cached && cached.length > 0) {
      setDailymotionShows(cached);
      return;
    }
    setDailymotionShows([]);
    const controller = new AbortController();
    fetchDailymotionShowsByGenre(selectedCategory, controller.signal)
      .then((items) => {
        if (!controller.signal.aborted) {
          setDailymotionShows(items);
        }
      })
      .catch(() => {
        // Keep featured curated shows visible when offline or rate-limited
      });
    return () => controller.abort();
  }, [selectedCategory]);

  const modernShows = useMemo(
    () => getModernCatalogByGenre(selectedCategory, dailymotionShows),
    [selectedCategory, dailymotionShows]
  );

  const handleWatchModernShow = (show: ModernShowItem) => {
    setActivePlayerEpisode(buildModernPlayerEpisode(show));
  };

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

  // Build deduplicated distinct custom /admin Series folders with genuinely playable episodes
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
      const resolved = resolveVideoSource((ep.videoUrl || ep.youtubeUrl || '').trim());
      if (resolved.kind === 'empty') return;
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

  // Hero Carousel slides: custom /admin series with playable episodes first, or top curated modern shows
  const heroSlides = useMemo(() => {
    const playableGroups = seriesGroups.filter((g) => g.episodes.length > 0);
    if (playableGroups.length > 0) {
      return playableGroups.slice(0, 5).map((series) => ({
        key: series.seriesId,
        label: series.seriesName,
        kind: 'series' as const,
        series,
      }));
    }
    return modernShows.slice(0, 5).map((show) => ({
      key: `hero-modern-${show.id}`,
      label: show.title,
      kind: 'modern' as const,
      show,
    }));
  }, [seriesGroups, modernShows]);

  useEffect(() => {
    if (heroIndex >= heroSlides.length && heroSlides.length > 0) {
      setHeroIndex(0);
    }
  }, [heroIndex, heroSlides.length]);

  useEffect(() => {
    if (heroSlides.length <= 1) return;
    const timer = window.setInterval(() => {
      setHeroIndex((prev) => (prev + 1) % heroSlides.length);
    }, 4000);
    return () => window.clearInterval(timer);
  }, [heroSlides.length]);

  const playableSeriesGroups = useMemo(
    () => seriesGroups.filter((g) => g.episodes.length > 0),
    [seriesGroups]
  );

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

  const nextEpisodeForActivePlayer = useMemo(() => {
    if (!activePlayerEpisode || activePlayerEpisode.archiveIdentifier) return null;
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

  return (
    <>
      <section className="space-y-3">
        {/* 1. Full-Bleed Auto-Sliding Hero Carousel with Touch-Swipe */}
        {heroSlides.length > 0 && activeHero ? (
          <div className="space-y-2">
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
                    key={`hero-${heroIndex}-${activeHero.series.seriesId}-${activeHero.series.posterUrl}`}
                    src={activeHero.series.posterUrl}
                    fallbackSrc={activeHero.series.fallbackYtThumb}
                    alt={activeHero.series.seriesName}
                    className="hero-ken-burns w-full h-full object-cover object-[center_22%] opacity-100 brightness-105 contrast-105 saturate-115"
                  />
                  {/* Dark gradient strictly confined to bottom behind title text */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[36%] bg-gradient-to-t from-black/85 via-black/35 to-transparent" />

                  {/* Bottom-Left Overlay: Genre Pills & Series Title | Bottom-Right: Compact Gold Watch ▶ Pill */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 sm:bottom-4 sm:left-6 sm:right-6 flex items-end justify-between gap-3">
                    <div className="min-w-0 max-w-2xl space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-bold text-white uppercase tracking-wider shadow-sm">
                          {activeHero.series.category}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-white/20 text-[10px] font-mono-num font-semibold text-white shadow-sm">
                          {activeHero.series.episodes.length}{' '}
                          {activeHero.series.episodes.length === 1 ? 'Episode' : 'Episodes'}
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-3xl font-display font-bold text-white line-clamp-2 leading-tight text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                        {activeHero.series.seriesName}
                      </h1>
                    </div>

                    <span className="shrink-0 px-3 py-1.5 rounded-full gold-gradient-bg text-[#181307] text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap shadow-[0_4px_14px_rgba(212,175,55,0.45)] group-hover:brightness-105 transition">
                      <span>Watch</span>
                      <Play className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={() => handleWatchModernShow(activeHero.show)}
                  className="w-full h-full relative text-left block cursor-pointer"
                >
                  <img
                    key={`hero-modern-${heroIndex}-${activeHero.show.id}`}
                    src={activeHero.show.coverUrl}
                    alt={activeHero.show.title}
                    referrerPolicy="no-referrer"
                    className="hero-ken-burns w-full h-full object-cover object-[center_22%] opacity-100 brightness-105 contrast-105 saturate-115"
                  />
                  {/* Dark gradient strictly confined to bottom behind title text */}
                  <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[42%] bg-gradient-to-t from-black/90 via-black/45 to-transparent" />

                  {/* Bottom-Left Overlay: Genre & Preview Status + Title | Bottom-Right: Compact Gold Watch ▶ Pill */}
                  <div className="absolute bottom-3 left-3.5 right-3.5 sm:bottom-4 sm:left-6 sm:right-6 flex items-end justify-between gap-3">
                    <div className="min-w-0 max-w-2xl space-y-1">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="px-2 py-0.5 rounded-full bg-black/75 text-white backdrop-blur-md border border-white/20 text-[10px] font-bold uppercase tracking-wider shadow-sm">
                          {activeHero.show.genre}
                        </span>
                        <span className="px-2 py-0.5 rounded-full bg-black/75 backdrop-blur-md border border-[#D4AF37]/45 text-[10px] font-mono-num font-semibold text-[#FCE7A2] shadow-sm">
                          {unlockedSet.has(activeHero.show.id)
                            ? 'Full Episode Unlocked'
                            : '3m Free · 500 Coins Full'}
                        </span>
                      </div>
                      <h1 className="text-lg sm:text-3xl font-display font-bold text-white line-clamp-2 leading-tight text-balance drop-shadow-[0_2px_10px_rgba(0,0,0,0.95)]">
                        {activeHero.show.title}
                      </h1>
                    </div>

                    <span className="shrink-0 px-3 py-1.5 rounded-full gold-gradient-bg text-[#181307] text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap shadow-[0_6px_20px_rgba(212,175,55,0.45)] group-hover:brightness-105 transition">
                      <span>Watch</span>
                      <Play className="w-3 h-3 fill-current" />
                    </span>
                  </div>
                </button>
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
                          ? 'w-7 bg-gradient-to-r from-[#FCE7A2] via-[#D4AF37] to-[#B58E29] shadow-[0_0_12px_rgba(212,175,55,0.85)]'
                          : 'w-2 bg-white/25 hover:bg-white/45'
                      }`}
                    />
                  );
                })}
              </div>
            )}
          </div>
        ) : null}

        {/* Install DramaWin App (PWA) Widget below Hero Carousel */}
        <InstallAppWidget storageKey="dramawin_install_home_dismissed_v1" />

        {/* 2. Top Genre Filter Pills (All, Horror, Romance, Drama, Anime) */}
        <div
          role="tablist"
          aria-label="Filter shows by genre"
          className="flex items-center gap-2 overflow-x-auto pb-1 no-scrollbar"
        >
          {MODERN_GENRES.map((genre) => {
            const isSelected = selectedCategory === genre;
            return (
              <button
                key={genre}
                type="button"
                role="tab"
                aria-selected={isSelected}
                onClick={() => setSelectedCategory(genre)}
                className={`min-h-[40px] px-4 rounded-full border text-xs font-bold whitespace-nowrap shrink-0 transition-all cursor-pointer inline-flex items-center gap-1.5 ${
                  isSelected
                    ? 'bg-gradient-to-r from-amber-400 to-yellow-500 border-amber-200 text-zinc-950 shadow-[0_0_16px_rgba(251,191,36,0.35)]'
                    : 'bg-white/[0.05] border-white/[0.1] text-zinc-300 hover:text-white hover:border-amber-400/40'
                }`}
              >
                {genre === 'All' && <Layers className="w-3.5 h-3.5" />}
                <span>{genre}</span>
              </button>
            );
          })}
        </div>

        {/* 3. Custom Admin Series + Modern Curated Catalog */}
        <div className="space-y-5">
          {playableSeriesGroups.length > 0 &&
            (selectedCategory === 'All' ||
              playableSeriesGroups.some(
                (g) => g.category.toLowerCase() === selectedCategory.toLowerCase()
              )) && (
              <div className="space-y-2.5">
                <div className="flex items-center gap-2 px-1">
                  <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-fuchsia-500 shrink-0" />
                  <h3 className="text-base sm:text-lg font-display font-bold text-white">
                    DramaWin Originals
                  </h3>
                </div>
                <div className="flex gap-3 sm:gap-4 overflow-x-auto pb-2 snap-x snap-mandatory scroll-smooth">
                  {playableSeriesGroups
                    .filter(
                      (g) =>
                        selectedCategory === 'All' ||
                        g.category.toLowerCase() === selectedCategory.toLowerCase()
                    )
                    .map((group) => (
                      <VerticalPosterCard
                        key={group.seriesId}
                        group={group}
                        scrollable
                        onOpen={setSelectedSeriesId}
                      />
                    ))}
                </div>
              </div>
            )}

          {/* Modern Curated Streaming Catalog */}
          <div className="space-y-3">
            <div className="flex flex-wrap items-center justify-between gap-2 px-1">
              <div className="flex items-center gap-2">
                <span className="w-1.5 h-5 rounded-full bg-gradient-to-b from-amber-300 to-yellow-500 shrink-0" />
                <h2 className="text-base sm:text-lg font-display font-bold text-white">
                  {selectedCategory === 'All'
                    ? 'Featured Dramas, Horror & Anime'
                    : `${selectedCategory} Series & Shorts`}
                </h2>
                <span className="font-mono-num text-xs text-amber-300/90 font-semibold">
                  ({modernShows.length})
                </span>
              </div>
              <span className="text-[11px] font-semibold text-zinc-400">
                First 3m Free · 500 Coins Full Episode
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 gap-3.5 sm:gap-5">
              {modernShows.map((show) => (
                <ModernShowPosterCard
                  key={`${selectedCategory}-${show.id}`}
                  show={show}
                  isUnlocked={unlockedSet.has(show.id)}
                  onWatch={handleWatchModernShow}
                />
              ))}
            </div>
          </div>
        </div>
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

      {/* Fullscreen Episode Watch Screen */}
      {activePlayerEpisode && (
        <EpisodeWatchScreen
          key={activePlayerEpisode.id}
          episode={
            activePlayerEpisode.archiveIdentifier
              ? activePlayerEpisode
              : episodes.find((ep) => ep.id === activePlayerEpisode.id) || activePlayerEpisode
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
          isArchiveLocked={Boolean(
            activePlayerEpisode.archiveIdentifier &&
              !unlockedSet.has(activePlayerEpisode.archiveIdentifier)
          )}
          onUnlockArchiveMovie={onUnlockArchiveMovie}
          onGoToBoost={onGoToBoost}
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
