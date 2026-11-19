import { useCallback, useEffect, useState } from 'react';

export interface BeforeInstallPromptEvent extends Event {
  prompt: () => Promise<void>;
  userChoice: Promise<{ outcome: 'accepted' | 'dismissed'; platform: string }>;
}

declare global {
  interface Window {
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
  return /FBAN|FBAV|Instagram|WhatsApp|TikTok|BytedanceWebview|Musical_ly|Snapchat|Line\/|MicroMessenger|wv\)/i.test(
    ua
  );
}

export function usePWAInstall() {
  const [deferredPrompt, setDeferredPrompt] = useState<BeforeInstallPromptEvent | null>(() =>
    typeof window !== 'undefined' ? window.__dramawinInstallPrompt || null : null
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

    if (window.__dramawinInstallPrompt) {
      setDeferredPrompt(window.__dramawinInstallPrompt);
    }

    const handleBeforeInstallPrompt = (e: Event) => {
      e.preventDefault();
      const promptEvt = e as BeforeInstallPromptEvent;
      window.__dramawinInstallPrompt = promptEvt;
      setDeferredPrompt(promptEvt);
    };

    const handleCustomReady = () => {
      if (window.__dramawinInstallPrompt) {
        setDeferredPrompt(window.__dramawinInstallPrompt);
      }
    };

    const handleAppInstalled = () => {
      window.__dramawinInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    };

    const mediaQuery = window.matchMedia('(display-mode: standalone)');
    const handleDisplayModeChange = () => checkStandalone();

    window.addEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
    window.addEventListener('dramawin-pwa-prompt-ready', handleCustomReady);
    window.addEventListener('appinstalled', handleAppInstalled);
    mediaQuery.addEventListener?.('change', handleDisplayModeChange);

    return () => {
      window.removeEventListener('beforeinstallprompt', handleBeforeInstallPrompt);
      window.removeEventListener('dramawin-pwa-prompt-ready', handleCustomReady);
      window.removeEventListener('appinstalled', handleAppInstalled);
      mediaQuery.removeEventListener?.('change', handleDisplayModeChange);
    };
  }, []);

  const install = useCallback(async (): Promise<'accepted' | 'dismissed' | 'unavailable'> => {
    const promptEvt = deferredPrompt || window.__dramawinInstallPrompt;
    if (!promptEvt) return 'unavailable';
    await promptEvt.prompt();
    const { outcome } = await promptEvt.userChoice;
    if (outcome === 'accepted') {
      window.__dramawinInstallPrompt = null;
      setDeferredPrompt(null);
      setIsInstalled(true);
    }
    return outcome;
  }, [deferredPrompt]);

  const openInExternalBrowser = useCallback(() => {
    if (typeof window === 'undefined') return;
    const currentUrl = window.location.href;
    if (!isIOS) {
      const strippedUrl = currentUrl.replace(/^https?:\/\//, '');
      window.location.href = `intent://${strippedUrl}#Intent;scheme=https;package=com.android.chrome;end`;
    } else {
      window.location.href = currentUrl.replace(/^https?:\/\//i, 'x-safari-https://');

      
    }
  }, [isIOS]);

  return {
    isInstallable: Boolean(deferredPrompt),
    isInstalled,
    isIOS,
    isInAppBrowser,
    inIframe,
    install,
    openInExternalBrowser,
  };
}
