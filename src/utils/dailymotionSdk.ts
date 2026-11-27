export interface DailymotionPlayerState {
  videoId?: string;
  videoTime?: number;
  videoDuration?: number;
  playerIsPaused?: boolean;
  playerIsMuted?: boolean;
  adIsPlaying?: boolean;
  error?: {
    code?: string;
    message?: string;
    title?: string;
  } | null;
}

export interface DailymotionPlayerInstance {
  play: () => void | Promise<void>;
  pause: () => void | Promise<void>;
  seek: (seconds: number) => void | Promise<void>;
  setMute: (muted: boolean) => void | Promise<void>;
  setVolume?: (volume: number) => void | Promise<void>;
  setPlaybackSpeed?: (speed: number) => void | Promise<void>;
  loadContent?: (content: { video: string; params?: Record<string, unknown> }) => void | Promise<void>;
  getState: () => Promise<DailymotionPlayerState>;
  on: (event: string, listener: (state: DailymotionPlayerState) => void) => void;
  off?: (event: string, listener: (state: DailymotionPlayerState) => void) => void;
  destroy?: () => void | Promise<void>;
}

export interface DailymotionSdkEvents {
  PLAYER_APIREADY: string;
  PLAYER_ERROR: string;
  VIDEO_PLAY: string;
  VIDEO_PLAYING: string;
  VIDEO_PAUSE: string;
  VIDEO_SEEKEND: string;
  VIDEO_TIMECHANGE: string;
  VIDEO_DURATIONCHANGE: string;
  VIDEO_END: string;
  AD_START: string;
  AD_END: string;
  AD_ERROR?: string;
  [key: string]: string | undefined;
}

export interface DailymotionSdkGlobal {
  events: DailymotionSdkEvents;
  createPlayer: (
    target: string | HTMLElement,
    options: {
      video?: string;
      params?: Record<string, unknown>;
    }
  ) => Promise<DailymotionPlayerInstance>;
}

declare global {
  interface Window {
    dailymotion?: DailymotionSdkGlobal;
  }
}

export const DAILYMOTION_SDK_SCRIPT_URL = 'https://geo.dailymotion.com/libs/player/x8lr5.js';

let sdkPromise: Promise<DailymotionSdkGlobal> | null = null;

export function loadDailymotionSdk(): Promise<DailymotionSdkGlobal> {
  if (typeof window === 'undefined') {
    return Promise.reject(new Error('Dailymotion SDK requires a browser environment.'));
  }

  if (window.dailymotion?.createPlayer) {
    return Promise.resolve(window.dailymotion);
  }

  if (sdkPromise) {
    return sdkPromise;
  }

  sdkPromise = new Promise<DailymotionSdkGlobal>((resolve, reject) => {
    const startMs = Date.now();
    let settled = false;

    const finishSuccess = () => {
      if (settled) return;
      if (window.dailymotion?.createPlayer) {
        settled = true;
        resolve(window.dailymotion);
      }
    };

    const finishError = (msg: string) => {
      if (settled) return;
      settled = true;
      sdkPromise = null;
      reject(new Error(msg));
    };

    let existingScript = Array.from(document.querySelectorAll('script')).find(
      (s) => s.src && s.src.includes('geo.dailymotion.com/libs/player')
    ) as HTMLScriptElement | undefined;

    if (!existingScript) {
      existingScript = document.createElement('script');
      existingScript.src = DAILYMOTION_SDK_SCRIPT_URL;
      existingScript.async = true;
      document.head.appendChild(existingScript);
    }

    const onLoad = () => finishSuccess();
    const onError = () => finishError('Failed to load Dailymotion Player SDK.');
    existingScript.addEventListener('load', onLoad, { once: true });
    existingScript.addEventListener('error', onError, { once: true });

    const pollTimer = window.setInterval(() => {
      if (window.dailymotion?.createPlayer) {
        window.clearInterval(pollTimer);
        finishSuccess();
        return;
      }
      if (Date.now() - startMs > 12000) {
        window.clearInterval(pollTimer);
        finishError('Dailymotion Player SDK timed out.');
      }
    }, 80);
  });

  return sdkPromise;
}
