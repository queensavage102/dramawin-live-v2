import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import { AlertTriangle, RotateCcw, SkipForward } from 'lucide-react';
import { extractDailymotionVideoId } from '../constants';
import { PREVIEW_FREE_SECONDS } from '../utils/modernCatalog';

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

interface ParsedDmEvent {
  eventName: string;
  time?: number;
  duration?: number;
  errorMessage?: string;
}

function parseDailymotionMessage(raw: unknown): ParsedDmEvent | null {
  if (typeof raw === 'string') {
    const trimmed = raw.trim();
    if (!trimmed) return null;

    if (trimmed.startsWith('{')) {
      try {
        const obj = JSON.parse(trimmed) as Record<string, unknown>;
        return parseDailymotionObject(obj);
      } catch {
        return null;
      }
    }

    if (trimmed.includes('=')) {
      const params = new URLSearchParams(trimmed);
      const evt = (params.get('event') || '').trim().toLowerCase();
      if (!evt) return null;
      const t = Number(params.get('time'));
      const d = Number(params.get('duration'));
      const errMsg = params.get('message') || params.get('error') || undefined;
      return {
        eventName: evt,
        time: Number.isFinite(t) ? t : undefined,
        duration: Number.isFinite(d) ? d : undefined,
        errorMessage: errMsg,
      };
    }

    return null;
  }

  if (raw && typeof raw === 'object') {
    return parseDailymotionObject(raw as Record<string, unknown>);
  }

  return null;
}

function parseDailymotionObject(obj: Record<string, unknown>): ParsedDmEvent | null {
  const evt = typeof obj.event === 'string' ? obj.event.trim().toLowerCase() : '';
  if (!evt) return null;
  const rawTime = obj.time ?? obj.videoTime ?? obj.currentTime;
  const rawDuration = obj.duration ?? obj.videoDuration;
  const t = typeof rawTime === 'number' ? rawTime : Number(rawTime);
  const d = typeof rawDuration === 'number' ? rawDuration : Number(rawDuration);

  let errorMessage: string | undefined;
  if (typeof obj.message === 'string' && obj.message.trim()) {
    errorMessage = obj.message.trim();
  } else if (obj.error && typeof obj.error === 'object') {
    const errObj = obj.error as { message?: unknown; title?: unknown };
    if (typeof errObj.message === 'string' && errObj.message.trim()) {
      errorMessage = errObj.message.trim();
    } else if (typeof errObj.title === 'string' && errObj.title.trim()) {
      errorMessage = errObj.title.trim();
    }
  }

  return {
    eventName: evt,
    time: Number.isFinite(t) && t >= 0 ? t : undefined,
    duration: Number.isFinite(d) && d > 0 ? d : undefined,
    errorMessage,
  };
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
    const cleanVideoId = useMemo(
      () => extractDailymotionVideoId(videoId) || (videoId || '').trim(),
      [videoId]
    );

    const iframeRef = useRef<HTMLIFrameElement | null>(null);
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
    const loadedRef = useRef(false);
    const lastRemoteTimeEventAtRef = useRef(0);

    const onTimeUpdateRef = useRef(onTimeUpdate);
    const onPreviewLimitReachedRef = useRef(onPreviewLimitReached);
    const onPlayingChangeRef = useRef(onPlayingChange);
    const onVideoEndedRef = useRef(onVideoEnded);
    const onStallStateChangeRef = useRef(onStallStateChange);
    const onSdkSyncEventRef = useRef(onSdkSyncEvent);
    const onStateProviderReadyRef = useRef(onStateProviderReady);

    const [localRetryNonce, setLocalRetryNonce] = useState(0);
    const [mountStartSeconds, setMountStartSeconds] = useState(() =>
      Math.max(0, Math.floor(startSeconds || 0))
    );
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

    // Update initial mount timestamp only when switching videos or manually reloading
    useEffect(() => {
      const nextStart = Math.max(0, Math.floor(startSeconds || savedTimeRef.current || 0));
      savedTimeRef.current = Math.max(0, startSeconds || 0);
      pendingSeekRef.current = startSeconds && startSeconds > 0.5 ? startSeconds : null;
      setMountStartSeconds(nextStart);
      loadedRef.current = false;
      adIsPlayingRef.current = false;
      lastRemoteTimeEventAtRef.current = 0;
      setUnavailableReason(cleanVideoId ? null : 'Missing or invalid Dailymotion video ID.');
      setIsLoading(Boolean(cleanVideoId));
      onStallStateChangeRef.current?.(false);
    }, [cleanVideoId, reloadNonce, localRetryNonce]);

    // Expose live playback snapshot provider for Watch Party Host sync
    useEffect(() => {
      const getSnapshot = async (): Promise<DailymotionPlaybackSnapshot | null> => ({
        isPlaying: !pausedRef.current,
        currentTime: savedTimeRef.current,
        duration: knownDurationRef.current,
        adIsPlaying: adIsPlayingRef.current,
      });
      onStateProviderReadyRef.current?.(getSnapshot);
      return () => {
        onStateProviderReadyRef.current?.(null);
      };
    }, [cleanVideoId]);

    // Build direct Dailymotion embed iframe URL (?autoplay=1&mute=0&playsinline=1)
    const embedSrc = useMemo(() => {
      if (!cleanVideoId) return '';
      const params = new URLSearchParams();
      params.set('autoplay', autoplay && !pausedRef.current ? '1' : '0');
      params.set('mute', mutedRef.current ? '1' : '0');
      params.set('playsinline', '1');
      params.set('ui-logo', '0');
      params.set('queue-enable', 'false');
      params.set('sharing-enable', 'false');
      params.set('ui-start-screen-info', 'false');
      params.set('api', 'postMessage');
      if (ccSubtitles) {
        params.set('subtitles-default', 'en');
        params.set('cc_load_policy', '1');
      }
      if (mountStartSeconds > 0) {
        params.set('start', String(mountStartSeconds));
      }
      return `https://www.dailymotion.com/embed/video/${encodeURIComponent(cleanVideoId)}?${params.toString()}`;
    }, [cleanVideoId, autoplay, ccSubtitles, mountStartSeconds]);

    const reportProgress = useCallback((nextTime: number, nextDuration?: number) => {
      if (typeof nextDuration === 'number' && Number.isFinite(nextDuration) && nextDuration > 0) {
        knownDurationRef.current = nextDuration;
      }
      if (!Number.isFinite(nextTime) || nextTime < 0) return;
      if (isPreviewLockedRef.current && nextTime >= PREVIEW_FREE_SECONDS) {
        savedTimeRef.current = PREVIEW_FREE_SECONDS - 1;
        postDailymotionCommand(iframeRef.current, 'seek', [PREVIEW_FREE_SECONDS - 1]);
        postDailymotionCommand(iframeRef.current, 'pause');
        onPlayingChangeRef.current?.(false);
        onPreviewLimitReachedRef.current?.();
        return;
      }
      savedTimeRef.current = nextTime;
      onTimeUpdateRef.current?.(nextTime, knownDurationRef.current);
    }, []);

    // Listen to Dailymotion iframe postMessage playback events
    useEffect(() => {
      if (!cleanVideoId) return;

      const makeSnapshot = (fallbackPlaying: boolean): DailymotionPlaybackSnapshot => ({
        isPlaying: fallbackPlaying,
        currentTime: savedTimeRef.current,
        duration: knownDurationRef.current,
        adIsPlaying: adIsPlayingRef.current,
      });

      const handleMessage = (event: MessageEvent) => {
        const origin = typeof event.origin === 'string' ? event.origin.toLowerCase() : '';
        if (origin && !origin.includes('dailymotion.com') && !origin.includes('dai.ly')) {
          return;
        }

        const parsed = parseDailymotionMessage(event.data);
        if (!parsed) return;

        const evt = parsed.eventName;

        if (evt === 'apiready' || evt === 'player_apiready') {
          loadedRef.current = true;
          setIsLoading(false);
          setUnavailableReason(null);
          onStallStateChangeRef.current?.(false);

          postDailymotionCommand(iframeRef.current, 'muted', [mutedRef.current]);
          if (playbackRateRef.current !== 1) {
            postDailymotionCommand(iframeRef.current, 'playbackSpeed', [playbackRateRef.current]);
          }
          const targetSeek = pendingSeekRef.current ?? savedTimeRef.current;
          if (targetSeek > 0.5) {
            pendingSeekRef.current = null;
            postDailymotionCommand(iframeRef.current, 'seek', [targetSeek]);
          }
          postDailymotionCommand(
            iframeRef.current,
            pausedRef.current || !autoplay ? 'pause' : 'play'
          );
          return;
        }

        if (evt === 'timeupdate' || evt === 'video_timechange' || evt === 'progress') {
          loadedRef.current = true;
          setIsLoading(false);
          onStallStateChangeRef.current?.(false);
          if (typeof parsed.time === 'number') {
            lastRemoteTimeEventAtRef.current = Date.now();
            reportProgress(parsed.time, parsed.duration);
          } else if (typeof parsed.duration === 'number') {
            knownDurationRef.current = parsed.duration;
          }
          onSdkSyncEventRef.current?.('VIDEO_TIMECHANGE', makeSnapshot(!pausedRef.current));
          return;
        }

        if (evt === 'durationchange' || evt === 'video_durationchange') {
          if (typeof parsed.duration === 'number') {
            knownDurationRef.current = parsed.duration;
            onTimeUpdateRef.current?.(savedTimeRef.current, knownDurationRef.current);
          }
          return;
        }

        if (evt === 'play' || evt === 'playing' || evt === 'video_play' || evt === 'video_playing') {
          loadedRef.current = true;
          setIsLoading(false);
          setUnavailableReason(null);
          onStallStateChangeRef.current?.(false);
          if (pausedRef.current) {
            postDailymotionCommand(iframeRef.current, 'pause');
            return;
          }
          if (pendingSeekRef.current !== null && pendingSeekRef.current > 0.5) {
            const target = pendingSeekRef.current;
            pendingSeekRef.current = null;
            postDailymotionCommand(iframeRef.current, 'seek', [target]);
          }
          if (typeof parsed.time === 'number') {
            lastRemoteTimeEventAtRef.current = Date.now();
            reportProgress(parsed.time, parsed.duration);
          }
          onPlayingChangeRef.current?.(true);
          if (evt === 'play' || evt === 'video_play') {
            onSdkSyncEventRef.current?.('VIDEO_PLAY', makeSnapshot(true));
          }
          return;
        }

        if (evt === 'pause' || evt === 'video_pause') {
          if (typeof parsed.time === 'number') {
            lastRemoteTimeEventAtRef.current = Date.now();
            reportProgress(parsed.time, parsed.duration);
          }
          onPlayingChangeRef.current?.(false);
          onSdkSyncEventRef.current?.('VIDEO_PAUSE', makeSnapshot(false));
          return;
        }

        if (evt === 'seeked' || evt === 'video_seekend') {
          if (typeof parsed.time === 'number') {
            lastRemoteTimeEventAtRef.current = Date.now();
            reportProgress(parsed.time, parsed.duration);
          }
          onSdkSyncEventRef.current?.('VIDEO_SEEKEND', makeSnapshot(!pausedRef.current));
          return;
        }

        if (evt === 'ended' || evt === 'video_end') {
          onPlayingChangeRef.current?.(false);
          onVideoEndedRef.current?.();
          return;
        }

        if (evt === 'ad_start') {
          adIsPlayingRef.current = true;
          loadedRef.current = true;
          setIsLoading(false);
          onStallStateChangeRef.current?.(false);
          return;
        }

        if (evt === 'ad_end') {
          adIsPlayingRef.current = false;
          onSdkSyncEventRef.current?.('AD_END', makeSnapshot(!pausedRef.current));
          return;
        }

        if (evt === 'error' || evt === 'player_error') {
          setIsLoading(false);
          setUnavailableReason(
            parsed.errorMessage || 'This video is unavailable or geo-blocked in your region.'
          );
          onPlayingChangeRef.current?.(false);
          onStallStateChangeRef.current?.(false);
        }
      };

      window.addEventListener('message', handleMessage);
      return () => window.removeEventListener('message', handleMessage);
    }, [cleanVideoId, autoplay, reportProgress]);

    // Smooth fallback clock when iframe has loaded and cross-origin postMessage timeupdate isn't emitted
    useEffect(() => {
      if (!cleanVideoId || paused || unavailableReason) return;

      const timer = window.setInterval(() => {
        if (!loadedRef.current || pausedRef.current || adIsPlayingRef.current) return;
        const msSinceRemote = Date.now() - lastRemoteTimeEventAtRef.current;
        if (msSinceRemote >= 1400) {
          const next = savedTimeRef.current + 0.5 * playbackRateRef.current;
          reportProgress(next);
        }
      }, 500);

      return () => window.clearInterval(timer);
    }, [cleanVideoId, paused, unavailableReason, reportProgress]);

    const handleIframeLoad = useCallback(() => {
      loadedRef.current = true;
      setIsLoading(false);
      setUnavailableReason(null);
      onStallStateChangeRef.current?.(false);

      postDailymotionCommand(iframeRef.current, 'muted', [mutedRef.current]);
      if (playbackRateRef.current !== 1) {
        postDailymotionCommand(iframeRef.current, 'playbackSpeed', [playbackRateRef.current]);
      }
      const targetSeek = pendingSeekRef.current ?? savedTimeRef.current;
      if (targetSeek > 0.5) {
        postDailymotionCommand(iframeRef.current, 'seek', [targetSeek]);
      }
      if (pausedRef.current || !autoplay) {
        postDailymotionCommand(iframeRef.current, 'pause');
        onPlayingChangeRef.current?.(false);
      } else {
        postDailymotionCommand(iframeRef.current, 'play');
        onPlayingChangeRef.current?.(true);
      }
    }, [autoplay]);

    // Sync paused state to iframe
    useEffect(() => {
      if (!loadedRef.current) return;
      if (paused) {
        postDailymotionCommand(iframeRef.current, 'pause');
      } else {
        if (pendingSeekRef.current !== null && pendingSeekRef.current > 0.5) {
          postDailymotionCommand(iframeRef.current, 'seek', [pendingSeekRef.current]);
          pendingSeekRef.current = null;
        }
        postDailymotionCommand(iframeRef.current, 'play');
      }
    }, [paused]);

    // Sync muted state to iframe
    useEffect(() => {
      if (!loadedRef.current) return;
      postDailymotionCommand(iframeRef.current, 'muted', [muted]);
      postDailymotionCommand(iframeRef.current, muted ? 'mute' : 'unmute');
    }, [muted]);

    // Sync playback rate
    useEffect(() => {
      if (!loadedRef.current) return;
      postDailymotionCommand(iframeRef.current, 'playbackSpeed', [playbackRate]);
    }, [playbackRate]);

    // Sync imperative seek requests (scrubbing & Watch Party catch-up seeks)
    useEffect(() => {
      if (!seekRequest || seekRequest.nonce <= 0) return;
      const target = Math.max(0, seekRequest.time);
      savedTimeRef.current = target;
      pendingSeekRef.current = target;
      if (!loadedRef.current) return;
      postDailymotionCommand(iframeRef.current, 'seek', [target]);
      pendingSeekRef.current = null;
      if (pausedRef.current) {
        postDailymotionCommand(iframeRef.current, 'pause');
      } else {
        postDailymotionCommand(iframeRef.current, 'play');
      }
    }, [seekRequest]);

    // Replay preview from 0s
    useEffect(() => {
      if (!replayNonce || replayNonce <= 0) return;
      savedTimeRef.current = 0;
      pendingSeekRef.current = 0;
      if (!loadedRef.current) return;
      postDailymotionCommand(iframeRef.current, 'seek', [0]);
      postDailymotionCommand(iframeRef.current, 'play');
    }, [replayNonce]);

    return (
      <div className="relative w-full h-full bg-[#060608] overflow-hidden">
        {embedSrc && (
          <iframe
            ref={iframeRef}
            key={`dm-iframe-${cleanVideoId}-r${reloadNonce}-l${localRetryNonce}-cc${ccSubtitles ? '1' : '0'}`}
            src={embedSrc}
            title={title}
            onLoad={handleIframeLoad}
            referrerPolicy="no-referrer-when-downgrade"
            allow="autoplay; fullscreen; picture-in-picture"
            allowFullScreen
            className={`${className} ${
              interactive ? 'pointer-events-auto' : 'pointer-events-none'
            }`}
          />
        )}

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
