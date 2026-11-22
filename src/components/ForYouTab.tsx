import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Coins,
  Film,
  Maximize2,
  Minimize2,
  Play,
  RotateCcw,
  Scan,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
  X,
  ZoomIn,
} from 'lucide-react';
import {
  COIN_POT_BASE_REWARD,
  COIN_POT_CYCLE_SECONDS,
  DEFAULT_SPONSOR_URL,
  resolveVideoSource,
  sanitizeMediaUrl,
} from '../constants';
import { DramaEpisode, PlayerPrivate } from '../types';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { BottomAdBanner } from './BottomAdBanner';
import { DoubleRewardModal } from './DoubleRewardModal';
import { IsolatedHtml5Video, IsolatedYouTubeIframe } from './IsolatedYouTubeIframe';
import { RealisticGoldCoin } from './RealisticGoldCoin';

const FORYOU_YOUTUBE_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';
const FORYOU_IFRAME_FIT_CLASS =
  'pointer-events-none absolute inset-0 w-full h-full border-0 block bg-[#060608] transition-all duration-300 ease-out';
const FORYOU_IFRAME_ZOOM_CLASS =
  'pointer-events-none absolute left-1/2 top-1/2 -translate-x-1/2 -translate-y-1/2 w-[max(100cqw,177.78cqh)] h-[max(100cqh,56.25cqw)] border-0 block bg-[#060608] transition-all duration-300 ease-out';
const FORYOU_VIDEO_FIT_CLASS =
  'pointer-events-none w-full h-full object-contain bg-[#060608] transition-all duration-300 ease-out';
const FORYOU_VIDEO_ZOOM_CLASS =
  'pointer-events-none w-full h-full object-cover bg-[#060608] transition-all duration-300 ease-out';

interface ForYouTabProps {
  episodes: DramaEpisode[];
  privateState: PlayerPrivate;
  referralUserId: string;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  onToggleMute: () => void;
  onShareEpisode: (episode: DramaEpisode) => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onClaimGiftBoxCoins?: () => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
  onSwitchToHome: () => void;
}

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

function postDailymotionCommand(
  iframe: HTMLIFrameElement | null,
  command: string,
  parameters: unknown[] = []
) {
  try {
    iframe?.contentWindow?.postMessage(
      JSON.stringify({ command, parameters }),
      '*'
    );
  } catch {
    // Ignore cross-origin postMessage restrictions
  }
}

function postVimeoCommand(
  iframe: HTMLIFrameElement | null,
  method: string,
  value?: unknown
) {
  try {
    const payload = value === undefined ? { method } : { method, value };
    iframe?.contentWindow?.postMessage(JSON.stringify(payload), '*');
  } catch {
    // Ignore cross-origin postMessage restrictions
  }
}

export const ForYouTab: React.FC<ForYouTabProps> = ({
  episodes,
  sponsorAdUrl,
  playerWeeklyCoins,
  qualificationThreshold,
  muted,
  onToggleMute,
  onAwardCoinPot,
  onStartSponsorReward,
  onMarkEpisodeWatched,
  onSwitchToHome,
}) => {
  const [activeIndex, setActiveIndex] = useState(0);
  const [isPlaying, setIsPlaying] = useState(true);
  const [isZoomed, setIsZoomed] = useState(false);
  const [isExpandedFull, setIsExpandedFull] = useState(false);
  const [ringProgress, setRingProgress] = useState(0);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [flyingBurst, setFlyingBurst] = useState<{ id: number; amount: number } | null>(null);

  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const [isStalledOver5s, setIsStalledOver5s] = useState(false);

  const playerContainerRef = useRef<HTMLElement | null>(null);
  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const touchStartYRef = useRef<number | null>(null);
  const elapsedMsRef = useRef(0);
  const isPlayingRef = useRef(true);
  const rewardModalOpenRef = useRef(false);
  const onAwardRef = useRef(onAwardCoinPot);
  const stallTimerRef = useRef<number | null>(null);
  const stallPillTimerRef = useRef<number | null>(null);
  const retryDelayTimerRef = useRef<number | null>(null);
  const savedTimeRef = useRef<number>(0);
  const lastProgressTimeRef = useRef<number>(-1);

  useEffect(() => {
    onAwardRef.current = onAwardCoinPot;
  }, [onAwardCoinPot]);

  useEffect(() => {
    const handleFullscreenChange = () => {
      if (!document.fullscreenElement) {
        setIsExpandedFull(false);
        try {
          const orientation = screen.orientation as ScreenOrientation & {
            unlock?: () => void;
          };
          orientation?.unlock?.();
        } catch {
          // Ignore unsupported orientation unlock
        }
      }
    };

    document.addEventListener('fullscreenchange', handleFullscreenChange);
    return () => {
      document.removeEventListener('fullscreenchange', handleFullscreenChange);
    };
  }, []);

  const clearStallPill = useCallback(() => {
    if (stallPillTimerRef.current !== null) {
      window.clearTimeout(stallPillTimerRef.current);
      stallPillTimerRef.current = null;
    }
    setIsStalledOver5s(false);
  }, []);

  const scheduleStallPill = useCallback(() => {
    if (!isPlayingRef.current || rewardModalOpenRef.current) return;
    if (stallPillTimerRef.current !== null) return;
    stallPillTimerRef.current = window.setTimeout(() => {
      stallPillTimerRef.current = null;
      if (isPlayingRef.current && !rewardModalOpenRef.current) {
        setIsStalledOver5s(true);
      }
    }, 5200);
  }, []);

  const clearRecoveryTimers = useCallback(() => {
    if (stallTimerRef.current !== null) {
      window.clearTimeout(stallTimerRef.current);
      stallTimerRef.current = null;
    }
    if (retryDelayTimerRef.current !== null) {
      window.clearTimeout(retryDelayTimerRef.current);
      retryDelayTimerRef.current = null;
    }
  }, []);

  const triggerAutoRecover = useCallback(
    (isDirect: boolean) => {
      if (!isPlayingRef.current || rewardModalOpenRef.current) return;
      if (stallTimerRef.current !== null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
      if (retryDelayTimerRef.current !== null) return;

      if (isDirect && videoRef.current && Number.isFinite(videoRef.current.currentTime)) {
        savedTimeRef.current = videoRef.current.currentTime;
      }

      setRetryCount((prev) => {
        if (prev >= 3) {
          setIsRecovering(false);
          setRecoveryFailed(true);
          setIsStalledOver5s(true);
          return prev;
        }
        setIsRecovering(true);
        setRecoveryFailed(false);
        scheduleStallPill();
        retryDelayTimerRef.current = window.setTimeout(() => {
          retryDelayTimerRef.current = null;
          if (isDirect && videoRef.current) {
            try {
              videoRef.current.load();
              void videoRef.current.play().catch(() => {});
            } catch {
              // Remount handles fallback
            }
          }
        }, 900);
        return prev + 1;
      });
    },
    [scheduleStallPill]
  );

  useEffect(() => {
    if (activeIndex >= episodes.length && episodes.length > 0) {
      setActiveIndex(0);
    }
  }, [activeIndex, episodes.length]);

  const currentEpisode = episodes[activeIndex] || null;

  const rawVideoUrl = currentEpisode
    ? sanitizeMediaUrl((currentEpisode.videoUrl || currentEpisode.youtubeUrl || '').trim())
    : '';
  const customStartSeconds =
    currentEpisode && typeof currentEpisode.startTime === 'number' && Number.isFinite(currentEpisode.startTime)
      ? Math.max(0, Math.floor(currentEpisode.startTime))
      : 0;

  const videoSource = useMemo(
    () =>
      rawVideoUrl
        ? resolveVideoSource(rawVideoUrl, {
            startSeconds: customStartSeconds,
            muted: false,
            autoplay: true,
          })
        : { kind: 'empty' as const, url: '', rawUrl: '' },
    [rawVideoUrl, customStartSeconds]
  );

  const resolvedMediaUrl = useResolvedMediaUrl(
    videoSource.kind === 'direct' ? videoSource.url : ''
  );

  useEffect(() => {
    clearRecoveryTimers();
    clearStallPill();
    savedTimeRef.current = 0;
    lastProgressTimeRef.current = -1;
    setRetryCount(0);
    setIsRecovering(false);
    setRecoveryFailed(false);
    setIsPlaying(true);
    isPlayingRef.current = true;
    setRewardModalOpen(false);
    rewardModalOpenRef.current = false;
    elapsedMsRef.current = 0;
    setRingProgress(0);
    setIsZoomed(true);
    return () => {
      clearRecoveryTimers();
      clearStallPill();
    };
  }, [currentEpisode?.id, clearRecoveryTimers, clearStallPill]);

  useEffect(() => {
    if (!isPlaying || rewardModalOpen || videoSource.kind === 'empty') {
      clearStallPill();
      return;
    }
    scheduleStallPill();
    return () => {
      if (stallPillTimerRef.current !== null) {
        window.clearTimeout(stallPillTimerRef.current);
        stallPillTimerRef.current = null;
      }
    };
  }, [
    currentEpisode?.id,
    videoSource.kind,
    resolvedMediaUrl,
    isPlaying,
    rewardModalOpen,
    scheduleStallPill,
    clearStallPill,
  ]);

  const currentEpisodeRef = useRef(currentEpisode);
  useEffect(() => {
    currentEpisodeRef.current = currentEpisode;
  }, [currentEpisode]);

  const prevIsPlayingRef = useRef(true);
  const mutedRef = useRef(muted);
  const sourceKindRef = useRef(videoSource.kind);

  useEffect(() => {
    mutedRef.current = muted;
  }, [muted]);

  useEffect(() => {
    sourceKindRef.current = videoSource.kind;
  }, [videoSource.kind]);

  const handleIframeLoad = useCallback(() => {
    setIsRecovering(false);
    clearStallPill();
    try {
      if (sourceKindRef.current === 'youtube') {
        iframeRef.current?.contentWindow?.postMessage(
          '{"event":"listening","id":"dramawin-foryou-player"}',
          '*'
        );
        if (mutedRef.current) {
          postYouTubeCommand(iframeRef.current, 'mute');
        } else {
          postYouTubeCommand(iframeRef.current, 'unMute');
          postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
        }
        if (!isPlayingRef.current) {
          postYouTubeCommand(iframeRef.current, 'pauseVideo');
        }
      } else if (sourceKindRef.current === 'dailymotion') {
        postDailymotionCommand(iframeRef.current, 'muted', [mutedRef.current]);
        if (!isPlayingRef.current) {
          postDailymotionCommand(iframeRef.current, 'pause');
        }
      } else if (sourceKindRef.current === 'vimeo') {
        postVimeoCommand(iframeRef.current, 'setMuted', mutedRef.current);
        postVimeoCommand(iframeRef.current, 'setVolume', mutedRef.current ? 0 : 1);
        if (!isPlayingRef.current) {
          postVimeoCommand(iframeRef.current, 'pause');
        }
      }
    } catch {
      // Ignore cross-origin postMessage restrictions
    }
  }, [clearStallPill]);

  const handleVideoLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
    e.currentTarget.muted = mutedRef.current;
    e.currentTarget.volume = 1;
    if (savedTimeRef.current > 1 && Number.isFinite(e.currentTarget.duration)) {
      const targetTime = Math.min(savedTimeRef.current, Math.max(0, e.currentTarget.duration - 1));
      try {
        e.currentTarget.currentTime = targetTime;
      } catch {
        // Ignore seek errors before readyState
      }
    }
  }, []);

  const handleVideoCanPlay = useCallback(() => {
    clearRecoveryTimers();
    clearStallPill();
    setIsRecovering(false);
    setRecoveryFailed(false);
  }, [clearRecoveryTimers, clearStallPill]);

  const handleVideoPlaying = useCallback(() => {
    clearRecoveryTimers();
    clearStallPill();
    setIsRecovering(false);
    setRecoveryFailed(false);
    setIsPlaying(true);
  }, [clearRecoveryTimers, clearStallPill]);

  const handleVideoPlay = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      e.currentTarget.muted = mutedRef.current;
      e.currentTarget.volume = 1;
      if (
        savedTimeRef.current > 1 &&
        e.currentTarget.currentTime < 0.5 &&
        Number.isFinite(e.currentTarget.duration)
      ) {
        try {
          e.currentTarget.currentTime = Math.min(
            savedTimeRef.current,
            Math.max(0, e.currentTarget.duration - 0.5)
          );
        } catch {
          // Ignore seek errors
        }
      }
      clearRecoveryTimers();
      clearStallPill();
      setIsRecovering(false);
      setRecoveryFailed(false);
      setIsPlaying(true);
    },
    [clearRecoveryTimers, clearStallPill]
  );

  const handleVideoTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      const nowTime = e.currentTarget.currentTime;
      if (nowTime > 0) {
        savedTimeRef.current = nowTime;
      }
      if (nowTime > 0 && Math.abs(nowTime - lastProgressTimeRef.current) > 0.05) {
        lastProgressTimeRef.current = nowTime;
        clearStallPill();
        if (stallTimerRef.current !== null) {
          clearRecoveryTimers();
          setIsRecovering(false);
        }
      }
    },
    [clearRecoveryTimers, clearStallPill]
  );

  const handleVideoWaitingOrStalled = useCallback(() => {
    if (isPlayingRef.current) {
      scheduleStallPill();
      if (stallTimerRef.current === null) {
        stallTimerRef.current = window.setTimeout(() => {
          stallTimerRef.current = null;
          triggerAutoRecover(true);
        }, 4500);
      }
    }
  }, [triggerAutoRecover, scheduleStallPill]);

  const handleVideoError = useCallback(() => {
    setIsPlaying(false);
    scheduleStallPill();
    triggerAutoRecover(true);
  }, [triggerAutoRecover, scheduleStallPill]);

  const handleVideoPause = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (e.currentTarget.currentTime > 0) {
        savedTimeRef.current = e.currentTarget.currentTime;
      }
      clearRecoveryTimers();
      clearStallPill();
      setIsPlaying(false);
    },
    [clearRecoveryTimers, clearStallPill]
  );

  useEffect(() => {
    const saveDirectTimestamp = () => {
      if (videoRef.current && Number.isFinite(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
        savedTimeRef.current = videoRef.current.currentTime;
      }
    };
    const handleVisibility = () => {
      if (document.visibilityState === 'hidden') {
        saveDirectTimestamp();
      }
    };
    document.addEventListener('visibilitychange', handleVisibility);
    return () => document.removeEventListener('visibilitychange', handleVisibility);
  }, []);

  useEffect(() => {
    const wasPlaying = prevIsPlayingRef.current;
    prevIsPlayingRef.current = isPlaying;
    isPlayingRef.current = isPlaying;

    if (videoSource.kind === 'youtube') {
      if (isPlaying && !wasPlaying && savedTimeRef.current > 0.5) {
        postYouTubeCommand(iframeRef.current, 'seekTo', [savedTimeRef.current, true]);
      }
      postYouTubeCommand(iframeRef.current, isPlaying ? 'playVideo' : 'pauseVideo');
    } else if (videoSource.kind === 'dailymotion') {
      postDailymotionCommand(iframeRef.current, isPlaying ? 'play' : 'pause');
    } else if (videoSource.kind === 'vimeo') {
      postVimeoCommand(iframeRef.current, isPlaying ? 'play' : 'pause');
    }

    if (videoRef.current) {
      if (isPlaying) {
        if (
          savedTimeRef.current > 0.5 &&
          Math.abs(videoRef.current.currentTime - savedTimeRef.current) > 0.75
        ) {
          const maxTime = Number.isFinite(videoRef.current.duration)
            ? Math.max(0, videoRef.current.duration - 0.5)
            : savedTimeRef.current;
          try {
            videoRef.current.currentTime = Math.min(savedTimeRef.current, maxTime);
          } catch {
            // Ignore seek error before readyState
          }
        }
        void videoRef.current.play().catch((err: unknown) => {
          if (err instanceof DOMException && err.name === 'NotAllowedError' && videoRef.current) {
            videoRef.current.muted = true;
            void videoRef.current.play().catch(() => {});
          }
        });
      } else {
        if (Number.isFinite(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
          savedTimeRef.current = videoRef.current.currentTime;
        }
        videoRef.current.pause();
        clearRecoveryTimers();
        clearStallPill();
      }
    }
  }, [isPlaying, videoSource.kind, resolvedMediaUrl, retryCount, clearRecoveryTimers, clearStallPill]);

  useEffect(() => {
    if (videoSource.kind === 'youtube') {
      postYouTubeCommand(iframeRef.current, muted ? 'mute' : 'unMute');
      if (!muted) {
        postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
      }
    } else if (videoSource.kind === 'dailymotion') {
      postDailymotionCommand(iframeRef.current, 'muted', [muted]);
    } else if (videoSource.kind === 'vimeo') {
      postVimeoCommand(iframeRef.current, 'setMuted', muted);
      postVimeoCommand(iframeRef.current, 'setVolume', muted ? 0 : 1);
    }
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = 1;
    }
  }, [muted, videoSource.kind, resolvedMediaUrl, currentEpisode?.id]);

  useEffect(() => {
    if (videoSource.kind !== 'youtube') return;
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

      if (payload.event === 'onError') {
        scheduleStallPill();
        triggerAutoRecover(false);
        return;
      }

      if (
        payload.info &&
        typeof payload.info === 'object' &&
        typeof (payload.info as { currentTime?: unknown }).currentTime === 'number'
      ) {
        const ytTime = (payload.info as { currentTime: number }).currentTime;
        if (Number.isFinite(ytTime) && ytTime > 0) {
          savedTimeRef.current = ytTime;
        }
      }

      const playerState =
        typeof payload.info === 'number'
          ? payload.info
          : payload.info &&
              typeof payload.info === 'object' &&
              typeof (payload.info as { playerState?: unknown }).playerState === 'number'
            ? (payload.info as { playerState: number }).playerState
            : null;

      if (playerState === 1 && !rewardModalOpenRef.current) {
        clearRecoveryTimers();
        clearStallPill();
        setIsRecovering(false);
        setRecoveryFailed(false);
        setIsPlaying(true);
        isPlayingRef.current = true;
      } else if (playerState === 2) {
        clearRecoveryTimers();
        clearStallPill();
        setIsPlaying(false);
        isPlayingRef.current = false;
      } else if (playerState === 3) {
        if (isPlayingRef.current) {
          scheduleStallPill();
          if (stallTimerRef.current === null) {
            stallTimerRef.current = window.setTimeout(() => {
              stallTimerRef.current = null;
              postYouTubeCommand(iframeRef.current, 'playVideo');
              triggerAutoRecover(false);
            }, 7500);
          }
        }
      } else if (playerState === 0 && currentEpisode) {
        clearRecoveryTimers();
        clearStallPill();
        void onMarkEpisodeWatched?.(currentEpisode);
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [
    videoSource.kind,
    resolvedMediaUrl,
    currentEpisode,
    onMarkEpisodeWatched,
    triggerAutoRecover,
    clearRecoveryTimers,
    clearStallPill,
    scheduleStallPill,
  ]);

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
        rewardModalOpenRef.current
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
  }, [currentEpisode?.id]);

  const handleTogglePlayPause = useCallback(() => {
    setIsPlaying((prev) => !prev);
  }, []);

  const handleToggleFullscreen = async () => {
    const nextState = !isExpandedFull;
    setIsExpandedFull(nextState);
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        lock?: (orientation: string) => Promise<void>;
        unlock?: () => void;
      };

      if (nextState) {
        if (playerContainerRef.current?.requestFullscreen) {
          await playerContainerRef.current.requestFullscreen();
        }
        if (orientation?.lock) {
          await orientation.lock('landscape').catch(() => {});
        }
      } else {
        orientation?.unlock?.();
        if (document.fullscreenElement) {
          await document.exitFullscreen();
        }
      }
    } catch {
      // CSS full-screen fallback remains active
    }
  };

  const handlePrev = useCallback(() => {
    if (episodes.length <= 1) return;
    setActiveIndex((prev) => (prev - 1 + episodes.length) % episodes.length);
  }, [episodes.length]);

  const handleNext = useCallback(() => {
    if (episodes.length <= 1) return;
    setActiveIndex((prev) => (prev + 1) % episodes.length);
  }, [episodes.length]);

  const handleAwardDoubleCoinsOnly = async (amount: number) => {
    if (!currentEpisode) return;
    await onAwardRef.current(currentEpisode, amount);
    const burstId = Date.now();
    setFlyingBurst({ id: burstId, amount });
    window.setTimeout(() => {
      setFlyingBurst((curr) => (curr?.id === burstId ? null : curr));
    }, 1250);
  };

  const handleContinueAfterAd = () => {
    elapsedMsRef.current = 0;
    setRingProgress(0);
    setRewardModalOpen(false);
    rewardModalOpenRef.current = false;
    setIsPlaying(true);
    isPlayingRef.current = true;
  };

  const handleClaimReward = async (amount: number) => {
    if (!currentEpisode) return;
    try {
      await onAwardRef.current(currentEpisode, amount);
      const burstId = Date.now();
      setFlyingBurst({ id: burstId, amount });
      window.setTimeout(() => {
        setFlyingBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 1250);
    } finally {
      handleContinueAfterAd();
    }
  };

  const ringSize = 54;
  const strokeWidth = 3.5;
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

  const safeThreshold = Math.max(500000, qualificationThreshold || 500000);
  const weeklyPct = Math.min(100, Math.max(0, (playerWeeklyCoins / safeThreshold) * 100));
  const isQualified = playerWeeklyCoins >= safeThreshold;

  return (
    <>
      <section
        ref={playerContainerRef}
        aria-label="For You Drama Player"
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
        className={`fixed inset-0 h-screen h-[100dvh] w-full overflow-hidden bg-[#060608] select-none flex flex-col ${
          isExpandedFull ? 'z-[75]' : 'z-[35]'
        }`}
      >
        {/* 1. True Full-Screen Edge-to-Edge Video Stage with Floating Translucent DramaWin HUD */}
        <div className="relative flex-1 min-h-0 w-full bg-[#060608] overflow-hidden [container-type:size]">
          {/* Video Frame Layer */}
          {videoSource.kind === 'youtube' ||
          videoSource.kind === 'dailymotion' ||
          videoSource.kind === 'vimeo' ||
          videoSource.kind === 'odysee' ||
          videoSource.kind === 'iframe' ? (
            <IsolatedYouTubeIframe
              iframeRef={iframeRef}
              iframeKey={`fy-${currentEpisode.id}-${videoSource.url}-r${retryCount}`}
              src={videoSource.url}
              title={currentEpisode.title}
              onLoad={handleIframeLoad}
              referrerPolicy="strict-origin-when-cross-origin"
              allow={FORYOU_YOUTUBE_ALLOW}
              allowFullScreen
              className={isZoomed ? FORYOU_IFRAME_ZOOM_CLASS : FORYOU_IFRAME_FIT_CLASS}
            />
          ) : videoSource.kind === 'direct' && resolvedMediaUrl ? (
            <IsolatedHtml5Video
              videoRef={videoRef}
              videoKey={`fy-vid-${currentEpisode.id}-${resolvedMediaUrl}-r${retryCount}`}
              src={resolvedMediaUrl}
              autoPlay
              loop={false}
              muted={muted}
              onLoadedMetadata={handleVideoLoadedMetadata}
              onCanPlay={handleVideoCanPlay}
              onPlaying={handleVideoPlaying}
              onPlay={handleVideoPlay}
              onTimeUpdate={handleVideoTimeUpdate}
              onWaiting={handleVideoWaitingOrStalled}
              onStalled={handleVideoWaitingOrStalled}
              onError={handleVideoError}
              onPause={handleVideoPause}
              onEnded={() => {
                if (currentEpisode) void onMarkEpisodeWatched?.(currentEpisode);
              }}
              className={isZoomed ? FORYOU_VIDEO_ZOOM_CLASS : FORYOU_VIDEO_FIT_CLASS}
            />
          ) : (
            <div className="w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3 bg-[#060608]">
              <Film className="w-10 h-10 text-amber-400" />
              <p className="text-xs text-zinc-400">Video ready in /admin</p>
            </div>
          )}

          {(isRecovering || recoveryFailed) && (
            <div className="pointer-events-none absolute inset-0 z-20 flex items-center justify-center p-4">
              {recoveryFailed ? (
                <button
                  type="button"
                  onClick={() => {
                    clearRecoveryTimers();
                    setRecoveryFailed(false);
                    setIsRecovering(true);
                    setIsPlaying(true);
                    isPlayingRef.current = true;
                    setRetryCount((prev) => prev + 1);
                  }}
                  className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/85 border border-amber-400/70 text-amber-200 text-xs font-bold shadow-2xl cursor-pointer"
                >
                  <RotateCcw className="w-4 h-4 text-amber-300" />
                  <span>Stream stalled — Tap to Retry</span>
                </button>
              ) : (
                <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-black/75 border border-amber-400/40 text-amber-200 text-xs font-semibold backdrop-blur-md">
                  <RotateCcw className="w-3.5 h-3.5 animate-spin text-amber-300" />
                  <span>Reconnecting video...</span>
                </div>
              )}
            </div>
          )}

          {/* Center Play/Pause Tap Shield */}
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

          {/* 2. Floating Translucent DramaWin Header, Controls, Tournament Bar, Reload & Gold Coin Pot (+300) */}
          <div className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/88 via-black/58 to-transparent px-3 sm:px-5 pt-[max(0.5rem,env(safe-area-inset-top))] pb-6 space-y-2">
            {/* Row 1: Series & Episode Title + Close ✕ */}
            <div className="pointer-events-auto flex items-center justify-between gap-2">
              <h1 className="text-sm sm:text-base font-display font-extrabold uppercase tracking-wide text-[#FFF8E7] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] truncate">
                {currentEpisode.series} · {currentEpisode.episodeLabel}
              </h1>
              <button
                type="button"
                onClick={() => {
                  if (document.fullscreenElement) {
                    void document.exitFullscreen().catch(() => {});
                  }
                  onSwitchToHome();
                }}
                aria-label="Close For You player"
                className="min-h-[38px] min-w-[38px] rounded-full bg-black/60 backdrop-blur-md border border-[#D4AF37]/50 flex items-center justify-center text-[#FCE7A2] hover:border-[#FBBF24] cursor-pointer shrink-0 transition"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Row 2: Speaker, Fit / Zoom, Fullscreen, and Next Episode ⏭ */}
            <div className="pointer-events-auto flex items-center justify-between gap-2">
              <div className="flex items-center gap-1.5 sm:gap-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={!muted}
                  aria-label={muted ? 'Unmute video' : 'Mute video'}
                  className={`min-h-[38px] min-w-[38px] px-2.5 rounded-full backdrop-blur-md border flex items-center justify-center cursor-pointer transition ${
                    muted
                      ? 'bg-black/60 border-white/20 text-zinc-300 hover:text-white'
                      : 'bg-black/65 border-[#D4AF37]/60 text-[#FCE7A2]'
                  }`}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  aria-pressed={isZoomed}
                  aria-label={
                    isZoomed
                      ? 'Fullscreen Cover active — switch to Original Fit'
                      : 'Original Fit active — switch to Fullscreen Cover'
                  }
                  title={isZoomed ? 'Tap for Original Fit' : 'Tap for Fullscreen Cover'}
                  className={`min-h-[38px] px-3 rounded-full backdrop-blur-md border text-xs font-bold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isZoomed
                      ? 'border-[#D4AF37]/65 bg-black/65 text-[#FCE7A2] hover:border-[#FBBF24]'
                      : 'border-[#FBBF24] bg-[#241A07]/85 text-[#FFF3B0] shadow-[0_0_12px_rgba(251,191,36,0.28)]'
                  }`}
                >
                  {isZoomed ? (
                    <Scan className="w-3.5 h-3.5 text-[#D4AF37]" />
                  ) : (
                    <ZoomIn className="w-3.5 h-3.5 text-[#FBBF24]" />
                  )}
                  <span>{isZoomed ? 'Fit / Zoom' : 'Original Fit'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleFullscreen()}
                  aria-label={isExpandedFull ? 'Exit full screen' : 'Full screen'}
                  className="min-h-[38px] min-w-[38px] rounded-full bg-black/60 backdrop-blur-md border border-[#D4AF37]/45 text-[#FCE7A2] hover:border-[#FBBF24] flex items-center justify-center cursor-pointer transition"
                >
                  {isExpandedFull ? (
                    <Minimize2 className="w-4 h-4" />
                  ) : (
                    <Maximize2 className="w-4 h-4" />
                  )}
                </button>
              </div>

              {episodes.length > 1 ? (
                <button
                  type="button"
                  onClick={handleNext}
                  className="min-h-[38px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1.5 whitespace-nowrap shrink-0 cursor-pointer hover:brightness-105 shadow-[0_0_16px_rgba(251,191,36,0.4)]"
                >
                  <span>Next Episode</span>
                  <SkipForward className="w-3.5 h-3.5 fill-current" />
                </button>
              ) : (
                <span className="font-mono-num text-[11px] font-semibold text-[#FCE7A2] bg-black/55 backdrop-blur-md px-2.5 py-1 rounded-full border border-[#D4AF37]/30 whitespace-nowrap">
                  {activeIndex + 1} / {episodes.length}
                </span>
              )}
            </div>

            {/* Row 3: Compact Sunday Tournament Progress + Reload Pill (Left) & Glowing Gold Coin Pot +300 (Top-Right) */}
            <div className="flex items-start justify-between gap-2.5">
              <div className="pointer-events-auto flex-1 min-w-0 space-y-1.5">
                <div className="w-full rounded-xl bg-black/60 backdrop-blur-md border border-[#D4AF37]/55 px-2.5 py-1.5 shadow-[0_4px_18px_rgba(0,0,0,0.45)]">
                  <div className="flex items-center justify-between gap-1.5 text-[10px] sm:text-xs">
                    <span className="inline-flex items-center gap-1 font-bold text-[#FCE7A2] truncate">
                      <Trophy className="w-3 h-3 text-[#FBBF24] shrink-0" />
                      <span className="truncate">Sunday Tournament</span>
                    </span>
                    <span className="font-mono-num font-bold text-[#FFF8E7] whitespace-nowrap shrink-0">
                      {playerWeeklyCoins.toLocaleString()} / {safeThreshold.toLocaleString()}{' '}
                      <span className={isQualified ? 'text-emerald-300' : 'text-[#FBBF24]'}>
                        ({isQualified ? 'Qualified' : `${weeklyPct.toFixed(2)}%`})
                      </span>
                    </span>
                  </div>

                  <div
                    role="progressbar"
                    aria-valuenow={playerWeeklyCoins}
                    aria-valuemin={0}
                    aria-valuemax={safeThreshold}
                    aria-label="Sunday Tournament Progress"
                    className="mt-1 h-1.5 w-full rounded-full bg-black/80 border border-[#D4AF37]/30 overflow-hidden"
                  >
                    <div
                      className={`h-full rounded-full transition-all duration-300 ${
                        isQualified
                          ? 'bg-gradient-to-r from-emerald-400 via-teal-300 to-emerald-500'
                          : 'gold-gradient-bg shadow-[0_0_10px_rgba(251,191,36,0.5)]'
                      }`}
                      style={{ width: `${weeklyPct}%` }}
                    />
                  </div>
                </div>

                <div className="flex items-center gap-2">
                  <span className="font-mono-num text-[10px] font-semibold text-[#FCE7A2]/90 drop-shadow whitespace-nowrap">
                    {activeIndex + 1}/{episodes.length}
                  </span>

                  {isStalledOver5s && (
                    <button
                      type="button"
                      onClick={() => {
                        clearRecoveryTimers();
                        clearStallPill();
                        scheduleStallPill();
                        setRecoveryFailed(false);
                        setIsRecovering(false);
                        setRetryCount((prev) => prev + 1);
                      }}
                      className="min-h-[28px] px-2.5 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-[#D4AF37]/55 text-[11px] font-bold text-[#FCE7A2] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer shadow-[0_0_12px_rgba(212,175,55,0.28)] transition"
                    >
                      <RotateCcw className="w-3 h-3 text-[#D4AF37] shrink-0" />
                      <span>Reload</span>
                    </button>
                  )}
                </div>
              </div>

              {/* Glowing Gold Coin Pot (+300) Circular Progress Ring */}
              <div className="shrink-0 flex flex-col items-center gap-0.5">
                <div className="relative w-[54px] h-[54px] rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/75 shadow-[0_0_20px_rgba(251,191,36,0.48)] flex items-center justify-center">
                  <svg
                    width={ringSize}
                    height={ringSize}
                    viewBox={`0 0 ${ringSize} ${ringSize}`}
                    className="-rotate-90 absolute inset-0"
                    aria-hidden="true"
                  >
                    <defs>
                      <linearGradient id="fy-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                        <stop offset="0%" stopColor="#FFF7CC" />
                        <stop offset="50%" stopColor="#D4AF37" />
                        <stop offset="100%" stopColor="#A88220" />
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
                    <Coins className="w-4 h-4 text-amber-300" />
                    <span className="font-mono-num text-[9px] font-extrabold text-amber-200 leading-none mt-0.5">
                      +{COIN_POT_BASE_REWARD}
                    </span>
                  </div>
                </div>
                <span className="font-mono-num text-[10px] font-extrabold text-[#FCE7A2] bg-black/70 px-1.5 rounded">
                  {isPlaying ? `${Math.round(ringProgress)}%` : 'Paused'}
                </span>
              </div>
            </div>
          </div>

          {/* Flying Coin Burst Feedback */}
          {flyingBurst && (
            <div
              key={flyingBurst.id}
              className="coin-shoot-up pointer-events-none absolute right-6 top-36 z-40 flex flex-col items-center gap-1"
            >
              <RealisticGoldCoin sizePx={44} emblem="$" />
              <span className="px-2.5 py-0.5 rounded-full gold-gradient-bg text-[#181307] font-mono-num text-xs font-extrabold shadow-lg">
                +{flyingBurst.amount}
              </span>
            </div>
          )}
        </div>

        {/* 3. Pinned Bottom 320x50px Adsterra Banner & 18+ Disclaimer Right Above Bottom Nav Bar */}
        <footer
          className={`shrink-0 relative z-20 bg-[#09090b] border-t border-[#D4AF37]/30 px-3 pt-1.5 pb-1.5 flex flex-col items-center justify-center ${
            isExpandedFull ? 'mb-0' : 'mb-16'
          }`}
        >
          <BottomAdBanner />
          <p className="text-[9px] sm:text-[10px] text-zinc-400 text-center mt-1 leading-tight px-2">
            18+ Only • Winners know when to stop • National Responsible Gambling: 0800 006 008
          </p>
        </footer>
      </section>

      {/* Congratulations! Double-Reward Modal */}
      <DoubleRewardModal
        open={rewardModalOpen}
        baseCoins={COIN_POT_BASE_REWARD}
        sponsorUrl={currentEpisode.sponsorUrl || sponsorAdUrl || DEFAULT_SPONSOR_URL}
        episodeTitle={`${currentEpisode.series} — ${currentEpisode.episodeLabel}`}
        onStartSponsorTimer={() => onStartSponsorReward?.()}
        onClaimDouble={() => handleAwardDoubleCoinsOnly(COIN_POT_BASE_REWARD * 2)}
        onContinueAfterAd={handleContinueAfterAd}
        onCancelAd={handleContinueAfterAd}
        onClaimBase={() => handleClaimReward(COIN_POT_BASE_REWARD)}
      />
    </>
  );
};
