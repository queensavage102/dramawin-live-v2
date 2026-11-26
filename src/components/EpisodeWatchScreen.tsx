import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  ChevronDown,
  ChevronUp,
  Coins,
  Film,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  RotateCcw,
  Scan,
  SkipForward,
  Trophy,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react';
import {
  COIN_POT_BASE_REWARD,
  COIN_POT_CYCLE_SECONDS,
  DEFAULT_SPONSOR_URL,
  getEpisodeSeriesId,
  resolveVideoSource,
  sanitizeMediaUrl,
} from '../constants';
import { DramaEpisode } from '../types';
import {
  FULL_EPISODE_UNLOCK_COINS,
  PREVIEW_FREE_SECONDS,
} from '../utils/modernCatalog';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { BottomAdBanner } from './BottomAdBanner';
import { DoubleRewardModal } from './DoubleRewardModal';
import { IsolatedHtml5Video, IsolatedYouTubeIframe } from './IsolatedYouTubeIframe';
import { MovieUnlockOverlay } from './MovieUnlockOverlay';
import { RealisticGoldCoin } from './RealisticGoldCoin';

interface EpisodeWatchScreenProps {
  episode: DramaEpisode;
  episodes?: DramaEpisode[];
  referralUserId?: string;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  hasNextEpisode?: boolean;
  nextEpisodeLabel?: string;
  isArchiveLocked?: boolean;
  onUnlockArchiveMovie?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onGoToBoost?: () => void;
  onNextEpisode?: () => void;
  onSelectEpisode?: (episode: DramaEpisode) => void;
  onShareEpisode?: (episode: DramaEpisode) => void;
  onClaimGiftBoxCoins?: () => Promise<void>;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
  onClose: () => void;
}

// Helper utilities for video playback commands

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

const MAX_VIDEO_RETRIES = 3;

const YOUTUBE_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';

interface WatchVideoStageProps {
  episode: DramaEpisode;
  fitMode: boolean;
  paused: boolean;
  muted: boolean;
  playbackRate: number;
  resumePlaybackSignal: number;
  manualReloadNonce: number;
  isPreviewLocked?: boolean;
  previewReplayNonce?: number;
  onPreviewLimitReached?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onVideoEnded?: () => void;
  onStallStateChange?: (stalledOver5s: boolean) => void;
}

const WatchVideoStage: React.FC<WatchVideoStageProps> = React.memo(
  ({
    episode,
    fitMode,
    paused,
    muted,
    playbackRate,
    resumePlaybackSignal,
    manualReloadNonce,
    isPreviewLocked = false,
    previewReplayNonce = 0,
    onPreviewLimitReached,
    onPlayingChange,
    onVideoEnded,
    onStallStateChange,
  }) => {
    const rawVideoUrl = sanitizeMediaUrl((episode.videoUrl || episode.youtubeUrl || '').trim());
    const customStart =
      typeof episode.startTime === 'number' && Number.isFinite(episode.startTime)
        ? Math.max(0, Math.floor(episode.startTime))
        : undefined;

    const videoSource = useMemo(
      () =>
        resolveVideoSource(rawVideoUrl, {
          startSeconds: customStart,
          muted: false,
          autoplay: true,
        }),
      [rawVideoUrl, customStart]
    );

    const resolvedDirectUrl = useResolvedMediaUrl(
      videoSource.kind === 'direct' ? videoSource.url : ''
    );

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
    const videoRef = useRef<HTMLVideoElement | null>(null);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const onVideoEndedRef = useRef(onVideoEnded);
    const onStallStateChangeRef = useRef(onStallStateChange);
    const onPreviewLimitReachedRef = useRef(onPreviewLimitReached);
    const isPreviewLockedRef = useRef(isPreviewLocked);
    const mutedRef = useRef(muted);
    const pausedRef = useRef(paused);
    const playbackRateRef = useRef(playbackRate);
    const sourceKindRef = useRef(videoSource.kind);
    const stallTimerRef = useRef<number | null>(null);
    const stallPillTimerRef = useRef<number | null>(null);
    const retryDelayTimerRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0);
    const lastProgressTimeRef = useRef<number>(-1);

    const [retryCount, setRetryCount] = useState(0);
    const [isRecovering, setIsRecovering] = useState(false);
    const [recoveryFailed, setRecoveryFailed] = useState(false);
    const prevPausedRef = useRef(paused);

    const clearStallPill = useCallback(() => {
      if (stallPillTimerRef.current !== null) {
        window.clearTimeout(stallPillTimerRef.current);
        stallPillTimerRef.current = null;
      }
      onStallStateChangeRef.current?.(false);
    }, []);

    const scheduleStallPill = useCallback(() => {
      if (pausedRef.current) return;
      if (stallPillTimerRef.current !== null) return;
      stallPillTimerRef.current = window.setTimeout(() => {
        stallPillTimerRef.current = null;
        if (!pausedRef.current) {
          onStallStateChangeRef.current?.(true);
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

    useEffect(() => {
      mutedRef.current = muted;
    }, [muted]);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      playbackRateRef.current = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
      sourceKindRef.current = videoSource.kind;
    }, [videoSource.kind]);

    useEffect(() => {
      if (manualReloadNonce > 0) {
        clearRecoveryTimers();
        clearStallPill();
        scheduleStallPill();
        setRecoveryFailed(false);
        setIsRecovering(false);
        setRetryCount((prev) => prev + 1);
      }
    }, [manualReloadNonce, clearRecoveryTimers, clearStallPill, scheduleStallPill]);

    useEffect(() => {
      clearRecoveryTimers();
      clearStallPill();
      savedTimeRef.current = 0;
      lastProgressTimeRef.current = -1;
      setRetryCount(0);
      setIsRecovering(false);
      setRecoveryFailed(false);
      return () => {
        clearRecoveryTimers();
        clearStallPill();
      };
    }, [episode.id, rawVideoUrl, clearRecoveryTimers, clearStallPill]);

    useEffect(() => {
      onPlayingChangeRef.current = onPlayingChange;
    }, [onPlayingChange]);

    useEffect(() => {
      onVideoEndedRef.current = onVideoEnded;
    }, [onVideoEnded]);

    useEffect(() => {
      onStallStateChangeRef.current = onStallStateChange;
    }, [onStallStateChange]);

    useEffect(() => {
      onPreviewLimitReachedRef.current = onPreviewLimitReached;
    }, [onPreviewLimitReached]);

    useEffect(() => {
      isPreviewLockedRef.current = isPreviewLocked;
    }, [isPreviewLocked]);

    useEffect(() => {
      if (previewReplayNonce > 0) {
        savedTimeRef.current = 0;
        if (videoSource.kind === 'youtube') {
          postYouTubeCommand(iframeRef.current, 'seekTo', [0, true]);
          postYouTubeCommand(iframeRef.current, 'playVideo');
        } else if (videoSource.kind === 'dailymotion') {
          postDailymotionCommand(iframeRef.current, 'seek', [0]);
          postDailymotionCommand(iframeRef.current, 'play');
        }
        if (videoRef.current) {
          try {
            videoRef.current.currentTime = 0;
          } catch {
            // Ignore seek errors before readyState
          }
          void videoRef.current.play().catch(() => {});
        }
      }
    }, [previewReplayNonce, videoSource.kind]);

    // Arm initial load stall check (>5s) for direct or iframe sources while unpaused
    useEffect(() => {
      if (paused || videoSource.kind === 'empty') {
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
    }, [episode.id, rawVideoUrl, paused, videoSource.kind, scheduleStallPill, clearStallPill]);

    const triggerAutoRecover = useCallback((isDirect: boolean) => {
      if (pausedRef.current) return;
      if (stallTimerRef.current !== null) {
        window.clearTimeout(stallTimerRef.current);
        stallTimerRef.current = null;
      }
      if (retryDelayTimerRef.current !== null) return;

      if (isDirect && videoRef.current && Number.isFinite(videoRef.current.currentTime)) {
        savedTimeRef.current = videoRef.current.currentTime;
      }

      setRetryCount((prev) => {
        if (prev >= MAX_VIDEO_RETRIES) {
          setIsRecovering(false);
          setRecoveryFailed(true);
          onStallStateChangeRef.current?.(true);
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
              // Remount via retryCount increment handles fallback
            }
          }
        }, 900);
        return prev + 1;
      });
    }, [scheduleStallPill]);

    const handleManualRetry = useCallback(() => {
      clearRecoveryTimers();
      clearStallPill();
      setRecoveryFailed(false);
      setIsRecovering(true);
      setRetryCount((prev) => prev + 1);
    }, [clearRecoveryTimers, clearStallPill]);

    useEffect(() => {
      const saveDirectTimestamp = () => {
        if (
          videoRef.current &&
          Number.isFinite(videoRef.current.currentTime) &&
          videoRef.current.currentTime > 0
        ) {
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
      if (videoRef.current) {
        videoRef.current.playbackRate = playbackRate;
      }
      if (videoSource.kind === 'youtube') {
        postYouTubeCommand(iframeRef.current, 'setPlaybackRate', [playbackRate]);
      } else if (videoSource.kind === 'dailymotion') {
        postDailymotionCommand(iframeRef.current, 'playbackSpeed', [playbackRate]);
      } else if (videoSource.kind === 'vimeo') {
        postVimeoCommand(iframeRef.current, 'setPlaybackRate', playbackRate);
      }
    }, [playbackRate, videoSource.kind, resolvedDirectUrl]);

    useEffect(() => {
      const wasPaused = prevPausedRef.current;
      prevPausedRef.current = paused;

      if (videoSource.kind === 'youtube') {
        if (!paused && wasPaused && savedTimeRef.current > 0.5) {
          postYouTubeCommand(iframeRef.current, 'seekTo', [savedTimeRef.current, true]);
        }
        postYouTubeCommand(iframeRef.current, paused ? 'pauseVideo' : 'playVideo');
      } else if (videoSource.kind === 'dailymotion') {
        postDailymotionCommand(iframeRef.current, paused ? 'pause' : 'play');
      } else if (videoSource.kind === 'vimeo') {
        postVimeoCommand(iframeRef.current, paused ? 'pause' : 'play');
      }

      if (videoRef.current) {
        videoRef.current.muted = muted;
        videoRef.current.volume = 1;
        videoRef.current.playbackRate = playbackRate;
        if (paused) {
          if (Number.isFinite(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
            savedTimeRef.current = videoRef.current.currentTime;
          }
          videoRef.current.pause();
          clearRecoveryTimers();
          clearStallPill();
        } else {
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
              // Ignore seek errors before readyState
            }
          }
          void videoRef.current.play().catch((err: unknown) => {
            if (err instanceof DOMException && err.name === 'NotAllowedError' && videoRef.current) {
              videoRef.current.muted = true;
              void videoRef.current.play().catch(() => {});
            }
          });
        }
      }
    }, [
      paused,
      resumePlaybackSignal,
      videoSource.kind,
      resolvedDirectUrl,
      muted,
      playbackRate,
      retryCount,
      clearRecoveryTimers,
    ]);

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
    }, [muted, videoSource.kind, resolvedDirectUrl]);

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
          onPlayingChangeRef.current?.(false);
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
            if (isPreviewLockedRef.current && ytTime >= PREVIEW_FREE_SECONDS) {
              savedTimeRef.current = PREVIEW_FREE_SECONDS - 1;
              postYouTubeCommand(iframeRef.current, 'seekTo', [PREVIEW_FREE_SECONDS - 1, true]);
              postYouTubeCommand(iframeRef.current, 'pauseVideo');
              clearRecoveryTimers();
              clearStallPill();
              onPlayingChangeRef.current?.(false);
              onPreviewLimitReachedRef.current?.();
              return;
            }
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

        if (playerState === 1) {
          clearRecoveryTimers();
          clearStallPill();
          setIsRecovering(false);
          setRecoveryFailed(false);
          onPlayingChangeRef.current?.(true);
        } else if (playerState === 2) {
          clearRecoveryTimers();
          clearStallPill();
          onPlayingChangeRef.current?.(false);
        } else if (playerState === 3) {
          if (!paused) {
            scheduleStallPill();
            if (stallTimerRef.current === null) {
              stallTimerRef.current = window.setTimeout(() => {
                stallTimerRef.current = null;
                postYouTubeCommand(iframeRef.current, 'playVideo');
                triggerAutoRecover(false);
              }, 7500);
            }
          }
        } else if (playerState === 0) {
          clearRecoveryTimers();
          clearStallPill();
          onPlayingChangeRef.current?.(false);
          onVideoEndedRef.current?.();
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [
      videoSource.kind,
      paused,
      triggerAutoRecover,
      clearRecoveryTimers,
      clearStallPill,
      scheduleStallPill,
    ]);

    const handleIframeLoad = useCallback(() => {
      setIsRecovering(false);
      clearStallPill();
      try {
        if (sourceKindRef.current === 'youtube') {
          iframeRef.current?.contentWindow?.postMessage(
            '{"event":"listening","id":"dramawin-watch-player"}',
            '*'
          );
          if (mutedRef.current) {
            postYouTubeCommand(iframeRef.current, 'mute');
          } else {
            postYouTubeCommand(iframeRef.current, 'unMute');
            postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
          }
          postYouTubeCommand(iframeRef.current, 'setPlaybackRate', [playbackRateRef.current]);
        } else if (sourceKindRef.current === 'dailymotion') {
          postDailymotionCommand(iframeRef.current, 'muted', [mutedRef.current]);
          postDailymotionCommand(iframeRef.current, 'playbackSpeed', [playbackRateRef.current]);
        } else if (sourceKindRef.current === 'vimeo') {
          postVimeoCommand(iframeRef.current, 'setMuted', mutedRef.current);
          postVimeoCommand(iframeRef.current, 'setVolume', mutedRef.current ? 0 : 1);
          postVimeoCommand(iframeRef.current, 'setPlaybackRate', playbackRateRef.current);
        }
      } catch {
        // Ignore cross-origin postMessage restrictions
      }
    }, []);

    const handleVideoLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
      e.currentTarget.muted = mutedRef.current;
      e.currentTarget.volume = 1;
      e.currentTarget.playbackRate = playbackRateRef.current;
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
      onPlayingChangeRef.current?.(true);
    }, [clearRecoveryTimers, clearStallPill]);

    const handleVideoPlay = useCallback(
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        e.currentTarget.muted = mutedRef.current;
        e.currentTarget.volume = 1;
        e.currentTarget.playbackRate = playbackRateRef.current;
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
        onPlayingChangeRef.current?.(true);
      },
      [clearRecoveryTimers, clearStallPill]
    );

    const handleVideoTimeUpdate = useCallback(
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        const nowTime = e.currentTarget.currentTime;
        if (isPreviewLockedRef.current && nowTime >= PREVIEW_FREE_SECONDS) {
          savedTimeRef.current = PREVIEW_FREE_SECONDS - 0.1;
          try {
            e.currentTarget.currentTime = PREVIEW_FREE_SECONDS - 0.1;
          } catch {
            // Ignore seek clamp error
          }
          e.currentTarget.pause();
          clearRecoveryTimers();
          clearStallPill();
          onPlayingChangeRef.current?.(false);
          onPreviewLimitReachedRef.current?.();
          return;
        }
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

    const handleVideoSeekingGuard = useCallback(
      (e: React.SyntheticEvent<HTMLVideoElement>) => {
        if (isPreviewLockedRef.current && e.currentTarget.currentTime >= PREVIEW_FREE_SECONDS) {
          savedTimeRef.current = PREVIEW_FREE_SECONDS - 0.2;
          try {
            e.currentTarget.currentTime = PREVIEW_FREE_SECONDS - 0.2;
          } catch {
            // Ignore seek clamp error
          }
          e.currentTarget.pause();
          onPlayingChangeRef.current?.(false);
          onPreviewLimitReachedRef.current?.();
        }
      },
      []
    );

    const handleVideoWaitingOrStalled = useCallback(() => {
      if (!pausedRef.current) {
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
      onPlayingChangeRef.current?.(false);
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
        onPlayingChangeRef.current?.(false);
      },
      [clearRecoveryTimers, clearStallPill]
    );

    const handleVideoEnded = useCallback(() => {
      clearRecoveryTimers();
      clearStallPill();
      onPlayingChangeRef.current?.(false);
      onVideoEndedRef.current?.();
    }, [clearRecoveryTimers, clearStallPill]);

    const iframeClassName = fitMode
      ? 'pointer-events-none absolute inset-0 w-full h-full border-0 block bg-[#060608] scale-100 transition-transform duration-300 ease-out'
      : 'pointer-events-none absolute inset-0 w-full h-full border-0 block bg-[#060608] scale-[1.75] transition-transform duration-300 ease-out';

    const directVideoClassName = `pointer-events-none absolute inset-0 w-full h-full bg-[#060608] transition-transform duration-300 ease-out ${
      fitMode ? 'object-contain scale-100' : 'object-cover scale-[1.75]'
    }`;

    const recoveryOverlay = (isRecovering || recoveryFailed) && (
      <div className="pointer-events-none absolute inset-0 z-30 flex items-center justify-center p-4">
        {recoveryFailed ? (
          <button
            type="button"
            onClick={handleManualRetry}
            className="pointer-events-auto inline-flex items-center gap-2 px-4 py-2.5 rounded-full bg-black/85 border border-amber-400/70 text-amber-200 text-xs font-bold shadow-2xl hover:bg-black cursor-pointer"
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
    );

    if (
      videoSource.kind === 'youtube' ||
      videoSource.kind === 'dailymotion' ||
      videoSource.kind === 'vimeo' ||
      videoSource.kind === 'odysee' ||
      videoSource.kind === 'iframe'
    ) {
      return (
        <>
          <IsolatedYouTubeIframe
            iframeRef={iframeRef}
            iframeKey={`${episode.id}-${videoSource.url}-r${retryCount}`}
            src={videoSource.url}
            title={episode.title}
            onLoad={handleIframeLoad}
            referrerPolicy="strict-origin-when-cross-origin"
            allow={YOUTUBE_IFRAME_ALLOW}
            allowFullScreen
            className={iframeClassName}
          />
          {recoveryOverlay}
        </>
      );
    }

    if (videoSource.kind === 'direct' && resolvedDirectUrl) {
      return (
        <>
          <IsolatedHtml5Video
            videoRef={videoRef}
            videoKey={`${episode.id}-${resolvedDirectUrl}-r${retryCount}`}
            src={resolvedDirectUrl}
            autoPlay
            muted={muted}
            onLoadedMetadata={handleVideoLoadedMetadata}
            onCanPlay={handleVideoCanPlay}
            onPlaying={handleVideoPlaying}
            onPlay={handleVideoPlay}
            onTimeUpdate={handleVideoTimeUpdate}
            onSeeking={handleVideoSeekingGuard}
            onSeeked={handleVideoSeekingGuard}
            onWaiting={handleVideoWaitingOrStalled}
            onStalled={handleVideoWaitingOrStalled}
            onError={handleVideoError}
            onPause={handleVideoPause}
            onEnded={handleVideoEnded}
            className={directVideoClassName}
          />
          {recoveryOverlay}
        </>
      );
    }

    return (
      <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3 bg-[#060608]">
        <Film className="w-10 h-10 text-[#D4AF37]" />
        <p className="text-sm text-[#C4BDB0] max-w-sm">
          Paste a YouTube, Dailymotion (<span className="font-mono text-[#FCE7A2]">dai.ly</span>), Vimeo, Odysee, Internet Archive, or direct{' '}
          <span className="font-mono text-[#FCE7A2]">.mp4 / .m3u8</span> URL in{' '}
          <span className="font-mono text-[#FCE7A2]">/admin → Series Watch Sheet</span>.
        </p>
      </div>
    );
  }
);

WatchVideoStage.displayName = 'WatchVideoStage';

export const EpisodeWatchScreen: React.FC<EpisodeWatchScreenProps> = ({
  episode,
  episodes = [],
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal = 0,
  hasNextEpisode = false,
  nextEpisodeLabel,
  isArchiveLocked = false,
  onUnlockArchiveMovie,
  onGoToBoost,
  onNextEpisode,
  onToggleMute,
  onAwardCoinPot,
  onStartSponsorReward,
  onMarkEpisodeWatched,
  onClose,
}) => {
  const potReward = COIN_POT_BASE_REWARD;
  const safeThreshold = Math.max(500000, qualificationThreshold || 500000);
  const weeklyPct = Math.min(100, Math.max(0, (playerWeeklyCoins / safeThreshold) * 100));
  const isQualified = playerWeeklyCoins >= safeThreshold;

  const [ringProgress, setRingProgress] = useState(0);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [previewLockOpen, setPreviewLockOpen] = useState(false);
  const [previewReplayNonce, setPreviewReplayNonce] = useState(0);
  const [flyingBurst, setFlyingBurst] = useState<{ id: number; amount: number } | null>(null);
  const [isExpandedFull, setIsExpandedFull] = useState(false);
  const [isFitMode, setIsFitMode] = useState(false);
  const [userPaused, setUserPaused] = useState(false);
  const [tapFeedback, setTapFeedback] = useState<'play' | 'pause' | null>(null);
  const [hudExpanded, setHudExpanded] = useState(false);
  const [videoReloadNonce, setVideoReloadNonce] = useState(0);
  const [isVideoStalledOver5s, setIsVideoStalledOver5s] = useState(false);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const awardingRef = useRef(false);
  const rewardModalOpenRef = useRef(false);
  const previewLockOpenRef = useRef(false);
  const previewElapsedMsRef = useRef(0);
  const resetPotTimerRef = useRef(false);
  const onAwardRef = useRef(onAwardCoinPot);
  const onMarkEpisodeWatchedRef = useRef(onMarkEpisodeWatched);
  const episodeRef = useRef(episode);
  const isVideoPlayingRef = useRef(true);

  useEffect(() => {
    onAwardRef.current = onAwardCoinPot;
  }, [onAwardCoinPot]);

  useEffect(() => {
    onMarkEpisodeWatchedRef.current = onMarkEpisodeWatched;
  }, [onMarkEpisodeWatched]);

  useEffect(() => {
    episodeRef.current = episode;
  }, [episode]);

  const seriesEpisodes = useMemo(() => {
    const sId = getEpisodeSeriesId(episode);
    const seen = new Set<string>();
    const list = episodes
      .filter((ep) => {
        if (!ep?.id || seen.has(ep.id)) return false;
        if (getEpisodeSeriesId(ep) !== sId) return false;
        seen.add(ep.id);
        return true;
      })
      .sort((a, b) => (a.sortOrder || 0) - (b.sortOrder || 0));
    return list.length > 0 ? list : [episode];
  }, [episodes, episode]);

  const currentEpPos = Math.max(
    1,
    seriesEpisodes.findIndex((ep) => ep.id === episode.id) + 1
  );
  const totalSeriesEps = Math.max(1, seriesEpisodes.length);

  const tapFeedbackTimerRef = useRef<number | null>(null);

  const handlePlayingChange = useCallback((playing: boolean) => {
    if (!rewardModalOpenRef.current && !previewLockOpenRef.current) {
      isVideoPlayingRef.current = playing;
    }
  }, []);

  const handleTogglePlayPause = useCallback(() => {
    if (rewardModalOpenRef.current || previewLockOpenRef.current) return;
    setUserPaused((prev) => {
      const nextPaused = !prev;
      isVideoPlayingRef.current = !nextPaused;
      setTapFeedback(nextPaused ? 'pause' : 'play');
      if (tapFeedbackTimerRef.current !== null) {
        window.clearTimeout(tapFeedbackTimerRef.current);
      }
      tapFeedbackTimerRef.current = window.setTimeout(() => {
        tapFeedbackTimerRef.current = null;
        setTapFeedback(null);
      }, 650);
      return nextPaused;
    });
  }, []);

  const handleVideoEnded = useCallback(() => {
    void onMarkEpisodeWatchedRef.current?.(episodeRef.current);
  }, []);

  useEffect(() => {
    isVideoPlayingRef.current = true;
    rewardModalOpenRef.current = false;
    previewLockOpenRef.current = false;
    previewElapsedMsRef.current = 0;
    setRewardModalOpen(false);
    setPreviewLockOpen(false);
    setPreviewReplayNonce(0);
    setRingProgress(0);
    setIsFitMode(false);
    setUserPaused(false);
    setTapFeedback(null);
    setVideoReloadNonce(0);
    setIsVideoStalledOver5s(false);
    return () => {
      if (tapFeedbackTimerRef.current !== null) {
        window.clearTimeout(tapFeedbackTimerRef.current);
        tapFeedbackTimerRef.current = null;
      }
    };
  }, [episode.id]);

  // 3-minute free preview timer (covers YouTube embeds reliably alongside message listener)
  useEffect(() => {
    if (!isArchiveLocked) return;
    const limitMs = PREVIEW_FREE_SECONDS * 1000;
    let lastTick = Date.now();

    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (
        document.visibilityState !== 'visible' ||
        !isVideoPlayingRef.current ||
        rewardModalOpenRef.current ||
        previewLockOpenRef.current
      ) {
        return;
      }

      previewElapsedMsRef.current += delta;
      if (previewElapsedMsRef.current >= limitMs && !previewLockOpenRef.current) {
        previewLockOpenRef.current = true;
        isVideoPlayingRef.current = false;
        setPreviewLockOpen(true);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [episode.id, isArchiveLocked]);

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

  // Fills Coin Ring up to 100% every 60s of playback
  useEffect(() => {
    const cycleMs = COIN_POT_CYCLE_SECONDS * 1000;
    let elapsedMs = 0;
    let lastTick = Date.now();
    rewardModalOpenRef.current = false;
    resetPotTimerRef.current = false;
    setRewardModalOpen(false);
    setRingProgress(0);

    const interval = window.setInterval(() => {
      const now = Date.now();
      const delta = now - lastTick;
      lastTick = now;

      if (resetPotTimerRef.current) {
        elapsedMs = 0;
        resetPotTimerRef.current = false;
      }

      if (
        document.visibilityState !== 'visible' ||
        !isVideoPlayingRef.current ||
        rewardModalOpenRef.current ||
        previewLockOpenRef.current
      ) {
        return;
      }

      elapsedMs += delta;
      const pct = Math.min(100, (elapsedMs / cycleMs) * 100);
      setRingProgress(pct);

      if (pct >= 100 && !rewardModalOpenRef.current) {
        rewardModalOpenRef.current = true;
        isVideoPlayingRef.current = false;
        setRewardModalOpen(true);
      }
    }, 100);

    return () => window.clearInterval(interval);
  }, [episode.id, potReward]);

  const awardCoinsOnly = async (amount: number) => {
    if (awardingRef.current) return;
    awardingRef.current = true;

    try {
      await onAwardRef.current(episodeRef.current, amount);
      const burstId = Date.now();
      setFlyingBurst({ id: burstId, amount });
      window.setTimeout(() => {
        setFlyingBurst((curr) => (curr?.id === burstId ? null : curr));
      }, 1250);
    } finally {
      awardingRef.current = false;
    }
  };

  const handleContinueAfterAd = () => {
    rewardModalOpenRef.current = false;
    resetPotTimerRef.current = true;
    isVideoPlayingRef.current = true;
    setRewardModalOpen(false);
    setRingProgress(0);
  };

  const handleClaimBaseReward = async (amount: number) => {
    await awardCoinsOnly(amount);
    handleContinueAfterAd();
  };

  const handleClose = () => {
    try {
      const orientation = screen.orientation as ScreenOrientation & {
        unlock?: () => void;
      };
      orientation?.unlock?.();
    } catch {
      // Ignore unsupported orientation unlock
    }
    if (document.fullscreenElement) {
      void document.exitFullscreen().catch(() => {});
    }
    onClose();
  };

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

  const ringSize = 36;
  const strokeWidth = 3;
  const radius = (ringSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringProgress / 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
      className="fixed inset-0 z-[75] bg-[#070709] overflow-hidden"
    >
      <div
        ref={playerContainerRef}
        className="relative h-[100dvh] w-full bg-[#060608] flex flex-col overflow-hidden"
      >
        {/* 1. True Zero-Escape Full-Screen Video Stage (h-[calc(100vh-135px)]) */}
        <div className="relative h-[calc(100vh-135px)] h-[calc(100dvh-135px)] w-full flex-1 min-h-0 bg-[#060608] overflow-hidden [container-type:size]">
          <WatchVideoStage
            episode={episode}
            fitMode={isFitMode}
            paused={userPaused || rewardModalOpen || previewLockOpen}
            muted={muted}
            playbackRate={1}
            resumePlaybackSignal={resumePlaybackSignal}
            manualReloadNonce={videoReloadNonce}
            isPreviewLocked={isArchiveLocked}
            previewReplayNonce={previewReplayNonce}
            onPreviewLimitReached={() => {
              if (!isArchiveLocked) return;
              previewLockOpenRef.current = true;
              isVideoPlayingRef.current = false;
              setPreviewLockOpen(true);
            }}
            onPlayingChange={handlePlayingChange}
            onVideoEnded={handleVideoEnded}
            onStallStateChange={setIsVideoStalledOver5s}
          />

          {/* Transparent Interactive Tap Overlay <div> with Centered Gold Play/Pause Button */}
          <div
            role="button"
            tabIndex={0}
            onClick={handleTogglePlayPause}
            onKeyDown={(e) => {
              if (e.key === ' ' || e.key === 'Enter') {
                e.preventDefault();
                handleTogglePlayPause();
              }
            }}
            aria-label={userPaused ? 'Play episode' : 'Pause episode'}
            className="absolute inset-0 z-10 w-full h-full bg-transparent cursor-pointer flex items-center justify-center focus:outline-none"
          >
            {userPaused && !previewLockOpen && !rewardModalOpen ? (
              <span className="w-16 h-16 rounded-full bg-black/75 backdrop-blur-md border-2 border-[#D4AF37] text-[#FCE7A2] flex items-center justify-center shadow-[0_0_28px_rgba(212,175,55,0.45)] transition-transform">
                <Play className="w-7 h-7 fill-current ml-1" />
              </span>
            ) : tapFeedback === 'play' ? (
              <span className="w-14 h-14 rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/80 text-[#FCE7A2] flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.35)] pointer-events-none">
                <Pause className="w-6 h-6" />
              </span>
            ) : null}
          </div>

          {episode.archiveIdentifier && (
            <div className="pointer-events-none absolute top-[max(3.6rem,calc(env(safe-area-inset-top)+3.25rem))] left-3 z-30">
              {isArchiveLocked ? (
                <button
                  type="button"
                  onClick={() => {
                    previewLockOpenRef.current = true;
                    isVideoPlayingRef.current = false;
                    setPreviewLockOpen(true);
                  }}
                  className="pointer-events-auto inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-[#D4AF37]/50 text-[10px] font-bold text-[#FCE7A2] shadow-lg cursor-pointer transition"
                >
                  <span>3m Free Preview · Unlock Full ({FULL_EPISODE_UNLOCK_COINS})</span>
                </button>
              ) : (
                <span className="inline-flex items-center gap-1 px-2.5 py-1 rounded-full bg-emerald-950/80 backdrop-blur-md border border-emerald-400/45 text-[10px] font-bold text-emerald-200 shadow-lg">
                  <span>Full Episode Unlocked</span>
                </span>
              )}
            </div>
          )}

          {/* 2. Single Slim Top Bar: Back/Close, Title, Optional Fit/Zoom, Mute */}
          <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/85 via-black/45 to-transparent px-3 sm:px-5 pt-[max(0.45rem,env(safe-area-inset-top))] pb-3">
            <div className="pointer-events-auto flex items-center justify-between gap-2">
              <button
                type="button"
                onClick={handleClose}
                aria-label="Back to catalog"
                className="min-h-[36px] min-w-[36px] rounded-full bg-black/65 backdrop-blur-md border border-[#D4AF37]/45 flex items-center justify-center text-[#FCE7A2] hover:border-[#FBBF24] cursor-pointer shrink-0 transition"
              >
                <ArrowLeft className="w-4 h-4" />
              </button>

              <h1 className="flex-1 min-w-0 text-xs sm:text-sm font-display font-extrabold uppercase tracking-wide text-[#FFF8E7] drop-shadow-[0_2px_6px_rgba(0,0,0,0.9)] truncate">
                {episode.series} · {episode.episodeLabel}
              </h1>

              <div className="flex items-center gap-1.5 shrink-0">
                <button
                  type="button"
                  onClick={() => setIsFitMode((prev) => !prev)}
                  aria-pressed={isFitMode}
                  aria-label={isFitMode ? 'Switch to Full 1.75x' : 'Switch to Fit scale-100'}
                  title={isFitMode ? 'Fit (scale-100) — tap for Full' : 'Tap to Fit (scale-100)'}
                  className={`min-h-[34px] px-2.5 rounded-full backdrop-blur-md border text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer ${
                    isFitMode
                      ? 'border-[#FBBF24] bg-[#241A07]/90 text-[#FFF3B0] shadow-[0_0_10px_rgba(251,191,36,0.28)]'
                      : 'border-white/20 bg-black/65 text-[#FCE7A2] hover:border-[#D4AF37]/60'
                  }`}
                >
                  {isFitMode ? (
                    <ZoomIn className="w-3.5 h-3.5 text-[#FBBF24]" />
                  ) : (
                    <Scan className="w-3.5 h-3.5 text-[#D4AF37]" />
                  )}
                  <span>{isFitMode ? 'Fill' : 'Fit'}</span>
                </button>

                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={!muted}
                  aria-label={muted ? 'Unmute video' : 'Mute video'}
                  className={`min-h-[36px] min-w-[36px] rounded-full backdrop-blur-md border flex items-center justify-center transition cursor-pointer ${
                    muted
                      ? 'border-white/20 bg-black/65 text-zinc-300 hover:text-white'
                      : 'border-[#D4AF37]/60 bg-black/65 text-[#FCE7A2]'
                  }`}
                >
                  {muted ? (
                    <VolumeX className="w-4 h-4" />
                  ) : (
                    <Volume2 className="w-4 h-4 text-[#D4AF37]" />
                  )}
                </button>
              </div>
            </div>
          </header>

          {/* 3. Compact Side / Collapsible Pill: +300 Coin Pot Ring + Sunday Tournament Progress */}
          <div className="pointer-events-none absolute top-[max(3.5rem,calc(env(safe-area-inset-top)+3.15rem))] right-3 z-30 flex flex-col items-end gap-1.5">
            <button
              type="button"
              onClick={() => setHudExpanded((prev) => !prev)}
              aria-expanded={hudExpanded}
              aria-label="Toggle tournament progress and coin pot details"
              className="pointer-events-auto inline-flex items-center gap-2 rounded-full bg-black/75 hover:bg-black/90 backdrop-blur-md border border-[#D4AF37]/60 pl-1.5 pr-2.5 py-1 shadow-[0_4px_18px_rgba(0,0,0,0.65)] cursor-pointer transition"
            >
              <div className="relative w-[36px] h-[36px] rounded-full bg-black/80 flex items-center justify-center shrink-0">
                <svg
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                  className="-rotate-90 absolute inset-0"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="watch-coin-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
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
                    stroke="url(#watch-coin-ring-grad)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                    className="transition-[stroke-dashoffset] duration-150 ease-linear"
                  />
                </svg>
                <div className="flex flex-col items-center justify-center">
                  <Coins className="w-3 h-3 text-amber-300" />
                  <span className="font-mono-num text-[8px] font-extrabold text-amber-200 leading-none">
                    +{potReward}
                  </span>
                </div>
              </div>

              <div className="flex flex-col items-start text-left leading-tight">
                <span className="font-mono-num text-[10px] font-extrabold text-[#FCE7A2]">
                  {Math.round(ringProgress)}%
                </span>
                <span className="inline-flex items-center gap-1 text-[9px] font-bold text-amber-300/90">
                  <Trophy className="w-2.5 h-2.5 shrink-0" />
                  <span>{isQualified ? 'Qualified' : `${weeklyPct.toFixed(1)}%`}</span>
                </span>
              </div>

              {hudExpanded ? (
                <ChevronUp className="w-3.5 h-3.5 text-[#FCE7A2]/80 shrink-0" />
              ) : (
                <ChevronDown className="w-3.5 h-3.5 text-[#FCE7A2]/80 shrink-0" />
              )}
            </button>

            {hudExpanded && (
              <div className="pointer-events-auto w-64 sm:w-72 rounded-2xl bg-black/88 backdrop-blur-md border border-[#D4AF37]/60 p-3 shadow-[0_12px_32px_rgba(0,0,0,0.85)] space-y-2.5">
                <div className="space-y-1.5">
                  <div className="flex items-center justify-between gap-2 text-[11px]">
                    <span className="inline-flex items-center gap-1 font-bold text-[#FCE7A2]">
                      <Trophy className="w-3.5 h-3.5 text-[#FBBF24] shrink-0" />
                      <span>Sunday Tournament</span>
                    </span>
                    <span className="font-mono-num font-bold text-[#FFF8E7]">
                      {playerWeeklyCoins.toLocaleString()} / {safeThreshold.toLocaleString()}
                    </span>
                  </div>
                  <div
                    role="progressbar"
                    aria-valuenow={playerWeeklyCoins}
                    aria-valuemin={0}
                    aria-valuemax={safeThreshold}
                    aria-label="Sunday Tournament Progress"
                    className="h-1.5 w-full rounded-full bg-white/10 border border-[#D4AF37]/30 overflow-hidden"
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

                <div className="flex items-center justify-between gap-2 pt-1 border-t border-white/10">
                  <span className="font-mono-num text-[10px] font-semibold text-zinc-300">
                    Ep. {currentEpPos} / {totalSeriesEps}
                  </span>

                  <div className="flex items-center gap-1.5">
                    <button
                      type="button"
                      onClick={() => void handleToggleFullscreen()}
                      aria-label={isExpandedFull ? 'Exit full screen' : 'Full screen'}
                      className="min-h-[30px] min-w-[30px] rounded-full bg-white/10 border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center cursor-pointer"
                    >
                      {isExpandedFull ? (
                        <Minimize2 className="w-3.5 h-3.5" />
                      ) : (
                        <Maximize2 className="w-3.5 h-3.5" />
                      )}
                    </button>

                    {onNextEpisode && hasNextEpisode && (
                      <button
                        type="button"
                        onClick={onNextEpisode}
                        title={nextEpisodeLabel ? `Watch next: ${nextEpisodeLabel}` : 'Next Episode'}
                        className="min-h-[30px] px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[11px] font-extrabold inline-flex items-center gap-1 cursor-pointer"
                      >
                        <span>Next</span>
                        <SkipForward className="w-3 h-3 fill-current" />
                      </button>
                    )}
                  </div>
                </div>
              </div>
            )}

            {isVideoStalledOver5s && (
              <button
                type="button"
                onClick={() => {
                  setIsVideoStalledOver5s(false);
                  setVideoReloadNonce((prev) => prev + 1);
                }}
                className="pointer-events-auto min-h-[28px] px-2.5 rounded-full bg-black/80 hover:bg-black/95 backdrop-blur-md border border-[#D4AF37]/60 text-[11px] font-bold text-[#FCE7A2] inline-flex items-center gap-1 whitespace-nowrap cursor-pointer shadow-[0_0_12px_rgba(212,175,55,0.28)] transition"
              >
                <RotateCcw className="w-3 h-3 text-[#D4AF37] shrink-0" />
                <span>Reload</span>
              </button>
            )}
          </div>

          {/* Flying Coin Burst Feedback */}
          {flyingBurst && (
            <div
              key={flyingBurst.id}
              className="coin-shoot-up pointer-events-none absolute right-6 top-28 z-40 flex flex-col items-center gap-1"
            >
              <RealisticGoldCoin sizePx={44} emblem="$" />
              <span className="px-2.5 py-0.5 rounded-full gold-gradient-bg text-[#181307] font-mono-num text-xs font-extrabold shadow-lg">
                +{flyingBurst.amount}
              </span>
            </div>
          )}

          {/* 3-Minute Free Preview -> Spend 500 Coins Lock Overlay */}
          <MovieUnlockOverlay
            open={previewLockOpen && isArchiveLocked}
            movieTitle={episode.title}
            playerTotalCoins={playerTotalCoins}
            unlockCost={FULL_EPISODE_UNLOCK_COINS}
            onUnlock={async () => {
              if (!episode.archiveIdentifier || !onUnlockArchiveMovie) return false;
              const ok = await onUnlockArchiveMovie(episode.archiveIdentifier, episode.title);
              if (ok) {
                previewLockOpenRef.current = false;
                setPreviewLockOpen(false);
                isVideoPlayingRef.current = true;
              }
              return ok;
            }}
            onReplayPreview={() => {
              previewElapsedMsRef.current = 0;
              previewLockOpenRef.current = false;
              setPreviewLockOpen(false);
              isVideoPlayingRef.current = true;
              setPreviewReplayNonce((prev) => prev + 1);
            }}
            onGoToBoost={
              onGoToBoost
                ? () => {
                    handleClose();
                    onGoToBoost();
                  }
                : undefined
            }
            onClose={handleClose}
          />
        </div>

        {/* 4. Pinned Bottom 320x50px Adsterra/Monetag Banner & 18+ Disclaimer */}
        <footer className="shrink-0 w-full bg-[#09090b] border-t border-[#D4AF37]/30 px-3 pt-2 pb-[max(0.45rem,env(safe-area-inset-bottom))] flex flex-col items-center justify-center">
          <BottomAdBanner />
          <p className="text-[9px] sm:text-[10px] text-zinc-400 text-center mt-1 leading-tight px-2">
            18+ Only • Winners know when to stop • National Responsible Gambling: 0800 006 008
          </p>
        </footer>
      </div>

      {/* Celebratory Coin Ring Complete (+300 / AD Double Rewards x2 +600) Modal */}
      <DoubleRewardModal
        open={rewardModalOpen}
        baseCoins={potReward}
        sponsorUrl={episode.sponsorUrl || sponsorAdUrl || DEFAULT_SPONSOR_URL}
        episodeTitle={`${episode.series} — ${episode.episodeLabel}`}
        onStartSponsorTimer={() => onStartSponsorReward?.()}
        onClaimDouble={() => awardCoinsOnly(potReward * 2)}
        onContinueAfterAd={handleContinueAfterAd}
        onCancelAd={handleContinueAfterAd}
        onClaimBase={() => handleClaimBaseReward(potReward)}
      />
    </div>
  );
};
