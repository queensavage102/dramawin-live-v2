import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  Film,
  Maximize2,
  Minimize2,
  RotateCcw,
  Scan,
  Sparkles,
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
import { DramaEpisode } from '../types';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { BottomAdBanner } from './BottomAdBanner';
import { DoubleRewardModal } from './DoubleRewardModal';
import { IsolatedHtml5Video, IsolatedYouTubeIframe } from './IsolatedYouTubeIframe';
import { RealisticGoldCoin } from './RealisticGoldCoin';

interface EpisodeWatchScreenProps {
  episode: DramaEpisode;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
  hasNextEpisode?: boolean;
  nextEpisodeLabel?: string;
  onNextEpisode?: () => void;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
  onClose: () => void;
}

const TreasureCoinPot3D: React.FC<{ ringProgress: number; pulsing: boolean }> = ({
  ringProgress,
  pulsing,
}) => {
  const dropPhase1 = (ringProgress % 33.3) / 33.3;
  const dropPhase2 = ((ringProgress + 16.6) % 33.3) / 33.3;

  return (
    <div
      className={`relative w-14 h-14 flex items-center justify-center transition-transform duration-300 ${
        pulsing ? 'scale-115' : 'scale-100 coin-pot-glow'
      }`}
    >
      <svg
        viewBox="0 0 64 64"
        className="w-14 h-14 overflow-visible drop-shadow-[0_6px_14px_rgba(212,175,55,0.72)]"
        aria-hidden="true"
      >
        <defs>
          <radialGradient id="potGoldBody" cx="35%" cy="30%" r="72%">
            <stop offset="0%" stopColor="#FFFBE0" />
            <stop offset="32%" stopColor="#F5D062" />
            <stop offset="72%" stopColor="#C48F17" />
            <stop offset="100%" stopColor="#5D3E03" />
          </radialGradient>
          <linearGradient id="potGoldRim" x1="0%" y1="0%" x2="100%" y2="0%">
            <stop offset="0%" stopColor="#7A5306" />
            <stop offset="30%" stopColor="#FFE998" />
            <stop offset="52%" stopColor="#FFFDF0" />
            <stop offset="78%" stopColor="#D4AF37" />
            <stop offset="100%" stopColor="#6D4905" />
          </linearGradient>
          <radialGradient id="coinSparkleFace" cx="32%" cy="28%" r="72%">
            <stop offset="0%" stopColor="#FFFDF2" />
            <stop offset="32%" stopColor="#FFE17D" />
            <stop offset="75%" stopColor="#CE971E" />
            <stop offset="100%" stopColor="#6B4503" />
          </radialGradient>
        </defs>

        <g
          className="coin-drop-sparkle"
          style={{
            transform: `translateY(${-14 + dropPhase1 * 20}px)`,
            opacity: dropPhase1 < 0.85 ? 1 : 0.25,
          }}
        >
          <ellipse cx="22" cy="11.5" rx="6" ry="5.6" fill="#7A5105" />
          <circle cx="22" cy="10" r="5.8" fill="url(#coinSparkleFace)" stroke="#FFF5C4" strokeWidth="1" />
          <circle cx="22" cy="10" r="4.1" fill="none" stroke="#8F6109" strokeWidth="0.8" strokeDasharray="1.3 1.3" />
          <text x="22" y="12.2" textAnchor="middle" fontSize="6.5" fontWeight="900" fill="#FFFDF0">$</text>
        </g>

        <g
          className="coin-drop-sparkle"
          style={{
            animationDelay: '0.55s',
            transform: `translateY(${-15 + dropPhase2 * 20}px)`,
            opacity: dropPhase2 < 0.85 ? 1 : 0.25,
          }}
        >
          <ellipse cx="42" cy="10.5" rx="5.5" ry="5.1" fill="#7A5105" />
          <circle cx="42" cy="9" r="5.3" fill="url(#coinSparkleFace)" stroke="#FFF5C4" strokeWidth="1" />
          <circle cx="42" cy="9" r="3.7" fill="none" stroke="#8F6109" strokeWidth="0.8" strokeDasharray="1.2 1.2" />
          <text x="42" y="11" textAnchor="middle" fontSize="5.8" fontWeight="900" fill="#FFFDF0">★</text>
        </g>

        <g stroke="#6D4804" strokeWidth="0.9">
          <circle cx="20" cy="24.5" r="6.2" fill="url(#coinSparkleFace)" />
          <circle cx="44" cy="24.5" r="6.2" fill="url(#coinSparkleFace)" />
          <circle cx="32" cy="20.5" r="7.2" fill="url(#coinSparkleFace)" stroke="#FFF3BF" strokeWidth="1.1" />
          <circle cx="26.5" cy="25.2" r="5.8" fill="url(#coinSparkleFace)" />
          <circle cx="37.5" cy="25.2" r="5.8" fill="url(#coinSparkleFace)" />
        </g>
        <circle cx="32" cy="20.5" r="5" fill="none" stroke="#7A5105" strokeWidth="0.9" strokeDasharray="1.3 1.4" />
        <text x="32" y="23" textAnchor="middle" fontSize="7" fontWeight="900" fill="#FFFDF0">$</text>

        <path d="M31 12.5l1.1 2.4 2.4 1.1-2.4 1.1-1.1 2.4-1.1-2.4-2.4-1.1 2.4-1.1z" fill="#FFFFFF" />
        <path d="M46 15l0.8 1.6 1.6 0.8-1.6 0.8-0.8 1.6-0.8-1.6-1.6-0.8 1.6-0.8z" fill="#FFF7D0" />

        <path
          d="M14 28.5 C10.5 44, 17 57.5, 32 57.5 C47 57.5, 53.5 44, 50 28.5 Z"
          fill="url(#potGoldBody)"
          stroke="#FCE7A2"
          strokeWidth="1.3"
        />
        <path
          d="M19.5 34 C17.5 42, 20.5 49.5, 25.5 52.5"
          fill="none"
          stroke="rgba(255,252,226,0.68)"
          strokeWidth="2.4"
          strokeLinecap="round"
        />

        <ellipse cx="32" cy="28.5" rx="19" ry="4.8" fill="url(#potGoldRim)" stroke="#5D3E03" strokeWidth="1.2" />
        <ellipse cx="32" cy="27.8" rx="15" ry="2.4" fill="rgba(40,26,4,0.45)" />

        <text
          x="32.7"
          y="48"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fontFamily="Georgia, serif"
          fill="#4A2F02"
          opacity="0.85"
        >
          $
        </text>
        <text
          x="32"
          y="47.2"
          textAnchor="middle"
          fontSize="14"
          fontWeight="900"
          fontFamily="Georgia, serif"
          fill="#FFF7D0"
          opacity="0.92"
        >
          $
        </text>
      </svg>
    </div>
  );
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

const MAX_VIDEO_RETRIES = 3;

const YOUTUBE_IFRAME_ALLOW =
  'accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen';

interface WatchVideoStageProps {
  episode: DramaEpisode;
  zoomed: boolean;
  paused: boolean;
  muted: boolean;
  resumePlaybackSignal: number;
  manualReloadNonce: number;
  onPlayingChange?: (playing: boolean) => void;
  onVideoEnded?: () => void;
}

const WatchVideoStage: React.FC<WatchVideoStageProps> = React.memo(({
  episode,
  zoomed,
  paused,
  muted,
  resumePlaybackSignal,
  manualReloadNonce,
  onPlayingChange,
  onVideoEnded,
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
  const mutedRef = useRef(muted);
  const pausedRef = useRef(paused);
  const sourceKindRef = useRef(videoSource.kind);
  const stallTimerRef = useRef<number | null>(null);
  const retryDelayTimerRef = useRef<number | null>(null);
  const savedTimeRef = useRef<number>(0);

  const [retryCount, setRetryCount] = useState(0);
  const [isRecovering, setIsRecovering] = useState(false);
  const [recoveryFailed, setRecoveryFailed] = useState(false);
  const prevPausedRef = useRef(paused);

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
    sourceKindRef.current = videoSource.kind;
  }, [videoSource.kind]);

  useEffect(() => {
    if (manualReloadNonce > 0) {
      clearRecoveryTimers();
      setRecoveryFailed(false);
      setIsRecovering(false);
      setRetryCount((prev) => prev + 1);
    }
  }, [manualReloadNonce, clearRecoveryTimers]);

  useEffect(() => {
    clearRecoveryTimers();
    savedTimeRef.current = 0;
    setRetryCount(0);
    setIsRecovering(false);
    setRecoveryFailed(false);
    return () => clearRecoveryTimers();
  }, [episode.id, rawVideoUrl, clearRecoveryTimers]);

  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  useEffect(() => {
    onVideoEndedRef.current = onVideoEnded;
  }, [onVideoEnded]);

  const triggerAutoRecover = useCallback(
    (isDirect: boolean) => {
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
          return prev;
        }
        setIsRecovering(true);
        setRecoveryFailed(false);
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
    },
    []
  );

  const handleManualRetry = useCallback(() => {
    clearRecoveryTimers();
    setRecoveryFailed(false);
    setIsRecovering(true);
    setRetryCount((prev) => prev + 1);
  }, [clearRecoveryTimers]);

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
    const wasPaused = prevPausedRef.current;
    prevPausedRef.current = paused;

    if (videoSource.kind === 'youtube') {
      if (!paused && wasPaused && savedTimeRef.current > 0.5) {
        postYouTubeCommand(iframeRef.current, 'seekTo', [savedTimeRef.current, true]);
      }
      postYouTubeCommand(iframeRef.current, paused ? 'pauseVideo' : 'playVideo');
    } else if (videoSource.kind === 'dailymotion') {
      postDailymotionCommand(iframeRef.current, paused ? 'pause' : 'play');
    }

    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = 1;
      if (paused) {
        if (Number.isFinite(videoRef.current.currentTime) && videoRef.current.currentTime > 0) {
          savedTimeRef.current = videoRef.current.currentTime;
        }
        videoRef.current.pause();
        clearRecoveryTimers();
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
  }, [paused, resumePlaybackSignal, videoSource.kind, resolvedDirectUrl, muted, retryCount, clearRecoveryTimers]);

  useEffect(() => {
    if (videoSource.kind === 'youtube') {
      postYouTubeCommand(iframeRef.current, muted ? 'mute' : 'unMute');
      if (!muted) {
        postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
      }
    } else if (videoSource.kind === 'dailymotion') {
      postDailymotionCommand(iframeRef.current, 'muted', [muted]);
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

      if (playerState === 1) {
        clearRecoveryTimers();
        setIsRecovering(false);
        setRecoveryFailed(false);
        onPlayingChangeRef.current?.(true);
      } else if (playerState === 2) {
        clearRecoveryTimers();
        onPlayingChangeRef.current?.(false);
      } else if (playerState === 3) {
        if (!paused && stallTimerRef.current === null) {
          stallTimerRef.current = window.setTimeout(() => {
            stallTimerRef.current = null;
            postYouTubeCommand(iframeRef.current, 'playVideo');
            triggerAutoRecover(false);
          }, 7500);
        }
      } else if (playerState === 0) {
        clearRecoveryTimers();
        onPlayingChangeRef.current?.(false);
        onVideoEndedRef.current?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [videoSource.kind, paused, triggerAutoRecover, clearRecoveryTimers]);

  const handleIframeLoad = useCallback(() => {
    setIsRecovering(false);
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
      } else if (sourceKindRef.current === 'dailymotion') {
        postDailymotionCommand(iframeRef.current, 'muted', [mutedRef.current]);
      }
    } catch {
      // Ignore cross-origin postMessage restrictions
    }
  }, []);

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
    setIsRecovering(false);
    setRecoveryFailed(false);
  }, [clearRecoveryTimers]);

  const handleVideoPlaying = useCallback(() => {
    clearRecoveryTimers();
    setIsRecovering(false);
    setRecoveryFailed(false);
    onPlayingChangeRef.current?.(true);
  }, [clearRecoveryTimers]);

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
      setIsRecovering(false);
      setRecoveryFailed(false);
      onPlayingChangeRef.current?.(true);
    },
    [clearRecoveryTimers]
  );

  const handleVideoTimeUpdate = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (e.currentTarget.currentTime > 0) {
        savedTimeRef.current = e.currentTarget.currentTime;
      }
      if (stallTimerRef.current !== null) {
        clearRecoveryTimers();
        setIsRecovering(false);
      }
    },
    [clearRecoveryTimers]
  );

  const handleVideoWaitingOrStalled = useCallback(() => {
    if (!pausedRef.current && stallTimerRef.current === null) {
      stallTimerRef.current = window.setTimeout(() => {
        stallTimerRef.current = null;
        triggerAutoRecover(true);
      }, 4500);
    }
  }, [triggerAutoRecover]);

  const handleVideoError = useCallback(() => {
    onPlayingChangeRef.current?.(false);
    triggerAutoRecover(true);
  }, [triggerAutoRecover]);

  const handleVideoPause = useCallback(
    (e: React.SyntheticEvent<HTMLVideoElement>) => {
      if (e.currentTarget.currentTime > 0) {
        savedTimeRef.current = e.currentTarget.currentTime;
      }
      clearRecoveryTimers();
      onPlayingChangeRef.current?.(false);
    },
    [clearRecoveryTimers]
  );

  const handleVideoEnded = useCallback(() => {
    clearRecoveryTimers();
    onPlayingChangeRef.current?.(false);
    onVideoEndedRef.current?.();
  }, [clearRecoveryTimers]);

  const iframeClassName = `absolute inset-0 w-full h-full border-0 block pointer-events-auto transition-transform duration-300 ease-out origin-center ${
    zoomed ? 'object-cover scale-[1.95]' : 'object-contain scale-100'
  }`;

  const directVideoClassName = `absolute inset-0 w-full h-full bg-black transition-transform duration-300 ease-out origin-center ${
    zoomed ? 'object-cover scale-[1.95]' : 'object-contain scale-100'
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
    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3 bg-[#08080B]">
      <Film className="w-10 h-10 text-[#D4AF37]" />
      <p className="text-sm text-[#C4BDB0] max-w-sm">
        Paste a YouTube link, Dailymotion link (<span className="font-mono text-[#FCE7A2]">dai.ly/...</span>), or direct{' '}
        <span className="font-mono text-[#FCE7A2]">.mp4 / .m3u8</span> / Bunny Stream URL in{' '}
        <span className="font-mono text-[#FCE7A2]">/admin → Series Watch Sheet</span>.
      </p>
    </div>
  );
});

WatchVideoStage.displayName = 'WatchVideoStage';

export const EpisodeWatchScreen: React.FC<EpisodeWatchScreenProps> = ({
  episode,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal = 0,
  hasNextEpisode = false,
  nextEpisodeLabel,
  onNextEpisode,
  onToggleMute,
  onAwardCoinPot,
  onStartSponsorReward,
  onMarkEpisodeWatched,
  onClose,
}) => {
  const potReward = COIN_POT_BASE_REWARD;

  const [ringProgress, setRingProgress] = useState(0);
  const [rewardModalOpen, setRewardModalOpen] = useState(false);
  const [barPulse, setBarPulse] = useState(false);
  const [flyingBurst, setFlyingBurst] = useState<{ id: number; amount: number } | null>(null);
  const [isExpandedFull, setIsExpandedFull] = useState(false);
  const [isZoomed, setIsZoomed] = useState(true);
  const [videoReloadNonce, setVideoReloadNonce] = useState(0);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const awardingRef = useRef(false);
  const rewardModalOpenRef = useRef(false);
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

  const handlePlayingChange = useCallback((playing: boolean) => {
    if (!rewardModalOpenRef.current) {
      isVideoPlayingRef.current = playing;
    }
  }, []);

  const handleVideoEnded = useCallback(() => {
    void onMarkEpisodeWatchedRef.current?.(episodeRef.current);
  }, []);

  useEffect(() => {
    isVideoPlayingRef.current = true;
    rewardModalOpenRef.current = false;
    setRewardModalOpen(false);
    setRingProgress(0);
    setIsZoomed(true);
    setVideoReloadNonce(0);
  }, [episode.id]);

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

  // Fills Coin Ring up to 100% every 60s of playback, pauses video, and opens Congratulations modal
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
        rewardModalOpenRef.current
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
        setBarPulse(true);
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
      setBarPulse(true);
      window.setTimeout(() => {
        setBarPulse(false);
      }, 1000);
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

  const safeTarget = Math.max(500000, qualificationThreshold || 500000);
  const exactPct = Math.min(100, Math.max(0, (playerWeeklyCoins / safeTarget) * 100));
  const formattedPct =
    exactPct === 0
      ? '0%'
      : exactPct < 0.1
        ? `${exactPct.toFixed(3)}%`
        : exactPct < 10
          ? `${exactPct.toFixed(2)}%`
          : `${exactPct.toFixed(1)}%`;

  const potSize = 88;
  const strokeWidth = 5;
  const radius = (potSize - strokeWidth) / 2;
  const circumference = 2 * Math.PI * radius;
  const dashOffset = circumference * (1 - ringProgress / 100);

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
      className="fixed inset-0 z-[75] bg-[#09090b] flex items-center justify-center p-0 m-0"
    >
      <div
        ref={playerContainerRef}
        className="min-h-[100dvh] h-[100dvh] w-full flex flex-col bg-[#09090b] overflow-hidden"
      >
        {/* Top Episode Title Bar + Controls + Sunday Tournament Progress Bar */}
        <header className="flex-none bg-[#09090b] border-b border-[#D4AF37]/25 px-2.5 sm:px-5 pt-[max(0.45rem,env(safe-area-inset-top))] pb-1.5 space-y-1.5 z-40 relative">
          <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-1.5 sm:gap-2">
            <div className="flex items-center justify-between gap-2 min-w-0 sm:flex-1">
              <div className="flex-1 min-w-0">
                <p className="text-[11px] text-[#E8C96D] font-medium truncate">
                  {episode.series} · {episode.episodeLabel}
                </p>
                <h2 className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] truncate">
                  {episode.title}
                </h2>
              </div>

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close video player"
                className="sm:hidden min-h-[34px] min-w-[34px] rounded-xl border border-white/[0.15] flex items-center justify-center text-[#A69F91] hover:text-[#F6F2E9] hover:border-[#D4AF37]/45 transition-colors cursor-pointer shrink-0"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="flex items-center justify-between sm:justify-end gap-1 sm:gap-2 shrink-0">
              <div className="flex items-center gap-1 sm:gap-2">
                <button
                  type="button"
                  onClick={onToggleMute}
                  aria-pressed={!muted}
                  aria-label={muted ? 'Sound Off' : 'Sound On'}
                  className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    muted
                      ? 'border-white/[0.14] text-[#8D867A] hover:text-[#F6F2E9]'
                      : 'border-[#D4AF37]/40 bg-[#17130A] text-[#FCE7A2]'
                  }`}
                >
                  {muted ? <VolumeX className="w-4 h-4" /> : <Volume2 className="w-4 h-4 text-[#D4AF37]" />}
                  <span className="hidden sm:inline">{muted ? 'Sound Off' : 'Sound On'}</span>
                </button>

                <button
                  type="button"
                  onClick={() => setIsZoomed((prev) => !prev)}
                  aria-pressed={isZoomed}
                  aria-label={isZoomed ? 'Zoomed full-screen — tap to switch to Fit' : 'Standard Fit — tap to Zoom'}
                  title={isZoomed ? 'Zoomed (1.95x) — tap for Fit' : 'Fit — tap for Zoom'}
                  className={`min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 rounded-xl border text-[11px] sm:text-xs font-semibold inline-flex items-center gap-1 sm:gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
                    isZoomed
                      ? 'border-[#D4AF37]/45 bg-[#17130A] text-[#FCE7A2]'
                      : 'border-white/[0.14] text-[#A69F91] hover:text-[#F6F2E9]'
                  }`}
                >
                  {isZoomed ? (
                    <>
                      <ZoomIn className="w-3.5 h-3.5 text-[#D4AF37]" />
                      <span>Zoom / Fit</span>
                    </>
                  ) : (
                    <>
                      <Scan className="w-3.5 h-3.5" />
                      <span>Fit / Zoom</span>
                    </>
                  )}
                </button>

                <button
                  type="button"
                  onClick={() => void handleToggleFullscreen()}
                  aria-label={isExpandedFull ? 'Exit full screen' : 'Full screen'}
                  title={isExpandedFull ? 'Exit full screen' : 'Full screen'}
                  className="min-h-[34px] sm:min-h-[36px] px-2 sm:px-2.5 rounded-xl border border-[#D4AF37]/30 text-[#E8C96D] hover:bg-[#D4AF37]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
                >
                  {isExpandedFull ? (
                    <>
                      <Minimize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Exit Fullscreen</span>
                    </>
                  ) : (
                    <>
                      <Maximize2 className="w-4 h-4" />
                      <span className="hidden sm:inline">Fullscreen</span>
                    </>
                  )}
                </button>
              </div>

              {onNextEpisode && (
                <button
                  type="button"
                  onClick={onNextEpisode}
                  disabled={!hasNextEpisode}
                  title={
                    hasNextEpisode && nextEpisodeLabel
                      ? `Watch next: ${nextEpisodeLabel}`
                      : hasNextEpisode
                        ? 'Watch next episode'
                        : 'No more episodes'
                  }
                  className={`min-h-[34px] sm:min-h-[36px] px-2.5 sm:px-3 rounded-xl text-[11px] sm:text-xs font-extrabold inline-flex items-center gap-1 whitespace-nowrap transition-all ${
                    hasNextEpisode
                      ? 'bg-gradient-to-r from-[#FCE7A2] via-[#E8C96D] to-[#D4AF37] text-[#181307] shadow-[0_0_12px_rgba(212,175,55,0.35)] hover:brightness-110 active:scale-[0.98] cursor-pointer'
                      : 'border border-white/[0.1] bg-white/[0.04] text-zinc-500 cursor-not-allowed'
                  }`}
                >
                  <span>Next Episode ⏭️</span>
                </button>
              )}

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close video player"
                className="hidden sm:flex min-h-[36px] min-w-[36px] rounded-xl border border-white/[0.15] items-center justify-center text-[#A69F91] hover:text-[#F6F2E9] hover:border-[#D4AF37]/45 transition-colors cursor-pointer"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          </div>

          <div
            className={`rounded-xl bg-[#0D0D13] border px-3 py-1.5 space-y-1 transition-all duration-300 ${
              barPulse
                ? 'border-[#FCE7A2] shadow-[0_0_24px_rgba(243,211,122,0.5)]'
                : 'border-[#D4AF37]/25'
            }`}
          >
            <div className="flex flex-wrap items-center justify-between gap-2 text-[11px] sm:text-xs">
              <span className="inline-flex items-center gap-1.5 font-semibold text-[#E8C96D]">
                <Trophy className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                <span>Sunday Tournament Progress</span>
              </span>
              <div className="flex items-center gap-2 font-mono-num">
                <span className="font-bold text-[#FCE7A2]">
                  {playerWeeklyCoins.toLocaleString()} / {safeTarget.toLocaleString()} Coins
                </span>
                <span className="text-[#E8C96D] font-semibold">({formattedPct})</span>
                <span className="text-[#8D867A] hidden md:inline">
                  · Total: {playerTotalCoins.toLocaleString()}
                </span>
              </div>
            </div>
            <div
              role="progressbar"
              aria-valuenow={Math.min(safeTarget, playerWeeklyCoins)}
              aria-valuemin={0}
              aria-valuemax={safeTarget}
              aria-label="Sunday Tournament Progress toward 500,000 coins"
              className="h-2.5 w-full rounded-full bg-[#15151C] border border-white/[0.06] overflow-hidden"
            >
              <div
                className={`h-full rounded-full transition-all duration-500 ease-out ${
                  barPulse
                    ? 'bg-gradient-to-r from-[#FCE7A2] via-[#FFF6D6] to-[#D4AF37]'
                    : 'gold-gradient-bg'
                }`}
                style={{ width: `${exactPct}%` }}
              />
            </div>
          </div>
        </header>

        {/* Upper Video Container */}
        <div className="flex-1 min-h-0 relative w-full bg-[#09090b] overflow-hidden">
          <WatchVideoStage
            episode={episode}
            zoomed={isZoomed}
            paused={rewardModalOpen}
            muted={muted}
            resumePlaybackSignal={resumePlaybackSignal}
            manualReloadNonce={videoReloadNonce}
            onPlayingChange={handlePlayingChange}
            onVideoEnded={handleVideoEnded}
          />

          {/* Subtle mobile buffering recovery button near top player controls */}
          <button
            type="button"
            onClick={() => setVideoReloadNonce((prev) => prev + 1)}
            aria-label="Buffering? Reload Video"
            className="absolute top-2.5 left-2.5 z-30 px-2.5 py-1 rounded-full bg-black/55 hover:bg-black/80 border border-white/15 text-[10px] font-medium text-zinc-300 hover:text-amber-200 backdrop-blur-sm inline-flex items-center gap-1 transition cursor-pointer"
          >
            <RotateCcw className="w-2.5 h-2.5" />
            <span>Buffering? Reload Video</span>
          </button>

          {/* Bottom gradient overlay hiding YouTube's bottom watermark/logo + displaying episode title */}
          <div
            aria-hidden="true"
            className="absolute bottom-0 inset-x-0 h-16 bg-gradient-to-t from-[#09090b] via-[#09090b]/95 to-transparent pointer-events-none z-20 flex items-end px-4 pb-2.5"
          >
            <div className="min-w-0">
              <p className="text-[11px] font-mono-num font-semibold text-amber-300/95 truncate">
                {episode.series} · {episode.episodeLabel}
              </p>
              <p className="text-xs sm:text-sm font-display font-bold text-[#F6F2E9] truncate">
                {episode.title}
              </p>
            </div>
          </div>

          {/* Floating 3D Golden Treasure Coin Pot Widget */}
          <div className="pointer-events-auto absolute right-2 sm:right-4 top-[18%] z-30 flex flex-col items-center">
            {flyingBurst && (
              <div
                key={flyingBurst.id}
                className="coin-shoot-up pointer-events-none flex flex-col items-center gap-1"
              >
                <RealisticGoldCoin sizePx={52} emblem="$" />
                <span className="px-3 py-1 rounded-full gold-gradient-bg text-[#181307] font-mono-num text-xs font-extrabold shadow-lg shadow-[#D4AF37]/60 inline-flex items-center gap-1">
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>+{flyingBurst.amount}</span>
                </span>
              </div>
            )}

            <div className="relative w-[88px] h-[88px] rounded-full bg-[#0D0A05]/92 backdrop-blur-md border border-[#FCE7A2]/45 shadow-[0_10px_32px_rgba(0,0,0,0.8)] flex items-center justify-center">
              <div className="absolute -top-5 -left-5 pointer-events-none">
                <RealisticGoldCoin sizePx={48} emblem="★" />
              </div>

              <svg
                width={potSize}
                height={potSize}
                viewBox={`0 0 ${potSize} ${potSize}`}
                className="-rotate-90 absolute inset-0"
                aria-hidden="true"
              >
                <defs>
                  <linearGradient id="coin-pot-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                    <stop offset="0%" stopColor="#FFF7CC" />
                    <stop offset="50%" stopColor="#D4AF37" />
                    <stop offset="100%" stopColor="#A88220" />
                  </linearGradient>
                </defs>
                <circle
                  cx={potSize / 2}
                  cy={potSize / 2}
                  r={radius}
                  fill="none"
                  stroke="rgba(255,255,255,0.14)"
                  strokeWidth={strokeWidth}
                />
                <circle
                  cx={potSize / 2}
                  cy={potSize / 2}
                  r={radius}
                  fill="none"
                  stroke="url(#coin-pot-ring-grad)"
                  strokeWidth={strokeWidth}
                  strokeLinecap="round"
                  strokeDasharray={circumference}
                  strokeDashoffset={dashOffset}
                  className="transition-[stroke-dashoffset] duration-150 ease-linear"
                />
              </svg>

              <TreasureCoinPot3D ringProgress={ringProgress} pulsing={barPulse} />
            </div>

            <span className="mt-1 px-2.5 py-0.5 rounded-full bg-black/85 border border-[#D4AF37]/55 font-mono-num text-[11px] font-bold text-[#FCE7A2]">
              +{potReward}
            </span>
          </div>
        </div>

        {/* Dedicated Bottom Banner Footer cleanly beneath the video frame */}
        <footer className="pb-[max(0.25rem,env(safe-area-inset-bottom))] pt-1 shrink-0 w-full bg-[#09090b] border-t border-white/10 flex flex-col items-center justify-center z-40 relative">
          <BottomAdBanner />
          <p className="text-[10px] text-gray-500 text-center mt-1 leading-tight px-2">
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
