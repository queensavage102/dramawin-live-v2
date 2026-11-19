import React, { useEffect, useRef, useState } from 'react';
import {
  Film,
  Maximize2,
  Minimize2,
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
  getYouTubeEmbedUrl,
  isYouTubeDomainOnly,
  sanitizeMediaUrl,
} from '../constants';
import { DramaEpisode } from '../types';
import { useResolvedMediaUrl } from '../utils/mediaStore';
import { BottomAdBanner } from './BottomAdBanner';
import { DoubleRewardModal } from './DoubleRewardModal';
import { RealisticGoldCoin } from './RealisticGoldCoin';

interface EpisodeWatchScreenProps {
  episode: DramaEpisode;
  sponsorAdUrl?: string;
  playerWeeklyCoins: number;
  playerTotalCoins: number;
  qualificationThreshold: number;
  muted: boolean;
  resumePlaybackSignal?: number;
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

const WatchVideoStage: React.FC<{
  episode: DramaEpisode;
  zoomed: boolean;
  paused: boolean;
  muted: boolean;
  resumePlaybackSignal: number;
  onPlayingChange?: (playing: boolean) => void;
  onVideoEnded?: () => void;
}> = ({ episode, zoomed, paused, muted, resumePlaybackSignal, onPlayingChange, onVideoEnded }) => {
  const rawVideoUrl = sanitizeMediaUrl((episode.videoUrl || episode.youtubeUrl || '').trim());
  const customStart =
    typeof episode.startTime === 'number' && Number.isFinite(episode.startTime)
      ? Math.max(0, Math.floor(episode.startTime))
      : undefined;
  const embedUrl = rawVideoUrl ? getYouTubeEmbedUrl(rawVideoUrl, customStart, false) : null;
  const bareYouTubeDomain = rawVideoUrl ? isYouTubeDomainOnly(rawVideoUrl) : false;
  const resolvedMediaUrl = useResolvedMediaUrl(embedUrl || bareYouTubeDomain ? '' : rawVideoUrl);

  const iframeRef = useRef<HTMLIFrameElement | null>(null);
  const videoRef = useRef<HTMLVideoElement | null>(null);
  const onPlayingChangeRef = useRef(onPlayingChange);
  const onVideoEndedRef = useRef(onVideoEnded);

  useEffect(() => {
    onPlayingChangeRef.current = onPlayingChange;
  }, [onPlayingChange]);

  useEffect(() => {
    onVideoEndedRef.current = onVideoEnded;
  }, [onVideoEnded]);

  useEffect(() => {
    if (embedUrl || (resolvedMediaUrl && !isDirectVideoMediaUrl(resolvedMediaUrl))) {
      postYouTubeCommand(iframeRef.current, paused ? 'pauseVideo' : 'playVideo');
    }
    if (videoRef.current) {
      videoRef.current.muted = muted;
      videoRef.current.volume = 1;
      if (paused) {
        videoRef.current.pause();
      } else {
        void videoRef.current.play().catch(() => {});
      }
    }
  }, [paused, resumePlaybackSignal, embedUrl, resolvedMediaUrl, muted]);

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
  }, [muted, embedUrl, resolvedMediaUrl]);

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

      if (playerState === 1) {
        onPlayingChangeRef.current?.(true);
      } else if (playerState === 2) {
        onPlayingChangeRef.current?.(false);
      } else if (playerState === 0) {
        onPlayingChangeRef.current?.(false);
        onVideoEndedRef.current?.();
      }
    };

    window.addEventListener('message', handleMessage);
    return () => window.removeEventListener('message', handleMessage);
  }, [embedUrl, resolvedMediaUrl]);

  const handleIframeLoad = () => {
    try {
      iframeRef.current?.contentWindow?.postMessage(
        '{"event":"listening","id":"dramawin-watch-player"}',
        '*'
      );
      if (muted) {
        postYouTubeCommand(iframeRef.current, 'mute');
      } else {
        postYouTubeCommand(iframeRef.current, 'unMute');
        postYouTubeCommand(iframeRef.current, 'setVolume', [100]);
      }
    } catch {
      // Ignore cross-origin postMessage restrictions
    }
  };

  if (embedUrl) {
    return (
      <iframe
        ref={iframeRef}
        key={`${episode.id}-${embedUrl}`}
        src={embedUrl}
        title={episode.title}
        onLoad={handleIframeLoad}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className={`absolute inset-0 w-full h-full border-0 block pointer-events-auto transition-transform duration-300 ease-out origin-center ${
          zoomed ? 'object-cover scale-[1.95]' : 'object-contain scale-100'
        }`}
      />
    );
  }

  if (resolvedMediaUrl) {
    if (isDirectVideoMediaUrl(rawVideoUrl) || isDirectVideoMediaUrl(resolvedMediaUrl)) {
      return (
        <video
          ref={videoRef}
          key={`${episode.id}-${resolvedMediaUrl}`}
          src={resolvedMediaUrl}
          controls
          autoPlay
          muted={muted}
          playsInline
          onLoadedMetadata={(e) => {
            e.currentTarget.muted = muted;
            e.currentTarget.volume = 1;
          }}
          onPlay={(e) => {
            e.currentTarget.muted = muted;
            e.currentTarget.volume = 1;
            onPlayingChangeRef.current?.(true);
          }}
          onPause={() => onPlayingChangeRef.current?.(false)}
          onEnded={() => {
            onPlayingChangeRef.current?.(false);
            onVideoEndedRef.current?.();
          }}
          className={`absolute inset-0 w-full h-full bg-black transition-transform duration-300 ease-out origin-center ${
            zoomed ? 'object-cover scale-[1.95]' : 'object-contain scale-100'
          }`}
        />
      );
    }

    const finalIframeUrl =
      /youtube\.com|youtu\.be/i.test(resolvedMediaUrl) &&
      !resolvedMediaUrl.includes('enablejsapi=1')
        ? `${resolvedMediaUrl}${resolvedMediaUrl.includes('?') ? '&' : '?'}enablejsapi=1`
        : resolvedMediaUrl;

    return (
      <iframe
        ref={iframeRef}
        key={`${episode.id}-${finalIframeUrl}`}
        src={finalIframeUrl}
        title={episode.title}
        onLoad={handleIframeLoad}
        referrerPolicy="strict-origin-when-cross-origin"
        allow="accelerometer; autoplay; clipboard-write; encrypted-media; gyroscope; picture-in-picture; web-share; fullscreen"
        allowFullScreen
        className={`absolute inset-0 w-full h-full border-0 block pointer-events-auto transition-transform duration-300 ease-out origin-center ${
          zoomed ? 'object-cover scale-[1.95]' : 'object-contain scale-100'
        }`}
      />
    );
  }

  return (
    <div className="absolute inset-0 w-full h-full flex flex-col items-center justify-center p-6 text-center gap-3 bg-[#08080B]">
      <Film className="w-10 h-10 text-[#D4AF37]" />
      <p className="text-sm text-[#C4BDB0] max-w-sm">
        Paste a specific YouTube video (<span className="font-mono text-[#FCE7A2]">youtu.be/...</span> or{' '}
        <span className="font-mono text-[#FCE7A2]">?v=...</span>), playlist (<span className="font-mono text-[#FCE7A2]">?list=...</span>), or MP4 link in{' '}
        <span className="font-mono text-[#FCE7A2]">/admin → Series Watch Sheet</span>.
      </p>
    </div>
  );
};

export const EpisodeWatchScreen: React.FC<EpisodeWatchScreenProps> = ({
  episode,
  sponsorAdUrl,
  playerWeeklyCoins,
  playerTotalCoins,
  qualificationThreshold,
  muted,
  resumePlaybackSignal = 0,
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

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const awardingRef = useRef(false);
  const rewardModalOpenRef = useRef(false);
  const resetPotTimerRef = useRef(false);
  const onAwardRef = useRef(onAwardCoinPot);
  const episodeRef = useRef(episode);
  const isVideoPlayingRef = useRef(true);

  useEffect(() => {
    onAwardRef.current = onAwardCoinPot;
  }, [onAwardCoinPot]);

  useEffect(() => {
    episodeRef.current = episode;
    isVideoPlayingRef.current = true;
    rewardModalOpenRef.current = false;
    setRewardModalOpen(false);
    setRingProgress(0);
    setIsZoomed(true);
  }, [episode]);

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

  const handleClaimPotReward = async (amount: number) => {
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
      rewardModalOpenRef.current = false;
      resetPotTimerRef.current = true;
      isVideoPlayingRef.current = true;
      setRewardModalOpen(false);
      setRingProgress(0);
      awardingRef.current = false;
    }
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
        className="h-screen h-[100dvh] w-full flex flex-col bg-[#09090b] overflow-hidden"
      >
        {/* Top Episode Title Bar + Controls + Sunday Tournament Progress Bar */}
        <header className="flex-none bg-[#09090b] border-b border-[#D4AF37]/25 px-3 sm:px-5 pt-2 pb-2 space-y-1.5 z-30">
          <div className="flex items-center justify-between gap-2">
            <div className="min-w-0">
              <p className="text-[11px] text-[#E8C96D] font-medium truncate">
                {episode.series} · {episode.episodeLabel}
              </p>
              <h2 className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] truncate">
                {episode.title}
              </h2>
            </div>

            <div className="flex items-center gap-1.5 sm:gap-2 shrink-0">
              <button
                type="button"
                onClick={onToggleMute}
                aria-pressed={!muted}
                aria-label={muted ? 'Sound Off' : 'Sound On'}
                className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
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
                className={`min-h-[38px] px-2.5 rounded-xl border text-xs font-semibold inline-flex items-center gap-1.5 transition-colors whitespace-nowrap cursor-pointer ${
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
                className="min-h-[38px] px-2.5 rounded-xl border border-[#D4AF37]/30 text-[#E8C96D] hover:bg-[#D4AF37]/10 text-xs font-semibold inline-flex items-center gap-1.5 transition-colors cursor-pointer"
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

              <button
                type="button"
                onClick={handleClose}
                aria-label="Close video player"
                className="min-h-[38px] min-w-[38px] rounded-xl border border-white/[0.15] flex items-center justify-center text-[#A69F91] hover:text-[#F6F2E9] hover:border-[#D4AF37]/45 transition-colors cursor-pointer"
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
            onPlayingChange={(playing) => {
              if (!rewardModalOpenRef.current) {
                isVideoPlayingRef.current = playing;
              }
            }}
            onVideoEnded={() => {
              void onMarkEpisodeWatched?.(episodeRef.current);
            }}
          />

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
        <footer className="h-[62px] shrink-0 w-full bg-[#09090b] border-t border-white/10 flex items-center justify-center z-30">
          <BottomAdBanner />
        </footer>
      </div>

      {/* Celebratory Coin Ring Complete (+300 / AD Double Rewards x2 +600) Modal */}
      <DoubleRewardModal
        open={rewardModalOpen}
        baseCoins={potReward}
        sponsorUrl={episode.sponsorUrl || sponsorAdUrl || DEFAULT_SPONSOR_URL}
        episodeTitle={`${episode.series} — ${episode.episodeLabel}`}
        onStartSponsorTimer={() => onStartSponsorReward?.()}
        onClaimDouble={() => handleClaimPotReward(potReward * 2)}
        onClaimBase={() => handleClaimPotReward(potReward)}
      />
    </div>
  );
};
