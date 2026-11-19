import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
    __deferredPrompt?: BeforeInstallPromptEvent | null;
    __dramawinInstallPrompt?: BeforeInstallPromptEvent | null;
  }
}

function detectIOS(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  const isAppleDevice = /iphone|ipad|ipod/i.test(ua);
  const isIPadOS =
    window.navigator.platform === 'MacIntel' && window.navigator.maxTouchPoints > 1;
  return isAppleDevice || isIPadOS;
}

function detectInAppBrowser(): boolean {
  if (typeof window === 'undefined') return false;
  const ua = window.navigator.userAgent || '';
  return /WhatsApp|FBAN|FBAV|FB_IAB|FBIOS|FB4A|Messenger|Orca|Instagram|TikTok|BytedanceWebview|Musical_ly|Telegram|Twitter|XApp|Snapchat|Line\/|MicroMessenger/i.test(
    ua
  );
}

const UNIVERSAL_ANDROID_BROWSER_INTENT =
  'intent://drama-win-tornement.vercel.app/#Intent;scheme=https;action=android.intent.action.VIEW;category=android.intent.category.BROWSABLE;end';
const IOS_SAFARI_EXTERNAL_URL = 'x-safari-https://drama-win-tornement.vercel.app';
const CHROME_SCHEME_FALLBACK =
  'googlechrome://navigate?url=https://drama-win-tornement.vercel.app';

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined'
      ? window.__deferredPrompt || window.__dramawinInstallPrompt || null
      : null
  );
  const [isInstalled, setIsInstalled] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    return (
      window.matchMedia('(display-mode: standalone)').matches ||
      (window.navigator as unknown as { standalone?: boolean }).standalone === true
    );
  });
  const [isIOS, setIsIOS] = useState<boolean>(() => detectIOS());
  const [isInAppBrowser, setIsInAppBrowser] = useState<boolean>(() => detectInAppBrowser());
  const [inIframe, setInIframe] = useState<boolean>(() => {
    if (typeof window === 'undefined') return false;
    try {
      return window.self !== window.top;
    } catch {
      return true;
    }
  });

  useEffect(() => {
    const checkStandalone = () => {
      const standalone =
        window.matchMedia('(display-mode: standalone)').matches ||
        (window.navigator as unknown as { standalone?: boolean }).standalone === true;
      setIsInstalled(standalone);
    };

    checkStandalone();
    setIsIOS(detectIOS());
    setIsInAppBrowser(detectInAppBrowser());
    try {
      setInIframe(window.self !== window.top);
    } catch {
      setInIframe(true);
    }

    const existingPrompt = window.__deferredPrompt || window.__dramawinInstallPrompt;
    if (existingPrompt) {
      setDeferredPrompt(existingPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      window.__deferredPrompt = promptEvt;
      window.__dramawinInstallPrompt = promptEvt;
      setDeferredPrompt(promptEvt);
    };

    const handleCustomReady = () => {
      const readyPrompt = window.__deferredPrompt || window.__dramawinInstallPrompt;
      if (readyPrompt) {
        setDeferredPrompt(readyPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__deferredPrompt = null;
      window.__dramawinInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkStandalone();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('dramawin-pwa-prompt-ready', handleCustomReady);
    window.addEventListener('dramawin-pwa-installed', handleAppInstalled);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('dramawin-pwa-prompt-ready', handleCustomReady);
      window.removeEventListener('dramawin-pwa-installed', handleAppInstalled);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvt =
      window.__deferredPrompt || window.__dramawinInstallPrompt || deferredPrompt;
    if (!promptEvt) return 'unavailable';
    try {
      await promptEvt.prompt();
      const { outcome } = await promptEvt.userChoice;
      window.__deferredPrompt = null;
      window.__dramawinInstallPrompt = null;
      setDeferredPrompt(null);
      if (outcome === 'accepted') {
        setIsInstalled(true);
      }
      return outcome;
    } catch {
      window.__deferredPrompt = null;
      window.__dramawinInstallPrompt = null;
      setDeferredPrompt(null);
      return 'unavailable';
    }
  }, [deferredPrompt]);

  const openInExternalBrowser = useCallback(() => {
    if (typeof window === 'undefined') return;
    if (!isIOS) {
      window.location.href = UNIVERSAL_ANDROID_BROWSER_INTENT;
      window.setTimeout(() => {
        if (!document.hidden) {
          window.location.href = CHROME_SCHEME_FALLBACK;
        }
      }, 800);
    } else {
      window.location.href = IOS_SAFARI_EXTERNAL_URL;
    }
  }, [isIOS]);

  return {
    isInstallable: Boolean(
      deferredPrompt ||
        (typeof window !== 'undefined' &&
          (window.__deferredPrompt || window.__dramawinInstallPrompt))
    ),
    isInstalled,
    isIOS,
    isInAppBrowser,
    inIframe,
    install,
    openInExternalBrowser,
  };
}
