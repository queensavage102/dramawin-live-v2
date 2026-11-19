import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Bookmark,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Film,
  Layers,
  Play,
  Share2,
  Sparkles,
  Volume2,
  VolumeX,
  X,
} from 'lucide-react';
import {
  COIN_POT_BASE_REWARD,
  COIN_POT_CYCLE_SECONDS,
  DEFAULT_SPONSOR_URL,
  DEFAULT_VIDEO_START_SECONDS,
  getEpisodeSeriesId,
  getYouTubeEmbedUrl,
  inferEpisodeCategory,
  isYouTubeDomainOnly,
  normalizeEpisodeStartSeconds,
  sanitizeMediaUrl,
} from '../constants';
import { DramaEpisode, PlayerPrivate } from '../types';
import { resolveEpisodeCover } from '../utils/localState';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { DoubleRewardModal } from './DoubleRewardModal';
import { EpisodeWatchScreen } from './EpisodeWatchScreen';

interface ForYouTabProps {
  episodes: DramaEpisode[];
  privateState: PlayerPrivate;
  sponsorAdUrl?: string;
  myListSeriesIds: string[];
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  onToggleMute: () => void;
  onToggleMyList: (seriesId: string, seriesName: string) => void;
  onShareEpisode: (episode: DramaEpisode) => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
  onSwitchToHome: () => void;
}

const isDirectVideoMediaUrl = (url: string): boolean => {
  if (!url) return false;
  if (url.startsWith('idb://') || url.startsWith('blob:') || url.startsWith('data:video')) {
    return true;
  }
  return /\.(mp4|webm|ogg|mov|m4v|m3u8)(\?|#|$)/i.test(url);
};

function postYouTubeCommand(
  iframe: HTMLIFrameElement | null,
  func: string,
  args: unknown[] = []
) {
  try {
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ event: 'command', func, args }),
      '*'
    );
  } catch {
    // Ignore cross-origin postMessage restrictions
  }
}

export const ForYouTab: React.FC<ForYouTabProps> = ({
  episodes,
  privateState,
  sponsorAdUrl,
  myListSeriesIds,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal,
  onToggleMute,
  onToggleMyList,
  onShareEpisode,
  onAwardCoinPot,
  onStartSponsorReward,
  onMarkEpisodeWatched,
  onSwitchToHome,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [ringProgress, setRingProgress] = useState(0);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [drawerSeriesId, setDrawerSeriesId] = useState<string | null>(null);
  const [fullScreenEpisode, setFullScreenEpisode] = useState<DramaEpisode | null>(null);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const elapsedMsRef = useRef(0);
  const isPlayingRef = useRef(true);
  const rewardModalOpenRef = useRef(false);
  const onAwardRef = useRef(onAwardCoinPot);

  useEffect(() => {
    onAwardRef.current = onAwardCoinPot;
  }, [onAwardCoinPot]);

  useEffect(() => {
    if (activeIndex >= episodes.length && episodes.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, episodes.length]);

  const currentEpisode = episodes[activeIndex] || null;
  const currentSeriesId = currentEpisode ? getEpisodeSeriesId(currentEpisode) : '';
  const isSavedInMyList = currentSeriesId ? myListSeriesIds.includes(currentSeriesId) : false;

  const rawVideoUrl = currentEpisode
    ? sanitizeMediaUrl((currentEpisode.videoUrl || currentEpisode.youtubeUrl || '').trim())
    : '';
  const startSeconds = currentEpisode
    ? normalizeEpisodeStartSeconds(currentEpisode.startTime)
    : DEFAULT_VIDEO_START_SECONDS;
  const embedUrl = rawVideoUrl ? getYouTubeEmbedUrl(rawVideoUrl, startSeconds) : null;
  const bareYouTubeDomain = rawVideoUrl ? isYouTubeDomainOnly(rawVideoUrl) : false;
  const resolvedMediaUrl = useResolvedMediaUrl(embedUrl || bareYouTubeDomain ? '' : rawVideoUrl);

  const fallbackCoverUrl = useResolvedMediaUrl(
    currentEpisode ? resolveEpisodeCover(currentEpisode) : ''
  );

  useEffect(() => {
    setIsPlaying(true);
    isPlayingRef.current = true;
    setRewardModalOpen(false);
    rewardModalOpenRef.current = false;
    elapsedMsRef.current = 0;
    setRingProgress(0);
  }, [currentEpisode?.id]);

  useEffect(() => {
    isPlayingRef.current = isPlaying;
    if (embedUrl || (resolvedMediaUrl && !isDirectVideoMediaUrl(resolvedMediaUrl))) {
      postYouTubeCommand(iframeRef.current, isPlaying ? 'playVideo' : 'pauseVideo');
    }
    if (videoRef.current) {
      if (isPlaying) {
        void videoRef.current.play().catch(() => {});
      } else {
        videoRef.current.pause();
      }
    }
  }, [isPlaying, embedUrl, resolvedMediaUrl]);

  useEffect(() => {
    if (embedUrl || (resolvedMediaUrl && !isDirectVideoMediaUrl(resolvedMediaUrl))) {
      postYouTubeCommand(iframeRef.current, muted ? 'mute' : 'unMute');
      if (!muted) {
        postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
      }
    }
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = 1;
    }
  }, [muted, embedUrl, resolvedMediaUrl, currentEpisode?.id]);

  useEffect(() => {
    if (!embedUrl && !resolvedMediaUrl) return;
    const handleMessage = (event: MessageEvent) => {
      if (
        typeof event.origin === 'string' &&
        !event.origin.includes('youtube.com') &&
        !event.origin.includes('youtube-nocookie.com')
      ) {
        return;
      }
      let payload: { event?: string; info?: unknown } | null = null;
      if (typeof event.data === 'string') {
        try {
          payload = JSON.parse(event.data) as { event?: string; info?: unknown };
        } catch {
          return;
        }
      } else if (event.data && typeof event.data === 'object') {
        payload = event.data as { event?: string; info?: unknown };
      }
      if (!payload) return;

      const playerState =
        typeof payload.info === 'number'
          ? payload.info
          : payload.info &&
              typeof payload.info === 'object' &&
              typeof (payload.info as { playerState?: unknown }).playerState === 'number'
            ? (payload.info as { playerState: number }).playerState
            : null;

      if (playerState === 1 && !rewardModalOpenRef.current && !fullScreenEpisode) {
        setIsPlaying(true);
        isPlayingRef.current = true;
      } else if (playerState === 2) {
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else if (playerState === 0 && currentEpisode) {
        void onMarkEpisodeWatched?.(currentEpisode);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [embedUrl, resolvedMediaUrl, currentEpisode, onMarkEpisodeWatched, fullScreenEpisode]);

  // Smooth circular Coin Progress Ring timer
  useEffect(() => {
    if (!currentEpisode) return;
    const cycleMs = COIN_POT_CYCLE_SECONDS * 1000;
    let lastTick = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (
        document.visibilityState !== 'visible' ||
        !isPlayingRef.current ||
        rewardModalOpenRef.current ||
        Boolean(fullScreenEpisode) ||
        Boolean(drawerSeriesId)
      ) {
        return;
      }

      elapsedMsRef.current += delta;
      const pct = Math.min(100, (elapsedMsRef.current / cycleMs) * 100);
      setRingProgress(pct);

      if (pct >= 100 && !rewardModalOpenRef.current) {
        rewardModalOpenRef.current = true;
        setRewardModalOpen(true);
        setIsPlaying(false);
        isPlayingRef.current = false;
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [currentEpisode?.id, fullScreenEpisode, drawerSeriesId]);

  const handleTogglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handlePrev = useCallback(() => {
    if (episodes.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + episodes.length) % episodes.length);
  }, [episodes.length]);

  const handleNext = useCallback(() => {
    if (episodes.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % episodes.length);
  }, [episodes.length]);

  const handleClaimReward = async (amount: number) => {
    if (!currentEpisode) return;
    try {
      await onAwardRef.current(currentEpisode, amount);
    } finally {
      elapsedMsRef.current = 0;
      setRingProgress(0);
      setRewardModalOpen(false);
      rewardModalOpenRef.current = false;
      setIsPlaying(true);
      isPlayingRef.current = true;
    }
  };

  const drawerEpisodes = useMemo(() => {
    if (!drawerSeriesId) return [];
    const seen = new Set<string>();
    return episodes
      .filter((ep) => {
        if (!ep?.id || seen.has(ep.id)) return false;
        if (getEpisodeSeriesId(ep) !== drawerSeriesId) return false;
        seen.add(ep.id);
        return true;
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
  }, [drawerSeriesId, episodes]);

  const watchedIdSet = useMemo(() => {
    const set = new Set<string>();
    (privateState.watchedEpisodeIds || []).forEach((entry) => {
      const idx = entry.indexOf('::');
      set.add(idx >= 0 ? entry.slice(0, idx) : entry);
    });
    return set;
  }, [privateState.watchedEpisodeIds]);

  const ringSize = 62;
  const strokeWidth = 4;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringProgress / 100);

  if (!currentEpisode) {
    return (
      <section className="max-w-lg mx-auto my-8 rounded-3xl bg-[#111116] border border-white/[0.08] p-8 text-center space-y-4">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/20 to-fuchsia-500/20 border border-amber-400/35 mx-auto flex items-center justify-center">
          <Film className="w-7 h-7 text-amber-300" />
        </div>
        <div className="space-y-1.5">
          <h2 className="text-xl font-display font-bold text-white">For You Feed Ready</h2>
          <p className="text-xs text-zinc-400">
            Publish drama episodes inside /admin to unlock the vertical short-drama stream.
          </p>
        </div>
        <button
          type="button"
          onClick={onSwitchToHome}
          className="min-h-[44px] px-5 rounded-xl bg-gradient-to-r from-amber-400 to-yellow-500 text-zinc-950 font-bold text-xs cursor-pointer"
        >
          Explore Home
        </button>
      </section>
    );
  }

  const category = inferEpisodeCategory(
    currentEpisode.series,
    currentEpisode.title,
    currentEpisode.category
  );

  return (
    <>
      <section
        aria-label="For You Vertical Drama Player"
        onTouchStart={(e) => {
          touchStartYRef.current = e.touches[0]?.clientY ?? null;
        }}
        onTouchEnd={(e) => {
          const startY = touchStartYRef.current;
          touchStartYRef.current = null;
          if (startY === null) return;
          const endY = e.changedTouches[0]?.clientY ?? startY;
          const diff = startY - endY;
          if (diff > 55) handleNext();
          else if (diff < -55) handlePrev();
        }}
        className="fixed inset-0 z-[35] h-screen h-[100dvh] w-full overflow-hidden bg-black select-none"
      >
        {/* Background fallback poster */}
        {fallbackCoverUrl && (
          <img
            src={fallbackCoverUrl}
            alt=""
            aria-hidden="true"
            className="absolute inset-0 w-full h-full object-cover opacity-30 blur-md scale-110 pointer-events-none"
          />
        )}

        {/* Video Frame Layer — pointer-events-none blocks youtube.com taps completely */}
        <div className="absolute inset-0 w-full h-full bg-black overflow-hidden">
          {embedUrl ? (
            <iframe
              ref={iframeRef}
              key={`fy-${currentEpisode.id}-${embedUrl}`}
              src={embedUrl}
              title={currentEpisode.title}
              onLoad={() => {
                try {
                  iframeRef.current?.contentWindow?.postMessage(
                    '{"event":"listening","id":"dramawin-foryou-player"}',
                    '*'
                  );
                  if (muted) {
                    postYouTubeCommand(iframeRef.current, 'mute');
                  } else {
                    postYouTubeCommand(iframeRef.current, 'unMute');
                    postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
                  }
                  if (!isPlaying) postYouTubeCommand(iframeRef.current, 'pauseVideo');
                } catch {
                  // Ignore cross-origin postMessage restrictions
                }
              }}
              referrerPolicy="strict-origin-when-cross-origin"
              allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share"
              className="pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100%,177.78dvh)] h-[max(100dvh,56.25vw)] border-0 block"
            />
          ) : resolvedMediaUrl &&
            (isDirectVideoMediaUrl(rawVideoUrl) || isDirectVideoMediaUrl(resolvedMediaUrl)) ? (
            <video
              ref={videoRef}
              key={`fy-vid-${currentEpisode.id}-${resolvedMediaUrl}`}
              src={resolvedMediaUrl}
              autoPlay
              loop
              muted={muted}
              playsInline
              onLoadedMetadata={(e) => {
                e.currentTarget.muted = muted;
                e.currentTarget.volume = 1;
              }}
              onPlay={(e) => {
                e.currentTarget.muted = muted;
                e.currentTarget.volume = 1;
                setIsPlaying(true);
              }}
              onPause={() => setIsPlaying(false)}
              className="pointer-events-none w-full h-full object-cover"
            />
          ) : (
            <div className="flex flex-col items-center justify-center p-6 text-center gap-3">
              <Film className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-zinc-400">Video ready in /admin</p>
            </div>
          )}
        </div>

        {/* Transparent Interactive Tap Shield (Play/Pause without touching YouTube) */}
        <button
          type="button"
          onClick={handleTogglePlayPause}
          aria-label={isPlaying ? 'Pause episode' : 'Play episode'}
          className="absolute inset-0 z-10 w-full h-full bg-transparent cursor-pointer flex items-center justify-center focus:outline-none"
        >
          {!isPlaying && (
            <span className="w-16 h-16 rounded-full bg-black/70 backdrop-blur-md border border-amber-400/50 text-amber-300 flex items-center justify-center shadow-[0_0_28px_rgba(0,0,0,0.8)]">
              <Play className="w-7 h-7 fill-current ml-1" />
            </span>
          )}
        </button>

        {/* Solid Top & Subtle Bottom Legibility Gradients (hides YouTube title overlay) */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 top-0 h-28 bg-gradient-to-b from-[#09090b] via-[#09090b]/95 to-transparent z-10"
        />
        <div
          aria-hidden="true"
          className="pointer-events-none absolute inset-x-0 bottom-0 h-56 bg-gradient-to-t from-black/95 via-black/65 to-transparent z-10"
        />

        {/* Top Bar Inside Player: Feed Tag + Prev/Next + Sound Toggle */}
        <div className="absolute top-0 inset-x-0 z-20 bg-gradient-to-b from-[#09090b] via-[#09090b]/95 to-transparent px-3 pt-3 pb-6 flex items-center justify-between gap-2">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-black/55 backdrop-blur-md border border-white/15 px-3 py-1 text-[11px] font-semibold text-white">
            <Sparkles className="w-3.5 h-3.5 text-amber-300" />
            <span>For You</span>
            <span className="text-zinc-400 font-mono-num">
              {activeIndex + 1}/{episodes.length}
            </span>
          </div>

          <div className="flex items-center gap-1.5">
            {episodes.length > 1 && (
              <>
                <button
                  type="button"
                  onClick={handlePrev}
                  aria-label="Previous episode"
                  className="min-w-[38px] min-h-[38px] rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:border-amber-400/50 cursor-pointer"
                >
                  <ChevronUp className="w-4 h-4" />
                </button>
                <button
                  type="button"
                  onClick={handleNext}
                  aria-label="Next episode"
                  className="min-w-[38px] min-h-[38px] rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:border-amber-400/50 cursor-pointer"
                >
                  <ChevronDown className="w-4 h-4" />
                </button>
              </>
            )}

            <button
              type="button"
              onClick={onToggleMute}
              aria-label={muted ? 'Unmute video' : 'Mute video'}
              className="min-w-[38px] min-h-[38px] rounded-full bg-black/55 backdrop-blur-md border border-white/15 text-white flex items-center justify-center hover:border-amber-400/50 cursor-pointer"
            >
              {muted ? (
                <VolumeX className="w-4 h-4 text-zinc-400" />
              ) : (
                <Volume2 className="w-4 h-4 text-amber-300" />
              )}
            </button>
          </div>
        </div>

        {/* Right Edge Action Column: Floating Circular Coin Progress Ring + My List + Share + Series */}
        <div className="absolute right-3 bottom-24 z-20 flex flex-col items-center gap-3.5">
          {/* Circular Coin Progress Ring */}
          <div className="flex flex-col items-center gap-1">
            <div className="relative w-[62px] h-[62px] rounded-full bg-black/75 backdrop-blur-md border border-amber-400/40 shadow-[0_0_24px_rgba(251,191,36,0.45)] flex items-center justify-center">
              <svg
                width={ringSize}
                height={ringSize}
                viewBox={`0 0 ${ringSize} ${ringSize}`}
                className="-rotate-90 absolute inset-0"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="fy-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FEF08A" />
                    <stop offset="50%" stopColor="#FBBF24" />
                    <stop offset="100%" stopColor="#E879F9" />
                  </linearGradient>
                </defs>
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.16)"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={ringSize / 2}
                  cy={ringSize / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#fy-ring-grad)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-150 ease-linear"
                />
              </svg>
              <div className="flex flex-col items-center justify-center">
                <Coins className="w-5 h-5 text-amber-300" />
                <span className="font-mono-num text-[9px] font-extrabold text-amber-200 leading-none mt-0.5">
                  +{COIN_POT_BASE_REWARD}
                </span>
              </div>
            </div>
            <span className="px-2 py-0.5 rounded-full bg-black/75 text-[9px] font-bold text-amber-200 border border-white/10">
              {isPlaying ? `${Math.round(ringProgress)}%` : 'Paused'}
            </span>
          </div>

          {/* My List */}
          <button
            type="button"
            onClick={() => onToggleMyList(currentSeriesId, currentEpisode.series)}
            className="min-w-[44px] min-h-[44px] flex flex-col items-center gap-1 text-white cursor-pointer group"
          >
            <span
              className={`w-11 h-11 rounded-full backdrop-blur-md border flex items-center justify-center transition-all ${
                isSavedInMyList
                  ? 'bg-amber-400 text-zinc-950 border-amber-200 shadow-[0_0_16px_rgba(251,191,36,0.65)]'
                  : 'bg-black/55 border-white/15 text-white group-hover:border-amber-400/50'
              }`}
            >
              <Bookmark className={`w-5 h-5 ${isSavedInMyList ? 'fill-current' : ''}`} />
            </span>
            <span className="text-[10px] font-semibold text-zinc-200 drop-shadow">
              {isSavedInMyList ? 'Saved' : 'My List'}
            </span>
          </button>

          {/* Share */}
          <button
            type="button"
            onClick={() => onShareEpisode(currentEpisode)}
            className="min-w-[44px] min-h-[44px] flex flex-col items-center gap-1 text-white cursor-pointer group"
          >
            <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:border-amber-400/50 transition-all">
              <Share2 className="w-5 h-5" />
            </span>
            <span className="text-[10px] font-semibold text-zinc-200 drop-shadow">Share</span>
          </button>

          {/* Series */}
          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setDrawerSeriesId(currentSeriesId);
            }}
            className="min-w-[44px] min-h-[44px] flex flex-col items-center gap-1 text-white cursor-pointer group"
          >
            <span className="w-11 h-11 rounded-full bg-black/55 backdrop-blur-md border border-white/15 flex items-center justify-center group-hover:border-amber-400/50 transition-all">
              <Layers className="w-5 h-5 text-fuchsia-300" />
            </span>
            <span className="text-[10px] font-semibold text-zinc-200 drop-shadow">Series</span>
          </button>
        </div>

        {/* Bottom Episode Info & Watch Full Series Pill CTA */}
        <div className="absolute left-3.5 right-20 bottom-20 z-20 space-y-2.5">
          <div className="space-y-1">
            <div className="flex flex-wrap items-center gap-1.5">
              <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/40 text-[10px] font-bold text-amber-300">
                {category}
              </span>
              <span className="px-2 py-0.5 rounded-full bg-white/10 text-[10px] font-mono-num font-semibold text-zinc-200">
                {currentEpisode.episodeLabel}
              </span>
            </div>
            <h2 className="text-base font-display font-bold text-white leading-tight line-clamp-1 drop-shadow">
              {currentEpisode.series}
            </h2>
            <p className="text-xs text-zinc-300 line-clamp-2 leading-snug drop-shadow">
              {currentEpisode.title} — {currentEpisode.synopsis}
            </p>
          </div>

          <button
            type="button"
            onClick={() => {
              setIsPlaying(false);
              setDrawerSeriesId(currentSeriesId);
            }}
            className="min-h-[44px] px-4 rounded-full bg-gradient-to-r from-amber-400 via-yellow-400 to-fuchsia-500 text-zinc-950 font-extrabold text-xs inline-flex items-center gap-2 shadow-[0_4px_20px_rgba(251,191,36,0.45)] hover:brightness-110 active:scale-[0.98] transition-all cursor-pointer"
          >
            <Play className="w-3.5 h-3.5 fill-current" />
            <span>Watch Full Series</span>
          </button>
        </div>
      </section>

      {/* Series Episodes Drawer from For You */}
      {drawerSeriesId && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Series Episodes"
          onClick={(e) => {
            if (e.target === e.currentTarget) {
              setDrawerSeriesId(null);
            }
          }}
          className="fixed inset-0 z-[70] bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-0 sm:p-6 pb-16 sm:pb-6"
        >
          <div className="w-full max-w-lg max-h-[75dvh] bg-[#0d0d12] border border-white/[0.12] rounded-t-3xl sm:rounded-3xl flex flex-col overflow-hidden shadow-2xl">
            <div className="px-5 py-4 border-b border-white/[0.08] flex items-center justify-between gap-3">
              <div className="min-w-0">
                <p className="text-[11px] font-mono-num text-amber-300">
                  {drawerEpisodes.length} {drawerEpisodes.length === 1 ? 'Episode' : 'Episodes'}
                </p>
                <h3 className="text-base font-display font-bold text-white truncate">
                  {drawerEpisodes[0]?.series || currentEpisode.series}
                </h3>
              </div>
              <button
                type="button"
                onClick={() => setDrawerSeriesId(null)}
                aria-label="Close episodes list"
                className="min-w-[40px] min-h-[40px] rounded-xl bg-white/[0.06] flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex-1 overflow-y-auto p-4 space-y-2.5">
              {drawerEpisodes.map((ep) => {
                const isCurrent = ep.id === currentEpisode.id;
                const isWatched = watchedIdSet.has(ep.id);
                return (
                  <button
                    key={ep.id}
                    type="button"
                    onClick={() => {
                      setDrawerSeriesId(null);
                      setFullScreenEpisode(ep);
                    }}
                    className={`w-full text-left p-3.5 rounded-2xl border flex items-center justify-between gap-3 transition-all cursor-pointer ${
                      isCurrent
                        ? 'bg-amber-400/12 border-amber-400/50'
                        : 'bg-white/[0.03] border-white/[0.08] hover:border-amber-400/35'
                    }`}
                  >
                    <div className="min-w-0 space-y-0.5">
                      <div className="flex items-center gap-2">
                        <span className="font-mono-num text-xs font-bold text-amber-300">
                          {ep.episodeLabel}
                        </span>
                        {isWatched && (
                          <span className="inline-flex items-center gap-0.5 text-[10px] font-semibold text-emerald-300">
                            <Check className="w-3 h-3" /> Watched
                          </span>
                        )}
                      </div>
                      <p className="text-sm font-semibold text-white truncate">{ep.title}</p>
                    </div>
                    <span className="w-9 h-9 rounded-full bg-amber-400 text-zinc-950 flex items-center justify-center shrink-0">
                      <Play className="w-4 h-4 fill-current ml-0.5" />
                    </span>
                  </button>
                );
              })}
            </div>
          </div>
        </div>
      )}

      {/* Congratulations! Double-Reward Modal */}
      <DoubleRewardModal
        open={rewardModalOpen}
        baseCoins={COIN_POT_BASE_REWARD}
        sponsorUrl={currentEpisode.sponsorUrl || sponsorAdUrl || DEFAULT_SPONSOR_URL}
        episodeTitle={`${currentEpisode.series} — ${currentEpisode.episodeLabel}`}
        onStartSponsorTimer={() => onStartSponsorReward?.()}
        onClaimDouble={() => handleClaimReward(COIN_POT_BASE_REWARD * 2)}
        onClaimBase={() => handleClaimReward(COIN_POT_BASE_REWARD)}
      />

      {/* Fullscreen Watch Screen launched from "Watch Full Series" */}
      {fullScreenEpisode && (
        <EpisodeWatchScreen
          key={fullScreenEpisode.id}
          episode={fullScreenEpisode}
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
          onClose={() => setFullScreenEpisode(null)}
        />
      )}
    </>
  );
};
