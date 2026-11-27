import React, { useEffect, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, SkipForward } from 'lucide-react';
import { PREVIEW_FREE_SECONDS } from '../utils/modernCatalog';
import {
  DailymotionPlayerInstance,
  DailymotionPlayerState,
  loadDailymotionSdk,
} from '../utils/dailymotionSdk';

export interface DailymotionPlaybackSnapshot {
  isPlaying: boolean;
  currentTime: number;
  duration: number;
  adIsPlaying: boolean;
}

export type DailymotionSdkEventName =
  | 'VIDEO_PLAY'
  | 'VIDEO_PAUSE'
  | 'VIDEO_SEEKEND'
  | 'VIDEO_TIMECHANGE'
  | 'AD_END';

export interface DailymotionSdkPlayerProps {
  videoId: string;
  title: string;
  posterUrl?: string;
  paused?: boolean;
  muted?: boolean;
  autoplay?: boolean;
  startSeconds?: number;
  playbackRate?: number;
  ccSubtitles?: boolean;
  seekRequest?: { time: number; nonce: number } | null;
  replayNonce?: number;
  reloadNonce?: number;
  isPreviewLocked?: boolean;
  interactive?: boolean;
  className?: string;
  onTimeUpdate?: (currentTime: number, duration: number) => void;
  onPreviewLimitReached?: () => void;
  onPlayingChange?: (playing: boolean) => void;
  onVideoEnded?: () => void;
  onStallStateChange?: (stalledOver5s: boolean) => void;
  onSdkSyncEvent?: (
    eventName: DailymotionSdkEventName,
    snapshot: DailymotionPlaybackSnapshot
  ) => void;
  onStateProviderReady?: (
    getStateFn: (() => Promise<DailymotionPlaybackSnapshot | null>) | null
  ) => void;
  onFallbackNextEpisode?: () => void;
}

export const DailymotionSdkPlayer: React.FC<DailymotionSdkPlayerProps> = React.memo(
  ({
    videoId,
    title,
    posterUrl,
    paused = false,
    muted = false,
    autoplay = true,
    startSeconds = 0,
    playbackRate = 1,
    ccSubtitles = true,
    seekRequest = null,
    replayNonce = 0,
    reloadNonce = 0,
    isPreviewLocked = false,
    interactive = false,
    className = '',
    onTimeUpdate,
    onPreviewLimitReached,
    onPlayingChange,
    onVideoEnded,
    onStallStateChange,
    onSdkSyncEvent,
    onStateProviderReady,
    onFallbackNextEpisode,
  }) => {
    const hostRef = useRef<HTMLDivElement | null>(null);
    const playerRef = useRef<DailymotionPlayerInstance | null>(null);
    const pausedRef = useRef(paused);
    const mutedRef = useRef(muted);
    const playbackRateRef = useRef(playbackRate);
    const isPreviewLockedRef = useRef(isPreviewLocked);
    const savedTimeRef = useRef(Math.max(0, startSeconds || 0));
    const knownDurationRef = useRef(0);
    const pendingSeekRef = useRef<number | null>(
      startSeconds && startSeconds > 0.5 ? startSeconds : null
    );
    const adIsPlayingRef = useRef(false);
    const readyRef = useRef(false);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPreviewLimitReachedRef = useRef(onPreviewLimitReached);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const onVideoEndedRef = useRef(onVideoEnded);
    const onStallStateChangeRef = useRef(onStallStateChange);
    const onSdkSyncEventRef = useRef(onSdkSyncEvent);
    const onStateProviderReadyRef = useRef(onStateProviderReady);

    const [localRetryNonce, setLocalRetryNonce] = useState(0);
    const [unavailableReason, setUnavailableReason] = useState<string | null>(null);
    const [isLoading, setIsLoading] = useState(true);

    useEffect(() => {
      pausedRef.current = paused;
    }, [paused]);

    useEffect(() => {
      mutedRef.current = muted;
    }, [muted]);

    useEffect(() => {
      playbackRateRef.current = playbackRate;
    }, [playbackRate]);

    useEffect(() => {
      isPreviewLockedRef.current = isPreviewLocked;
    }, [isPreviewLocked]);

    useEffect(() => {
      onTimeUpdateRef.current = onTimeUpdate;
    }, [onTimeUpdate]);

    useEffect(() => {
      onPreviewLimitReachedRef.current = onPreviewLimitReached;
    }, [onPreviewLimitReached]);

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
      onSdkSyncEventRef.current = onSdkSyncEvent;
    }, [onSdkSyncEvent]);

    useEffect(() => {
      onStateProviderReadyRef.current = onStateProviderReady;
    }, [onStateProviderReady]);

    // Mount & bind official Dailymotion Player Embed SDK
    useEffect(() => {
      const cleanId = (videoId || '').trim();
      const hostEl = hostRef.current;
      if (!cleanId || !hostEl) {
        setUnavailableReason('Missing or invalid Dailymotion video ID.');
        setIsLoading(false);
        return;
      }

      let disposed = false;
      readyRef.current = false;
      adIsPlayingRef.current = false;
      knownDurationRef.current = 0;
      setUnavailableReason(null);
      setIsLoading(true);
      onStallStateChangeRef.current?.(false);

      const mountEl = document.createElement('div');
      mountEl.className = 'w-full h-full';
      hostEl.innerHTML = '';
      hostEl.appendChild(mountEl);

      const loadTimeout = window.setTimeout(() => {
        if (!disposed && !readyRef.current) {
          onStallStateChangeRef.current?.(true);
        }
      }, 6500);

      void loadDailymotionSdk()
        .then(async (sdk) => {
          if (disposed) return;
          const initialStart = pendingSeekRef.current ?? savedTimeRef.current;

          const player = await sdk.createPlayer(mountEl, {
            video: cleanId,
            params: {
              mute: mutedRef.current,
              startTime: initialStart > 0.5 ? Math.floor(initialStart) : undefined,
              subtitlesDefault: ccSubtitles ? 'en' : undefined,
              autostart: autoplay && !pausedRef.current,
            },
          });

          if (disposed) {
            try {
              void player.destroy?.();
            } catch {
              // Ignore destroy errors
            }
            return;
          }

          playerRef.current = player;

          const readSnapshot = async (): Promise<DailymotionPlaybackSnapshot | null> => {
            try {
              const st = await player.getState();
              const t =
                typeof st.videoTime === 'number' && Number.isFinite(st.videoTime)
                  ? st.videoTime
                  : savedTimeRef.current;
              const dur =
                typeof st.videoDuration === 'number' && Number.isFinite(st.videoDuration)
                  ? st.videoDuration
                  : knownDurationRef.current;
              return {
                isPlaying: st.playerIsPaused !== undefined ? !st.playerIsPaused : !pausedRef.current,
                currentTime: t,
                duration: dur,
                adIsPlaying: Boolean(st.adIsPlaying ?? adIsPlayingRef.current),
              };
            } catch {
              return {
                isPlaying: !pausedRef.current,
                currentTime: savedTimeRef.current,
                duration: knownDurationRef.current,
                adIsPlaying: adIsPlayingRef.current,
              };
            }
          };

          onStateProviderReadyRef.current?.(readSnapshot);

          const makeSnapshot = (
            st: DailymotionPlayerState | undefined,
            fallbackPlaying: boolean
          ): DailymotionPlaybackSnapshot => {
            const t =
              typeof st?.videoTime === 'number' && Number.isFinite(st.videoTime)
                ? st.videoTime
                : savedTimeRef.current;
            const dur =
              typeof st?.videoDuration === 'number' && Number.isFinite(st.videoDuration)
                ? st.videoDuration
                : knownDurationRef.current;
            return {
              isPlaying:
                st?.playerIsPaused !== undefined ? !st.playerIsPaused : fallbackPlaying,
              currentTime: t,
              duration: dur,
              adIsPlaying: Boolean(st?.adIsPlaying ?? adIsPlayingRef.current),
            };
          };

          const handleTimeProgress = (st?: DailymotionPlayerState) => {
            if (disposed) return;
            if (st?.adIsPlaying || adIsPlayingRef.current) return;
            if (typeof st?.videoDuration === 'number' && Number.isFinite(st.videoDuration) && st.videoDuration > 0) {
              knownDurationRef.current = st.videoDuration;
            }
            const t = typeof st?.videoTime === 'number' && Number.isFinite(st.videoTime) ? st.videoTime : null;
            if (t !== null && t >= 0) {
              if (isPreviewLockedRef.current && t >= PREVIEW_FREE_SECONDS) {
                savedTimeRef.current = PREVIEW_FREE_SECONDS - 1;
                void player.seek(PREVIEW_FREE_SECONDS - 1);
                void player.pause();
                onPlayingChangeRef.current?.(false);
                onPreviewLimitReachedRef.current?.();
                return;
              }
              savedTimeRef.current = t;
              onTimeUpdateRef.current?.(t, knownDurationRef.current);
            }
          };

          player.on(sdk.events.PLAYER_APIREADY, () => {
            if (disposed) return;
            readyRef.current = true;
            setIsLoading(false);
            onStallStateChangeRef.current?.(false);
            try {
              void player.setMute(mutedRef.current);
              if (playbackRateRef.current !== 1 && player.setPlaybackSpeed) {
                void player.setPlaybackSpeed(playbackRateRef.current);
              }
              const targetSeek = pendingSeekRef.current ?? savedTimeRef.current;
              if (targetSeek > 0.5) {
                pendingSeekRef.current = null;
                void player.seek(targetSeek);
              }
              if (pausedRef.current || !autoplay) {
                void player.pause();
              } else {
                void player.play();
              }
            } catch {
              // Ignore API startup command race
            }
          });

          player.on(sdk.events.VIDEO_PLAY, (st) => {
            if (disposed) return;
            readyRef.current = true;
            setIsLoading(false);
            setUnavailableReason(null);
            onStallStateChangeRef.current?.(false);
            if (pausedRef.current) {
              void player.pause();
              return;
            }
            if (pendingSeekRef.current !== null && pendingSeekRef.current > 0.5) {
              const target = pendingSeekRef.current;
              pendingSeekRef.current = null;
              void player.seek(target);
            }
            handleTimeProgress(st);
            onPlayingChangeRef.current?.(true);
            onSdkSyncEventRef.current?.('VIDEO_PLAY', makeSnapshot(st, true));
          });

          player.on(sdk.events.VIDEO_PLAYING, (st) => {
            if (disposed) return;
            readyRef.current = true;
            setIsLoading(false);
            setUnavailableReason(null);
            onStallStateChangeRef.current?.(false);
            if (pausedRef.current) {
              void player.pause();
              return;
            }
            handleTimeProgress(st);
            onPlayingChangeRef.current?.(true);
          });

          player.on(sdk.events.VIDEO_PAUSE, (st) => {
            if (disposed) return;
            handleTimeProgress(st);
            onPlayingChangeRef.current?.(false);
            onSdkSyncEventRef.current?.('VIDEO_PAUSE', makeSnapshot(st, false));
          });

          player.on(sdk.events.VIDEO_SEEKEND, (st) => {
            if (disposed) return;
            handleTimeProgress(st);
            onSdkSyncEventRef.current?.(
              'VIDEO_SEEKEND',
              makeSnapshot(st, !pausedRef.current)
            );
          });

          player.on(sdk.events.VIDEO_TIMECHANGE, (st) => {
            if (disposed) return;
            readyRef.current = true;
            setIsLoading(false);
            onStallStateChangeRef.current?.(false);
            handleTimeProgress(st);
            onSdkSyncEventRef.current?.(
              'VIDEO_TIMECHANGE',
              makeSnapshot(st, !pausedRef.current)
            );
          });

          player.on(sdk.events.VIDEO_DURATIONCHANGE, (st) => {
            if (disposed) return;
            handleTimeProgress(st);
          });

          player.on(sdk.events.VIDEO_END, () => {
            if (disposed) return;
            onPlayingChangeRef.current?.(false);
            onVideoEndedRef.current?.();
          });

          player.on(sdk.events.AD_START, () => {
            if (disposed) return;
            adIsPlayingRef.current = true;
            readyRef.current = true;
            setIsLoading(false);
            onStallStateChangeRef.current?.(false);
          });

          player.on(sdk.events.AD_END, (st) => {
            if (disposed) return;
            adIsPlayingRef.current = false;
            onSdkSyncEventRef.current?.('AD_END', makeSnapshot(st, !pausedRef.current));
          });

          player.on(sdk.events.PLAYER_ERROR, (st) => {
            if (disposed) return;
            const errMsg =
              st?.error?.message ||
              st?.error?.title ||
              'This video is unavailable or geo-blocked in your region.';
            setIsLoading(false);
            setUnavailableReason(errMsg);
            onPlayingChangeRef.current?.(false);
            onStallStateChangeRef.current?.(false);
          });
        })
        .catch(() => {
          if (!disposed) {
            setIsLoading(false);
            setUnavailableReason('Video Unavailable — unable to initialize Dailymotion player.');
            onPlayingChangeRef.current?.(false);
          }
        });

      return () => {
        disposed = true;
        window.clearTimeout(loadTimeout);
        onStateProviderReadyRef.current?.(null);
        const current = playerRef.current;
        playerRef.current = null;
        if (current) {
          try {
            void current.destroy?.();
          } catch {
            // Ignore cleanup errors
          }
        }
        if (hostEl) {
          hostEl.innerHTML = '';
        }
      };
    }, [videoId, reloadNonce, localRetryNonce, ccSubtitles, autoplay]);

    // Sync paused state cleanly to SDK
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        if (paused) {
          void player.pause();
        } else {
          if (savedTimeRef.current > 0.5 && pendingSeekRef.current !== null) {
            void player.seek(pendingSeekRef.current);
            pendingSeekRef.current = null;
          }
          void player.play();
        }
      } catch {
        // Ignore transient command error
      }
    }, [paused]);

    // Sync muted state cleanly to SDK
    useEffect(() => {
      const player = playerRef.current;
      if (!player) return;
      try {
        void player.setMute(muted);
      } catch {
        // Ignore transient mute error
      }
    }, [muted]);

    // Sync playback rate
    useEffect(() => {
      const player = playerRef.current;
      if (!player?.setPlaybackSpeed) return;
      try {
        void player.setPlaybackSpeed(playbackRate);
      } catch {
        // Ignore unsupported speed errors
      }
    }, [playbackRate]);

    // Sync imperative seek requests (scrubbing & Watch Party drift snaps)
    useEffect(() => {
      if (!seekRequest || seekRequest.nonce <= 0) return;
      const target = Math.max(0, seekRequest.time);
      savedTimeRef.current = target;
      pendingSeekRef.current = target;
      const player = playerRef.current;
      if (!player) return;
      try {
        void player.seek(target);
        pendingSeekRef.current = null;
        if (pausedRef.current) {
          void player.pause();
        } else {
          void player.play();
        }
      } catch {
        // Keep pendingSeekRef for PLAYER_APIREADY
      }
    }, [seekRequest]);

    // Replay preview from 0s
    useEffect(() => {
      if (!replayNonce || replayNonce <= 0) return;
      savedTimeRef.current = 0;
      pendingSeekRef.current = 0;
      const player = playerRef.current;
      if (!player) return;
      try {
        void player.seek(0);
        void player.play();
      } catch {
        // Ignore replay errors
      }
    }, [replayNonce]);

    return (
      <div className="relative w-full h-full bg-[#060608] overflow-hidden">
        <div
          ref={hostRef}
          aria-label={title}
          className={`${className} [&_iframe]:w-full [&_iframe]:h-full [&_iframe]:border-0 ${
            interactive ? 'pointer-events-auto' : 'pointer-events-none'
          }`}
        />

        {isLoading && !unavailableReason && posterUrl && posterUrl !== 'none' && (
          <img
            src={posterUrl}
            alt=""
            aria-hidden="true"
            referrerPolicy="no-referrer"
            className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-35 blur-sm"
          />
        )}

        {unavailableReason && (
          <div className="pointer-events-auto absolute inset-0 z-30 flex items-center justify-center p-6 bg-[#060608]/90 backdrop-blur-sm">
            {posterUrl && posterUrl !== 'none' && (
              <img
                src={posterUrl}
                alt={title}
                referrerPolicy="no-referrer"
                className="pointer-events-none absolute inset-0 w-full h-full object-cover opacity-25 blur-md"
              />
            )}
            <div className="relative z-10 flex flex-col items-center text-center gap-3 max-w-xs rounded-2xl border border-amber-400/45 bg-black/85 p-5 shadow-2xl">
              <AlertTriangle className="w-8 h-8 text-amber-400" />
              <div className="space-y-1">
                <p className="text-sm font-extrabold text-[#FFF8E7]">Video Unavailable</p>
                <p className="text-xs text-zinc-300 leading-relaxed">{unavailableReason}</p>
              </div>
              <div className="flex items-center gap-2 pt-1">
                <button
                  type="button"
                  onClick={() => {
                    setUnavailableReason(null);
                    setLocalRetryNonce((prev) => prev + 1);
                  }}
                  className="inline-flex items-center gap-1.5 px-4 py-2 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold shadow-lg cursor-pointer"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  <span>Retry</span>
                </button>
                {onFallbackNextEpisode && (
                  <button
                    type="button"
                    onClick={onFallbackNextEpisode}
                    className="inline-flex items-center gap-1 px-3.5 py-2 rounded-full bg-white/10 hover:bg-white/20 border border-white/20 text-xs font-bold text-white cursor-pointer"
                  >
                    <span>Next Ep</span>
                    <SkipForward className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            </div>
          </div>
        )}
      </div>
    );
  }
);

DailymotionSdkPlayer.displayName = 'DailymotionSdkPlayer';
