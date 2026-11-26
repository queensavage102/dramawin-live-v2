import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ArrowLeft,
  Check,
  ChevronDown,
  ChevronUp,
  Coins,
  Film,
  Lock,
  LogOut,
  Maximize2,
  Minimize2,
  Pause,
  Play,
  Radio,
  RotateCcw,
  Scan,
  Share2,
  SkipForward,
  Trophy,
  Tv,
  Unlock,
  Users,
  Volume2,
  VolumeX,
  ZoomIn,
} from 'lucide-react';
import {
  COIN_POT_BASE_REWARD,
  COIN_POT_CYCLE_SECONDS,
  DEFAULT_SPONSOR_URL,
  WATCH_PARTY_COINS_MULTIPLIER,
  WATCH_PARTY_PRIVATE_CAPACITY,
  WATCH_PARTY_PUBLIC_CAPACITY,
  buildWatchPartyInviteLink,
  getEpisodeSeriesId,
  resolveVideoSource,
  sanitizeMediaUrl,
} from '../constants';
import { DramaEpisode, WatchPartyRoom } from '../types';
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
import { WatchPartyOverlay } from './WatchPartyOverlay';

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
  watchPartyRoom?: WatchPartyRoom | null;
  watchPartyRole?: 'host' | 'guest';
  watchPartyViewerCount?: number;
  watchPartyUsername?: string;
  onOpenWatchPartyLobby?: (currentEpisode: DramaEpisode) => void;
  onLeaveWatchParty?: () => void;
  onSyncHostPlayback?: (playback: { isPlaying: boolean; currentTime: number }) => void;
  onSwitchWatchPartyEpisode?: (episode: DramaEpisode) => Promise<void>;
  onDeductSuperReactionCoins?: (cost: number, title: string) => Promise<boolean>;
  onNotifyWatchParty?: (message: string, tone?: 'gold' | 'neutral' | 'error') => void;
  onUnlockArchiveMovie?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onUnlockArchiveMovieWithAd?: (identifier: string, movieTitle: string) => Promise<boolean>;
  onRecordWatchSeconds?: (deltaSeconds: number) => void;
  onRecordEpisodeCompleted?: (episodeId: string) => void;
  onGoToBoost?: () => void;
  onNextEpisode?: () => void;
  onSelectEpisode?: (episode: DramaEpisode) => void;
  onShareEpisode?: (episode: DramaEpisode) => void;
  onClaimGiftBoxCoins?: () => Promise<void>;
  onToggleMute: () => void;
  onAwardCoinPot: (episode: DramaEpisode, amount: number) => Promise<void>;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: { claimLabel?: string; readyHeadline?: string }
  ) => void;
  onMarkEpisodeWatched?: (episode: DramaEpisode) => Promise<void>;
  onClose: () => void;
}

function formatPlaybackClock(rawSeconds: number): string {
  const safe = Math.max(0, Math.floor(Number.isFinite(rawSeconds) ? rawSeconds : 0));
  const hrs = Math.floor(safe / 3600);
  const mins = Math.floor((safe % 3600) / 60);
  const secs = safe % 60;
  if (hrs > 0) {
    return `${hrs}:${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
  }
  return `${String(mins).padStart(2, '0')}:${String(secs).padStart(2, '0')}`;
}

function parseDailymotionMessage(data: unknown): Record<string, unknown> | null {
  if (typeof data === 'string') {
    const trimmed = data.trim();
    if (!trimmed) return null;
    if (trimmed.startsWith('{')) {
      try {
        return JSON.parse(trimmed) as Record<string, unknown>;
      } catch {
        return null;
      }
    }
    if (trimmed.includes('=')) {
      const params = new URLSearchParams(trimmed);
      const out: Record<string, unknown> = {};
      params.forEach((v, k) => {
        const num = Number(v);
        out[k] = v !== '' && Number.isFinite(num) && /^-?\d+(\.\d+)?$/.test(v) ? num : v;
      });
      return out;
    }
    return null;
  }
  if (data && typeof data === 'object') {
    return data as Record<string, unknown>;
  }
  return null;
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
  seekRequest?: { time: number; nonce: number } | null;
  ccSubtitles?: boolean;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
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
    seekRequest = null,
    ccSubtitles = true,
    onTimeUpdate,
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
          ccSubtitles,
        }),
      [rawVideoUrl, customStart, ccSubtitles]
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
    const onTimeUpdateRef = useRef(onTimeUpdate);
    const isPreviewLockedRef = useRef(isPreviewLocked);
    const mutedRef = useRef(muted);
    const pausedRef = useRef(paused);
    const playbackRateRef = useRef(playbackRate);
    const sourceKindRef = useRef(videoSource.kind);
    const stallTimerRef = useRef<number | null>(null);
    const stallPillTimerRef = useRef<number | null>(null);
    const retryDelayTimerRef = useRef<number | null>(null);
    const savedTimeRef = useRef<number>(0);
    const knownDurationRef = useRef<number>(0);
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
      knownDurationRef.current = 0;
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
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    useEffect(() => {
      isPreviewLockedRef.current = isPreviewLocked;
    }, [isPreviewLocked]);

    useEffect(() => {
      if (!seekRequest || seekRequest.nonce <= 0) return;
      const target = Math.max(0, seekRequest.time);
      savedTimeRef.current = target;
      if (videoSource.kind === 'youtube') {
        postYouTubeCommand(iframeRef.current, 'seekTo', [target, true]);
      } else if (videoSource.kind === 'dailymotion') {
        postDailymotionCommand(iframeRef.current, 'seek', [target]);
        if (!pausedRef.current) {
          postDailymotionCommand(iframeRef.current, 'play');
        }
      } else if (videoSource.kind === 'vimeo') {
        postVimeoCommand(iframeRef.current, 'setCurrentTime', target);
      }
      if (videoRef.current) {
        try {
          const maxTime = Number.isFinite(videoRef.current.duration)
            ? Math.max(0, videoRef.current.duration - 0.5)
            : target;
          videoRef.current.currentTime = Math.min(target, maxTime);
        } catch {
          // Ignore seek errors before readyState
        }
      }
    }, [seekRequest, videoSource.kind]);

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
      if (videoSource.kind !== 'youtube' && videoSource.kind !== 'dailymotion' && videoSource.kind !== 'vimeo') {
        return;
      }
      const handleMessage = (event: MessageEvent) => {
        const origin = typeof event.origin === 'string' ? event.origin.toLowerCase() : '';

        if (videoSource.kind === 'dailymotion') {
          if (origin && !origin.includes('dailymotion.com')) return;
          const dm = parseDailymotionMessage(event.data);
          if (!dm) return;
          const evName = typeof dm.event === 'string' ? dm.event.toLowerCase() : '';
          const dmTime = typeof dm.time === 'number' ? dm.time : typeof dm.currentTime === 'number' ? dm.currentTime : null;
          const dmDur = typeof dm.duration === 'number' ? dm.duration : null;

          if (dmDur !== null && Number.isFinite(dmDur) && dmDur > 0) {
            knownDurationRef.current = dmDur;
            onTimeUpdateRef.current?.(savedTimeRef.current, dmDur);
          }

          if (dmTime !== null && Number.isFinite(dmTime) && dmTime >= 0) {
            if (isPreviewLockedRef.current && dmTime >= PREVIEW_FREE_SECONDS) {
              savedTimeRef.current = PREVIEW_FREE_SECONDS - 1;
              postDailymotionCommand(iframeRef.current, 'seek', [PREVIEW_FREE_SECONDS - 1]);
              postDailymotionCommand(iframeRef.current, 'pause');
              clearRecoveryTimers();
              clearStallPill();
              onPlayingChangeRef.current?.(false);
              onPreviewLimitReachedRef.current?.();
              return;
            }
            savedTimeRef.current = dmTime;
            onTimeUpdateRef.current?.(dmTime, knownDurationRef.current);
          }

          if (evName === 'playing' || evName === 'play') {
            clearRecoveryTimers();
            clearStallPill();
            setIsRecovering(false);
            setRecoveryFailed(false);
            onPlayingChangeRef.current?.(true);
          } else if (evName === 'pause') {
            clearRecoveryTimers();
            clearStallPill();
            onPlayingChangeRef.current?.(false);
          } else if (evName === 'video_end' || evName === 'end') {
            clearRecoveryTimers();
            clearStallPill();
            onPlayingChangeRef.current?.(false);
            onVideoEndedRef.current?.();
          } else if (evName === 'error') {
            onPlayingChangeRef.current?.(false);
            scheduleStallPill();
            triggerAutoRecover(false);
          }
          return;
        }

        if (videoSource.kind === 'vimeo') {
          if (origin && !origin.includes('vimeo.com')) return;
          let vimeoPayload: { event?: string; data?: { seconds?: number; duration?: number } } | null = null;
          if (typeof event.data === 'string') {
            try {
              vimeoPayload = JSON.parse(event.data) as { event?: string; data?: { seconds?: number; duration?: number } };
            } catch {
              return;
            }
          } else if (event.data && typeof event.data === 'object') {
            vimeoPayload = event.data as { event?: string; data?: { seconds?: number; duration?: number } };
          }
          if (!vimeoPayload) return;
          if (vimeoPayload.event === 'timeupdate' || vimeoPayload.event === 'playProgress') {
            const sec = typeof vimeoPayload.data?.seconds === 'number' ? vimeoPayload.data.seconds : savedTimeRef.current;
            const dur = typeof vimeoPayload.data?.duration === 'number' ? vimeoPayload.data.duration : knownDurationRef.current;
            if (dur > 0) knownDurationRef.current = dur;
            if (isPreviewLockedRef.current && sec >= PREVIEW_FREE_SECONDS) {
              savedTimeRef.current = PREVIEW_FREE_SECONDS - 1;
              postVimeoCommand(iframeRef.current, 'setCurrentTime', PREVIEW_FREE_SECONDS - 1);
              postVimeoCommand(iframeRef.current, 'pause');
              onPlayingChangeRef.current?.(false);
              onPreviewLimitReachedRef.current?.();
              return;
            }
            savedTimeRef.current = sec;
            onTimeUpdateRef.current?.(sec, knownDurationRef.current);
          } else if (vimeoPayload.event === 'play') {
            clearRecoveryTimers();
            clearStallPill();
            onPlayingChangeRef.current?.(true);
          } else if (vimeoPayload.event === 'pause') {
            onPlayingChangeRef.current?.(false);
          } else if (vimeoPayload.event === 'finish') {
            onPlayingChangeRef.current?.(false);
            onVideoEndedRef.current?.();
          }
          return;
        }

        if (origin && !origin.includes('youtube.com') && !origin.includes('youtube-nocookie.com')) {
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

        if (payload.info && typeof payload.info === 'object') {
          const infoObj = payload.info as { currentTime?: unknown; duration?: unknown; playerState?: unknown };
          if (typeof infoObj.duration === 'number' && Number.isFinite(infoObj.duration) && infoObj.duration > 0) {
            knownDurationRef.current = infoObj.duration;
          }
          if (typeof infoObj.currentTime === 'number' && Number.isFinite(infoObj.currentTime) && infoObj.currentTime >= 0) {
            const ytTime = infoObj.currentTime;
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
            onTimeUpdateRef.current?.(ytTime, knownDurationRef.current);
          } else if (knownDurationRef.current > 0) {
            onTimeUpdateRef.current?.(savedTimeRef.current, knownDurationRef.current);
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
          if (savedTimeRef.current > 1) {
            postDailymotionCommand(iframeRef.current, 'seek', [savedTimeRef.current]);
          }
          postDailymotionCommand(iframeRef.current, pausedRef.current ? 'pause' : 'play');
          if (!pausedRef.current) {
            window.setTimeout(() => {
              if (!pausedRef.current && sourceKindRef.current === 'dailymotion') {
                postDailymotionCommand(iframeRef.current, 'play');
              }
            }, 450);
          }
        } else if (sourceKindRef.current === 'vimeo') {
          postVimeoCommand(iframeRef.current, 'setMuted', mutedRef.current);
          postVimeoCommand(iframeRef.current, 'setVolume', mutedRef.current ? 0 : 1);
          postVimeoCommand(iframeRef.current, 'setPlaybackRate', playbackRateRef.current);
        }
      } catch {
        // Ignore cross-origin postMessage restrictions
      }
    }, [clearStallPill]);

    const handleVideoLoadedMetadata = useCallback((e: React.SyntheticEvent<HTMLVideoElement>) => {
      e.currentTarget.muted = mutedRef.current;
      e.currentTarget.volume = 1;
      e.currentTarget.playbackRate = playbackRateRef.current;
      if (Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0) {
        knownDurationRef.current = e.currentTarget.duration;
        onTimeUpdateRef.current?.(e.currentTarget.currentTime || 0, e.currentTarget.duration);
      }
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
        const vidDur =
          Number.isFinite(e.currentTarget.duration) && e.currentTarget.duration > 0
            ? e.currentTarget.duration
            : knownDurationRef.current;
        if (vidDur > 0) {
          knownDurationRef.current = vidDur;
        }
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
        if (nowTime >= 0) {
          savedTimeRef.current = nowTime;
          onTimeUpdateRef.current?.(nowTime, knownDurationRef.current);
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

    const isAnime = (episode.category || '').toLowerCase() === 'anime';
    const scaleClass = ccSubtitles
      ? 'scale-[1.45] translate-y-2'
      : isAnime
        ? 'scale-[1.85] -translate-y-4'
        : 'scale-[1.75]';

    const iframeClassName = fitMode
      ? 'pointer-events-none absolute inset-0 z-0 w-full h-full border-0 block bg-transparent scale-100 transition-transform duration-300 ease-out'
      : `pointer-events-none absolute inset-0 z-0 w-full h-full border-0 block bg-transparent ${scaleClass} transition-transform duration-300 ease-out`;

    const directVideoClassName = `pointer-events-none absolute inset-0 z-0 w-full h-full bg-transparent transition-transform duration-300 ease-out ${
      fitMode ? 'object-contain scale-100' : `object-cover ${scaleClass}`
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
  watchPartyRoom = null,
  watchPartyRole = 'guest',
  watchPartyViewerCount = 1,
  watchPartyUsername = 'Player',
  onOpenWatchPartyLobby,
  onLeaveWatchParty,
  onSyncHostPlayback,
  onSwitchWatchPartyEpisode,
  onDeductSuperReactionCoins,
  onNotifyWatchParty,
  onUnlockArchiveMovie,
  onUnlockArchiveMovieWithAd,
  onRecordWatchSeconds,
  onRecordEpisodeCompleted,
  onGoToBoost,
  onNextEpisode,
  onToggleMute,
  onAwardCoinPot,
  onStartSponsorReward,
  onMarkEpisodeWatched,
  onClose,
}) => {
  const inWatchParty = Boolean(watchPartyRoom && watchPartyRoom.status === 'active');
  const isPrivateLobby =
    inWatchParty && Boolean(watchPartyRoom?.isPrivate === true || watchPartyRoom?.isPublic === false);
  // When inside any Watch Lobby, disable 3-minute preview lock so movie plays uninterrupted!
  const effectiveArchiveLocked = isArchiveLocked && !inWatchParty;
  const coinPotMultiplier = inWatchParty ? WATCH_PARTY_COINS_MULTIPLIER : 1;
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
  const [currentTimeSec, setCurrentTimeSec] = useState(0);
  const [durationSec, setDurationSec] = useState(0);
  const [seekRequest, setSeekRequest] = useState<{ time: number; nonce: number } | null>(null);
  const [partySwitcherOpen, setPartySwitcherOpen] = useState(false);
  const [inviteCopied, setInviteCopied] = useState(false);
  const [ccSubtitlesOn, setCcSubtitlesOn] = useState(true);

  const handleCopyInviteLink = useCallback(() => {
    if (!watchPartyRoom) return;
    const inviteUrl = buildWatchPartyInviteLink(watchPartyRoom.roomId);
    const copyFallback = () => {
      try {
        const el = document.createElement('textarea');
        el.value = inviteUrl;
        el.setAttribute('readonly', '');
        el.className = 'sr-only';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
        setInviteCopied(true);
        onNotifyWatchParty?.(
          `Invite link copied! (?lobby=${watchPartyRoom.roomId})`,
          'gold'
        );
        window.setTimeout(() => setInviteCopied(false), 2000);
      } catch {
        onOpenWatchPartyLobby?.(episode);
      }
    };

    if (typeof navigator !== 'undefined' && navigator.clipboard?.writeText) {
      void navigator.clipboard
        .writeText(inviteUrl)
        .then(() => {
          setInviteCopied(true);
          onNotifyWatchParty?.(
            `Invite link copied! (?lobby=${watchPartyRoom.roomId})`,
            'gold'
          );
          window.setTimeout(() => setInviteCopied(false), 2000);
        })
        .catch(copyFallback);
    } else {
      copyFallback();
    }
  }, [watchPartyRoom, episode, onNotifyWatchParty, onOpenWatchPartyLobby]);

  const playerContainerRef = useRef<HTMLDivElement | null>(null);
  const awardingRef = useRef(false);
  const rewardModalOpenRef = useRef(false);
  const previewLockOpenRef = useRef(false);
  const previewElapsedMsRef = useRef(0);
  const watchSecondsBufferRef = useRef(0);
  const resetPotTimerRef = useRef(false);
  const lastRemoteTimeUpdateRef = useRef(0);
  const episodeCompletedFiredRef = useRef(false);
  const activeEpisodeWatchMsRef = useRef(0);
  const currentTimeSecRef = useRef(0);
  const coinPotMultiplierRef = useRef(coinPotMultiplier);
  const onAwardRef = useRef(onAwardCoinPot);
  const onMarkEpisodeWatchedRef = useRef(onMarkEpisodeWatched);
  const onRecordWatchSecondsRef = useRef(onRecordWatchSeconds);
  const onRecordEpisodeCompletedRef = useRef(onRecordEpisodeCompleted);
  const onSyncHostPlaybackRef = useRef(onSyncHostPlayback);
  const episodeRef = useRef(episode);
  const isVideoPlayingRef = useRef(true);

  useEffect(() => {
    coinPotMultiplierRef.current = coinPotMultiplier;
  }, [coinPotMultiplier]);

  useEffect(() => {
    onSyncHostPlaybackRef.current = onSyncHostPlayback;
  }, [onSyncHostPlayback]);

  useEffect(() => {
    onAwardRef.current = onAwardCoinPot;
  }, [onAwardCoinPot]);

  useEffect(() => {
    onMarkEpisodeWatchedRef.current = onMarkEpisodeWatched;
  }, [onMarkEpisodeWatched]);

  useEffect(() => {
    onRecordWatchSecondsRef.current = onRecordWatchSeconds;
  }, [onRecordWatchSeconds]);

  useEffect(() => {
    onRecordEpisodeCompletedRef.current = onRecordEpisodeCompleted;
  }, [onRecordEpisodeCompleted]);

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

  const markEpisodeFullyCompleted = useCallback(() => {
    if (episodeCompletedFiredRef.current) return;
    episodeCompletedFiredRef.current = true;
    void onMarkEpisodeWatchedRef.current?.(episodeRef.current);
    onRecordEpisodeCompletedRef.current?.(episodeRef.current.id);
  }, []);

  const handlePlayingChange = useCallback(
    (playing: boolean) => {
      if (!rewardModalOpenRef.current && !previewLockOpenRef.current) {
        isVideoPlayingRef.current = playing;
        if (inWatchParty && watchPartyRole === 'host') {
          onSyncHostPlaybackRef.current?.({
            isPlaying: playing,
            currentTime: currentTimeSecRef.current,
          });
        }
      }
    },
    [inWatchParty, watchPartyRole]
  );

  const handleTogglePlayPause = useCallback(() => {
    if (rewardModalOpenRef.current || previewLockOpenRef.current) return;
    if (inWatchParty && watchPartyRole === 'guest') {
      onNotifyWatchParty?.(
        `Synced to Host (${watchPartyRoom?.hostName || 'Host'})`,
        'neutral'
      );
      return;
    }
    setUserPaused((prev) => {
      const nextPaused = !prev;
      isVideoPlayingRef.current = !nextPaused;
      if (inWatchParty && watchPartyRole === 'host') {
        onSyncHostPlaybackRef.current?.({
          isPlaying: !nextPaused,
          currentTime: currentTimeSecRef.current,
        });
      }
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
  }, [inWatchParty, watchPartyRole, watchPartyRoom?.hostName, onNotifyWatchParty]);

  const handleVideoEnded = useCallback(() => {
    markEpisodeFullyCompleted();
  }, [markEpisodeFullyCompleted]);

  const handleStageTimeUpdate = useCallback(
    (timeSec: number, durSec: number) => {
      lastRemoteTimeUpdateRef.current = Date.now();
      if (Number.isFinite(timeSec) && timeSec >= 0) {
        currentTimeSecRef.current = timeSec;
        setCurrentTimeSec(timeSec);
      }
      if (Number.isFinite(durSec) && durSec > 0) {
        setDurationSec(durSec);
        if (durSec >= 15 && timeSec >= durSec * 0.85) {
          markEpisodeFullyCompleted();
        }
      }
    },
    [markEpisodeFullyCompleted]
  );

  const handleScrubSeek = useCallback(
    (rawTarget: number) => {
      if (inWatchParty && watchPartyRole === 'guest') {
        onNotifyWatchParty?.(
          `Only Host (${watchPartyRoom?.hostName || 'Host'}) controls playback timeline.`,
          'neutral'
        );
        return;
      }
      const target = Math.max(0, rawTarget);
      if (effectiveArchiveLocked && target >= PREVIEW_FREE_SECONDS) {
        const clamped = PREVIEW_FREE_SECONDS - 1;
        currentTimeSecRef.current = clamped;
        setCurrentTimeSec(clamped);
        previewElapsedMsRef.current = PREVIEW_FREE_SECONDS * 1000;
        setSeekRequest({ time: clamped, nonce: Date.now() });
        previewLockOpenRef.current = true;
        isVideoPlayingRef.current = false;
        setPreviewLockOpen(true);
        return;
      }
      currentTimeSecRef.current = target;
      setCurrentTimeSec(target);
      previewElapsedMsRef.current = Math.min(target, PREVIEW_FREE_SECONDS) * 1000;
      setSeekRequest({ time: target, nonce: Date.now() });
      if (inWatchParty && watchPartyRole === 'host') {
        onSyncHostPlaybackRef.current?.({
          isPlaying: !userPaused,
          currentTime: target,
        });
      }
    },
    [inWatchParty, watchPartyRole, watchPartyRoom?.hostName, effectiveArchiveLocked, userPaused, onNotifyWatchParty]
  );

  // Sync Guest playback (play/pause + drift seek) to Host WatchPartyRoom state
  useEffect(() => {
    if (!inWatchParty || watchPartyRole !== 'guest' || !watchPartyRoom) return;
    if (rewardModalOpenRef.current || previewLockOpenRef.current) return;

    const hostPlaying = Boolean(watchPartyRoom.isPlaying);
    setUserPaused(!hostPlaying);
    isVideoPlayingRef.current = hostPlaying;

    const elapsedSinceUpdate = hostPlaying
      ? Math.max(0, (Date.now() - (watchPartyRoom.playbackUpdatedAtMs || Date.now())) / 1000)
      : 0;
    const rawTarget = Math.max(0, (watchPartyRoom.currentTime || 0) + elapsedSinceUpdate);
    const targetTime = effectiveArchiveLocked
      ? Math.min(PREVIEW_FREE_SECONDS - 1, rawTarget)
      : rawTarget;

    if (Math.abs(currentTimeSecRef.current - targetTime) > 2.5) {
      currentTimeSecRef.current = targetTime;
      setCurrentTimeSec(targetTime);
      setSeekRequest({ time: targetTime, nonce: Date.now() });
    }
  }, [
    inWatchParty,
    watchPartyRole,
    watchPartyRoom?.episodeId,
    watchPartyRoom?.isPlaying,
    watchPartyRoom?.currentTime,
    watchPartyRoom?.playbackUpdatedAtMs,
    effectiveArchiveLocked,
  ]);

  // Host periodic playback sync heartbeat every 4 seconds
  useEffect(() => {
    if (!inWatchParty || watchPartyRole !== 'host') return;
    const timer = window.setInterval(() => {
      if (rewardModalOpenRef.current || previewLockOpenRef.current) return;
      onSyncHostPlaybackRef.current?.({
        isPlaying: !userPaused && isVideoPlayingRef.current,
        currentTime: currentTimeSecRef.current,
      });
    }, 4000);
    return () => window.clearInterval(timer);
  }, [inWatchParty, watchPartyRole, userPaused, episode.id]);

  const handleHostRequestSwitchEpisode = useCallback(
    (targetEpisode: DramaEpisode) => {
      if (!inWatchParty || watchPartyRole !== 'host' || !onSwitchWatchPartyEpisode) return;
      if (onStartSponsorReward) {
        onStartSponsorReward(
          async () => {
            await onSwitchWatchPartyEpisode(targetEpisode);
          },
          {
            claimLabel: 'Switch Episode',
            readyHeadline: 'Sponsor Ad Complete • Switching Lobby Episode!',
          }
        );
      } else {
        void onSwitchWatchPartyEpisode(targetEpisode);
      }
    },
    [inWatchParty, watchPartyRole, onSwitchWatchPartyEpisode, onStartSponsorReward]
  );

  useEffect(() => {
    isVideoPlayingRef.current = true;
    rewardModalOpenRef.current = false;
    previewLockOpenRef.current = false;
    previewElapsedMsRef.current = 0;
    lastRemoteTimeUpdateRef.current = 0;
    episodeCompletedFiredRef.current = false;
    activeEpisodeWatchMsRef.current = 0;
    setRewardModalOpen(false);
    setPreviewLockOpen(false);
    setPreviewReplayNonce(0);
    setRingProgress(0);
    setIsFitMode(false);
    setUserPaused(false);
    setTapFeedback(null);
    setVideoReloadNonce(0);
    setIsVideoStalledOver5s(false);
    setCurrentTimeSec(0);
    currentTimeSecRef.current = 0;
    setDurationSec(0);
    setSeekRequest(null);
    return () => {
      if (tapFeedbackTimerRef.current !== null) {
        window.clearTimeout(tapFeedbackTimerRef.current);
        tapFeedbackTimerRef.current = null;
      }
    };
  }, [episode.id]);

  // 3-minute free preview timer & local fallback scrub clock
  useEffect(() => {
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

      activeEpisodeWatchMsRef.current += delta;
      if (!effectiveArchiveLocked && activeEpisodeWatchMsRef.current >= 240_000) {
        markEpisodeFullyCompleted();
      }

      if (now - lastRemoteTimeUpdateRef.current > 1100) {
        setCurrentTimeSec((prev) => {
          const next = prev + delta / 1000;
          const clamped = effectiveArchiveLocked ? Math.min(PREVIEW_FREE_SECONDS, next) : next;
          currentTimeSecRef.current = clamped;
          return clamped;
        });
      }

      if (!effectiveArchiveLocked) return;
      previewElapsedMsRef.current += delta;
      if (previewElapsedMsRef.current >= limitMs && !previewLockOpenRef.current) {
        previewLockOpenRef.current = true;
        isVideoPlayingRef.current = false;
        setPreviewLockOpen(true);
      }
    }, 200);

    return () => window.clearInterval(interval);
  }, [episode.id, effectiveArchiveLocked, markEpisodeFullyCompleted]);

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

  // Fills Coin Ring up to 100% every 60s of playback (Active in Solo mode only; Hidden in Watch Lobbies)
  useEffect(() => {
    if (inWatchParty) {
      setRingProgress(0);
      setRewardModalOpen(false);
      return;
    }

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
        inWatchParty ||
        document.visibilityState !== 'visible' ||
        !isVideoPlayingRef.current ||
        rewardModalOpenRef.current ||
        previewLockOpenRef.current
      ) {
        return;
      }

      elapsedMs += delta * coinPotMultiplierRef.current;
      watchSecondsBufferRef.current += delta;
      if (watchSecondsBufferRef.current >= 5000) {
        const wholeSeconds = Math.floor(watchSecondsBufferRef.current / 1000);
        watchSecondsBufferRef.current -= wholeSeconds * 1000;
        onRecordWatchSecondsRef.current?.(wholeSeconds);
      }

      const pct = Math.min(100, (elapsedMs / cycleMs) * 100);
      setRingProgress(pct);

      if (pct >= 100 && !rewardModalOpenRef.current) {
        rewardModalOpenRef.current = true;
        isVideoPlayingRef.current = false;
        setRewardModalOpen(true);
      }
    }, 100);

    return () => {
      window.clearInterval(interval);
      if (watchSecondsBufferRef.current >= 1000) {
        const wholeSeconds = Math.floor(watchSecondsBufferRef.current / 1000);
        watchSecondsBufferRef.current -= wholeSeconds * 1000;
        onRecordWatchSecondsRef.current?.(wholeSeconds);
      }
    };
  }, [episode.id, isPrivateLobby, potReward]);

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

  const effectiveDurationSec =
    durationSec > 0
      ? durationSec
      : Math.max(isArchiveLocked ? PREVIEW_FREE_SECONDS : 600, Math.ceil(currentTimeSec));
  const scrubFillPct =
    effectiveDurationSec > 0
      ? Math.min(100, Math.max(0, (currentTimeSec / effectiveDurationSec) * 100))
      : 0;
  const previewGatePct =
    isArchiveLocked && effectiveDurationSec > 0
      ? Math.min(100, Math.max(0, (PREVIEW_FREE_SECONDS / effectiveDurationSec) * 100))
      : null;

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={episode.title}
      className={`fixed inset-0 bg-[#070709] overflow-hidden ${
        isExpandedFull ? 'z-[75]' : 'z-[35]'
      }`}
    >
      <div
        ref={playerContainerRef}
        className="relative h-[100dvh] w-full bg-[#060608] flex flex-col overflow-hidden"
      >
        {/* 1. True Zero-Escape Full-Screen Video Stage */}
        <div className="relative w-full flex-1 min-h-0 bg-[#060608] overflow-hidden [container-type:size]">
          <WatchVideoStage
            episode={episode}
            fitMode={isFitMode}
            paused={userPaused || rewardModalOpen || previewLockOpen}
            muted={muted}
            playbackRate={1}
            resumePlaybackSignal={resumePlaybackSignal}
            manualReloadNonce={videoReloadNonce}
            isPreviewLocked={effectiveArchiveLocked}
            previewReplayNonce={previewReplayNonce}
            seekRequest={seekRequest}
            ccSubtitles={ccSubtitlesOn}
            onTimeUpdate={handleStageTimeUpdate}
            onPreviewLimitReached={() => {
              if (!effectiveArchiveLocked) return;
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

          {!inWatchParty && (
            <div className="pointer-events-none absolute top-[max(3.5rem,calc(env(safe-area-inset-top)+3.15rem))] left-3 right-3 sm:max-w-md z-30">
              <div className="pointer-events-auto flex flex-col gap-1.5 px-4 py-2.5 rounded-2xl bg-slate-950/80 backdrop-blur-md border border-cyan-400/50 shadow-[0_0_24px_rgba(0,240,255,0.35)]">
                <div className="flex items-center justify-between gap-3 text-xs font-extrabold text-[#FCE7A2]">
                  <span className="inline-flex items-center gap-1.5 text-cyan-300">
                    <Trophy className="w-4 h-4 text-[#FBBF24] shrink-0" />
                    <span>Sunday Tournament Progress</span>
                  </span>
                  <span className="font-mono-num text-amber-200 font-bold">
                    {playerWeeklyCoins.toLocaleString()} / {safeThreshold.toLocaleString()} ({weeklyPct.toFixed(1)}%)
                  </span>
                </div>
                <div
                  role="progressbar"
                  aria-valuenow={Math.round(weeklyPct)}
                  aria-valuemin={0}
                  aria-valuemax={100}
                  aria-label="Sunday Tournament Progress"
                  className="h-2 w-full rounded-full bg-white/20 overflow-hidden"
                >
                  <div
                    className="h-full rounded-full bg-gradient-to-r from-amber-400 via-cyan-400 to-teal-300 shadow-[0_0_12px_rgba(0,240,255,0.8)] transition-[width] duration-300 ease-out"
                    style={{ width: `${Math.min(100, Math.max(0, weeklyPct))}%` }}
                  />
                </div>
              </div>
            </div>
          )}

          {/* 2. Top Bar: Single Slim Horizontal Strip in Watch Lobby or Classic Solo Header */}
          <header className="pointer-events-none absolute inset-x-0 top-0 z-30 bg-gradient-to-b from-black/90 via-black/50 to-transparent px-2.5 sm:px-4 pt-[max(0.4rem,env(safe-area-inset-top))] pb-2">
            {inWatchParty && watchPartyRoom ? (
              /* Ultra-compact single-line horizontal strip (text-xs py-1) */
              <div className="pointer-events-auto flex items-center justify-between gap-1.5 text-xs py-1">
                {/* Back button */}
                <button
                  type="button"
                  onClick={handleClose}
                  aria-label="Back to catalog"
                  className="min-h-[30px] min-w-[30px] rounded-full bg-black/70 backdrop-blur-md border border-[#D4AF37]/45 flex items-center justify-center text-[#FCE7A2] hover:border-[#FBBF24] cursor-pointer shrink-0 transition"
                >
                  <ArrowLeft className="w-3.5 h-3.5" />
                </button>

                {/* Combined Room Badge: DW-XXXXXX · X/25 or X/8 */}
                <div className="min-w-0 flex items-center gap-1.5 overflow-hidden">
                  <div className="inline-flex items-center gap-1 px-2.5 py-0.5 rounded-full bg-black/80 backdrop-blur-md border border-emerald-400/50 text-[10px] font-bold text-white shadow-sm shrink-0">
                    <Radio className="w-2.5 h-2.5 text-emerald-400 animate-pulse shrink-0" />
                    <span className="font-mono-num text-[#FCE7A2] font-black">{watchPartyRoom.roomId}</span>
                    <span className="text-zinc-500">·</span>
                    <span className="font-mono-num text-zinc-300">
                      {Math.max(1, watchPartyViewerCount)}/{isPrivateLobby ? WATCH_PARTY_PRIVATE_CAPACITY : WATCH_PARTY_PUBLIC_CAPACITY}
                    </span>
                    {isPrivateLobby ? (
                      <span className="px-1 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black uppercase">
                        VIP
                      </span>
                    ) : (
                      <span className="px-1 rounded bg-amber-400/20 text-amber-300 text-[9px] font-black">
                        1.5x
                      </span>
                    )}
                  </div>
                  <span className="hidden sm:inline text-[11px] font-semibold text-zinc-300 truncate max-w-[140px]">
                    {episode.title}
                  </span>
                </div>

                {/* Compact Action strip: Invite, Switch Ep, Leave, Fit, Mute */}
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    onClick={handleCopyInviteLink}
                    className="min-h-[28px] px-2 rounded-full bg-black/75 hover:bg-black/90 border border-[#D4AF37]/50 text-[10px] font-bold text-[#FCE7A2] inline-flex items-center gap-1 cursor-pointer transition shrink-0"
                  >
                    {inviteCopied ? (
                      <Check className="w-3 h-3 text-emerald-400" />
                    ) : (
                      <Share2 className="w-3 h-3 text-amber-300" />
                    )}
                    <span>{inviteCopied ? 'Copied!' : 'Invite'}</span>
                  </button>

                  {watchPartyRole === 'host' && onSwitchWatchPartyEpisode && (
                    <button
                      type="button"
                      onClick={() => setPartySwitcherOpen(true)}
                      className="min-h-[28px] px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[10px] font-black inline-flex items-center gap-1 cursor-pointer shadow shrink-0"
                    >
                      <Tv className="w-3 h-3" />
                      <span>Switch Ep</span>
                    </button>
                  )}

                  {onLeaveWatchParty && (
                    <button
                      type="button"
                      onClick={onLeaveWatchParty}
                      className="min-h-[28px] px-2 rounded-full bg-red-950/80 hover:bg-red-900 border border-red-400/50 text-[10px] font-bold text-red-200 inline-flex items-center gap-1 cursor-pointer transition shrink-0"
                    >
                      <LogOut className="w-3 h-3" />
                      <span>Leave</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setIsFitMode((prev) => !prev)}
                    className={`min-h-[28px] px-2 rounded-full backdrop-blur-md border text-[10px] font-bold inline-flex items-center gap-1 shrink-0 cursor-pointer ${
                      isFitMode
                        ? 'border-[#FBBF24] bg-[#241A07]/90 text-[#FFF3B0]'
                        : 'border-white/20 bg-black/65 text-[#FCE7A2]'
                    }`}
                  >
                    {isFitMode ? <ZoomIn className="w-3 h-3" /> : <Scan className="w-3 h-3" />}
                    <span>{isFitMode ? 'Fill' : 'Fit'}</span>
                  </button>

                  <button
                    type="button"
                    onClick={onToggleMute}
                    aria-label={muted ? 'Unmute video' : 'Mute video'}
                    className="min-h-[28px] min-w-[28px] rounded-full backdrop-blur-md border border-white/20 bg-black/65 flex items-center justify-center text-zinc-300 hover:text-white cursor-pointer shrink-0"
                  >
                    {muted ? <VolumeX className="w-3.5 h-3.5" /> : <Volume2 className="w-3.5 h-3.5 text-[#D4AF37]" />}
                  </button>
                </div>
              </div>
            ) : (
              /* Classic solo player top bar */
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
                  {onOpenWatchPartyLobby && (
                    <button
                      type="button"
                      onClick={() => onOpenWatchPartyLobby(episode)}
                      className="min-h-[34px] px-2.5 rounded-full bg-gradient-to-r from-[#241A07]/95 to-black/85 border border-[#D4AF37]/70 text-[#FCE7A2] text-[11px] font-extrabold inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(212,175,55,0.3)] hover:border-[#FBBF24] cursor-pointer transition"
                    >
                      <Users className="w-3.5 h-3.5 text-[#FBBF24]" />
                      <span>Party 1.5x</span>
                    </button>
                  )}

                  <button
                    type="button"
                    onClick={() => setCcSubtitlesOn((prev) => !prev)}
                    aria-pressed={ccSubtitlesOn}
                    aria-label={ccSubtitlesOn ? 'CC Subtitles On' : 'CC Subtitles Off'}
                    className={`min-h-[34px] px-2.5 rounded-full backdrop-blur-md border text-[11px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0 transition cursor-pointer ${
                      ccSubtitlesOn
                        ? 'border-cyan-400 bg-cyan-950/70 text-cyan-200 shadow-[0_0_12px_rgba(0,240,255,0.4)]'
                        : 'border-white/20 bg-black/65 text-zinc-400 hover:text-white'
                    }`}
                  >
                    <span className="font-black">CC</span>
                    <span>{ccSubtitlesOn ? 'ON' : 'OFF'}</span>
                  </button>

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
            )}
          </header>

          {/* 3. Compact Side / Collapsible Pill: +1000 Coin Pot Ring + Sunday Tournament Progress (Hidden in Watch Lobbies) */}
          {!inWatchParty && (
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
                  <div className="flex items-center gap-1">
                    <span className="font-mono-num text-[10px] font-extrabold text-[#FCE7A2]">
                      {Math.round(ringProgress)}%
                    </span>
                    {inWatchParty && (
                      <span className="px-1 rounded bg-amber-400/25 text-[8px] font-black text-amber-300">
                        1.5x
                      </span>
                    )}
                  </div>
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
          )}

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

          {/* 3-Minute Free Preview -> 15s Monetag Direct Link or Spend 500 Coins Lock Overlay */}
          <MovieUnlockOverlay
            open={previewLockOpen && effectiveArchiveLocked}
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
            onUnlockWithAd={
              onUnlockArchiveMovieWithAd && episode.archiveIdentifier
                ? async () => {
                    const ok = await onUnlockArchiveMovieWithAd(
                      episode.archiveIdentifier!,
                      episode.title
                    );
                    if (ok) {
                      previewLockOpenRef.current = false;
                      setPreviewLockOpen(false);
                      isVideoPlayingRef.current = true;
                    }
                    return ok;
                  }
                : undefined
            }
            onReplayPreview={() => {
              previewElapsedMsRef.current = 0;
              previewLockOpenRef.current = false;
              setCurrentTimeSec(0);
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

          {/* Live Watch Party On-Screen Chat, Reactions & Host Switcher */}
          {inWatchParty && watchPartyRoom && onDeductSuperReactionCoins && (
            <WatchPartyOverlay
              room={watchPartyRoom}
              role={watchPartyRole}
              username={watchPartyUsername}
              playerTotalCoins={playerTotalCoins}
              episodes={episodes}
              episodeSwitcherOpen={partySwitcherOpen}
              onCloseEpisodeSwitcher={() => setPartySwitcherOpen(false)}
              onRequestSwitchEpisode={handleHostRequestSwitchEpisode}
              onDeductSuperReactionCoins={onDeductSuperReactionCoins}
              onNotify={onNotifyWatchParty}
            />
          )}
        </div>

        {/* 4. Custom Neon-Gold Interactive Scrub Bar cleanly above Bottom Ad Banner */}
        <div className="shrink-0 relative z-20 w-full bg-[#0B0A10]/95 backdrop-blur-md border-t border-[#D4AF37]/30 px-2.5 sm:px-4 py-1 flex items-center gap-2">
          <button
            type="button"
            onClick={handleTogglePlayPause}
            aria-label={userPaused ? 'Play episode' : 'Pause episode'}
            className="w-7 h-7 rounded-full bg-black/75 border border-[#D4AF37]/60 text-[#FCE7A2] flex items-center justify-center shrink-0 cursor-pointer hover:border-[#FBBF24] transition"
          >
            {userPaused ? (
              <Play className="w-3.5 h-3.5 fill-current ml-0.5" />
            ) : (
              <Pause className="w-3.5 h-3.5" />
            )}
          </button>

          <span className="font-mono-num text-[10px] sm:text-[11px] font-bold text-[#FCE7A2] tabular-nums shrink-0">
            {formatPlaybackClock(currentTimeSec)}
          </span>

          <div className="relative flex-1 flex items-center h-6">
            <div className="pointer-events-none relative w-full h-1 rounded-full bg-white/15 overflow-hidden">
              <div
                className="h-full rounded-full gold-gradient-bg shadow-[0_0_10px_rgba(251,191,36,0.75)] transition-[width] duration-150 ease-linear"
                style={{ width: `${scrubFillPct}%` }}
              />
              {!isPrivateLobby && previewGatePct !== null && (
                <span
                  aria-hidden="true"
                  title="03:00 Free Preview Gate"
                  className="absolute inset-y-0 w-0.5 bg-rose-400 shadow-[0_0_6px_rgba(251,113,133,0.9)]"
                  style={{ left: `${previewGatePct}%` }}
                />
              )}
            </div>
            <input
              type="range"
              aria-label="Seek episode playback"
              min={0}
              max={effectiveDurationSec}
              step={1}
              value={Math.min(effectiveDurationSec, Math.floor(currentTimeSec))}
              onChange={(e) => handleScrubSeek(Number(e.target.value))}
              className="absolute inset-0 w-full h-full opacity-0 cursor-pointer"
            />
            <span
              aria-hidden="true"
              className="pointer-events-none absolute top-1/2 -translate-y-1/2 -translate-x-1/2 w-3 h-3 rounded-full bg-[#FCE7A2] border border-[#181307] shadow-[0_0_10px_rgba(251,191,36,0.95)]"
              style={{ left: `${scrubFillPct}%` }}
            />
          </div>

          <span className="font-mono-num text-[10px] sm:text-[11px] font-semibold text-zinc-400 tabular-nums shrink-0">
            {formatPlaybackClock(effectiveDurationSec)}
          </span>

          {effectiveArchiveLocked ? (
            <button
              type="button"
              onClick={() => {
                previewLockOpenRef.current = true;
                isVideoPlayingRef.current = false;
                setPreviewLockOpen(true);
              }}
              className="min-h-[28px] px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.4)] cursor-pointer"
            >
              <Lock className="w-3 h-3 shrink-0" />
              <span>Unlock Full ({FULL_EPISODE_UNLOCK_COINS})</span>
            </button>
          ) : onNextEpisode && hasNextEpisode && !inWatchParty ? (
            <button
              type="button"
              onClick={onNextEpisode}
              className="min-h-[28px] px-2.5 rounded-full gold-gradient-bg text-[#181307] text-[10px] sm:text-[11px] font-extrabold inline-flex items-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.4)] cursor-pointer"
            >
              <span>Next Ep</span>
              <SkipForward className="w-3 h-3 fill-current shrink-0" />
            </button>
          ) : episode.archiveIdentifier || isPrivateLobby ? (
            <span className="min-h-[26px] px-2 rounded-full bg-emerald-950/85 border border-emerald-400/45 text-emerald-200 text-[10px] font-bold inline-flex items-center gap-1 whitespace-nowrap shrink-0">
              <Unlock className="w-3 h-3 shrink-0" />
              <span>{isPrivateLobby ? 'VIP Screening' : 'Unlocked'}</span>
            </span>
          ) : null}
        </div>

        {/* 5. Pinned Bottom 320x50px Adsterra/Monetag Banner Anchored at bottom-16 Above BottomNavBar */}
        <footer
          className={`shrink-0 relative z-20 w-full bg-[#09090b] border-t border-[#D4AF37]/30 px-3 pt-1 pb-[max(0.35rem,env(safe-area-inset-bottom))] flex flex-col items-center justify-center ${
            isExpandedFull ? 'mb-0' : 'mb-16'
          }`}
        >
          <BottomAdBanner />
          <p className="text-[9px] sm:text-[10px] text-zinc-400 text-center mt-0.5 leading-tight px-2">
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
