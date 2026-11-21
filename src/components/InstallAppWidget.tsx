import React, { useState } from 'react';
import { createPortal } from 'react-dom';
import {
  ArrowUp,
  Check,
  Copy,
  Download,
  ExternalLink,
  MoreVertical,
  PlusSquare,
  Share,
  Smartphone,
  X,
} from 'lucide-react';
import { usePWAInstall } from '../hooks/usePWAInstall';

interface InstallAppWidgetProps {
  storageKey?: string;
}

export const InstallAppWidget: React.FC<InstallAppWidgetProps> = ({
  storageKey = 'dramawin_install_home_dismissed_v1',
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInAppBrowser,
    install,
    openInExternalBrowser,
  } = usePWAInstall();

  const [dismissed, setDismissed] = useState<boolean>(() => {
    if (typeof window === 'undefined' || !window.localStorage) return false;
    try {
      return window.localStorage.getItem(storageKey) === 'true';
    } catch {
      return false;
    }
  });
  const [showModal, setShowModal] = useState(false);
  const [installing, setInstalling] = useState(false);
  const [copiedLink, setCopiedLink] = useState(false);

  // Automatically hide if the app is already running in standalone/installed mode
  if (isInstalled || dismissed) {
    return null;
  }

  const handleDismiss = () => {
    setDismissed(true);
    try {
      window.localStorage.setItem(storageKey, 'true');
    } catch {
      // Ignore storage quota errors
    }
  };

  const hasNativePrompt =
    Boolean(
      typeof window !== 'undefined' &&
        (window.__deferredPrompt || window.__dramawinInstallPrompt)
    ) || isInstallable;

  const handleInstallClick = async () => {
    if (installing) return;
    const nativePrompt =
      typeof window !== 'undefined'
        ? window.__deferredPrompt || window.__dramawinInstallPrompt
        : null;

    if (nativePrompt || isInstallable) {
      setInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'accepted') {
          setShowModal(false);
        } else if (outcome === 'unavailable') {
          setShowModal(true);
        }
      } finally {
        setInstalling(false);
      }
      return;
    }

    setShowModal(true);
  };

  const handleCopyLink = async () => {
    if (typeof window === 'undefined') return;
    try {
      if (window.navigator.clipboard?.writeText) {
        await window.navigator.clipboard.writeText(window.location.href);
      } else {
        const el = document.createElement('textarea');
        el.value = window.location.href;
        el.setAttribute('readonly', '');
        el.style.position = 'absolute';
        el.style.left = '-9999px';
        document.body.appendChild(el);
        el.select();
        document.execCommand('copy');
        document.body.removeChild(el);
      }
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-[#16120B] via-[#111116] to-[#15121B] border border-[#D4AF37]/40 px-4 py-3.5 shadow-[0_8px_28px_rgba(212,175,55,0.12)]">
        <div className="flex flex-wrap sm:flex-nowrap items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#09090b] border border-[#D4AF37]/60 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.28)]">
              <Smartphone className="w-5 h-5 text-[#FCE7A2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-display font-bold text-[#F6F2E9] truncate">
                Install DramaWin App
              </h3>
              <p className="text-[11px] text-[#B8B0A0] truncate">
                {hasNativePrompt
                  ? 'Tap Install DramaWin App for 1-tap instant install.'
                  : isIOS
                    ? 'iPhone / iPad: Tap Share → Add to Home Screen.'
                    : isInAppBrowser
                      ? 'Open in Chrome or Safari to add to Home Screen.'
                      : 'Add to your Home Screen for fast full-screen viewing.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0 ml-auto">
            <button
              type="button"
              disabled={installing}
              onClick={() => void handleInstallClick()}
              className="min-h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{installing ? 'Opening...' : 'Install DramaWin App'}</span>
            </button>

            <button
              type="button"
              onClick={handleDismiss}
              aria-label="Dismiss Install DramaWin App prompt"
              className="min-h-[36px] min-w-[36px] rounded-xl border border-white/[0.1] text-zinc-400 hover:text-white hover:bg-white/[0.06] flex items-center justify-center transition-colors cursor-pointer"
            >
              <X className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {showModal &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            role="dialog"
            aria-modal="true"
            aria-label="Install DramaWin App"
            onClick={() => setShowModal(false)}
            style={{ zIndex: 2147483647 }}
            className="fixed inset-0 z-[2147483647] bg-black/80 backdrop-blur-sm flex items-center justify-center p-4 pb-28 sm:p-6"
          >
            <div
              onClick={(e) => e.stopPropagation()}
              className="w-full max-w-sm rounded-2xl bg-gradient-to-b from-[#16130B] via-[#101015] to-[#0B0B0F] border border-[#D4AF37]/55 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.9)] space-y-4 text-[#F6F2E9]"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="flex items-center gap-2.5">
                  <div className="w-10 h-10 rounded-xl bg-[#1C180E] border border-[#D4AF37]/60 flex items-center justify-center shrink-0 shadow-[0_0_18px_rgba(212,175,55,0.25)]">
                    <Smartphone className="w-5 h-5 text-[#FCE7A2]" />
                  </div>
                  <div>
                    <h4 className="text-base font-display font-bold text-[#FCE7A2]">
                      Install DramaWin App
                    </h4>
                    <p className="text-xs text-[#A69F91]">
                      {isIOS
                        ? 'iPhone & iPad Safari Guide'
                        : 'Browser Menu Install Guide'}
                    </p>
                  </div>
                </div>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  aria-label="Close install instructions"
                  className="w-8 h-8 rounded-lg border border-white/10 text-zinc-400 hover:text-white flex items-center justify-center cursor-pointer"
                >
                  <X className="w-4 h-4" />
                </button>
              </div>

              {isIOS ? (
                <div className="space-y-3 text-xs text-[#E8E1D3]">
                  {isInAppBrowser && (
                    <div className="space-y-2 pb-1">
                      <p className="leading-relaxed text-[#CFC8B8]">
                        You are viewing this inside an in-app browser. Open it in{' '}
                        <strong className="text-[#FCE7A2]">Safari</strong> first to install:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={openInExternalBrowser}
                          className="min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_20px_rgba(251,191,36,0.3)] hover:brightness-105 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Safari</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink()}
                          className="min-h-[40px] px-3 rounded-xl border border-[#D4AF37]/40 bg-[#18181F] hover:bg-[#1F1F28] text-[#FCE7A2] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <ol className="space-y-2.5 text-xs text-[#E8E1D3]">
                    <li className="flex items-center gap-3 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 p-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1A160B] border border-[#D4AF37]/50 flex items-center justify-center shrink-0 relative">
                        <Share className="w-4 h-4 text-[#FCE7A2]" />
                        <ArrowUp className="w-2.5 h-2.5 text-[#D4AF37] absolute -top-1 -right-1 bg-[#09090D] rounded-full" />
                      </div>
                      <span className="leading-relaxed">
                        <strong className="text-[#FCE7A2]">1. Tap the Share button (⬆️)</strong> in Safari&apos;s bottom bar.
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 p-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1A160B] border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                        <PlusSquare className="w-4 h-4 text-[#FCE7A2]" />
                      </div>
                      <span className="leading-relaxed">
                        <strong className="text-[#FCE7A2]">2. Scroll down and tap Add to Home Screen</strong>.
                      </span>
                    </li>
                  </ol>

                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 text-xs font-extrabold hover:brightness-105 cursor-pointer"
                  >
                    Got it
                  </button>
                </div>
              ) : (
                <div className="space-y-3 text-xs text-[#E8E1D3]">
                  {isInAppBrowser && (
                    <div className="space-y-2 pb-1">
                      <p className="leading-relaxed text-[#CFC8B8]">
                        You are viewing this inside an in-app browser. Open it in{' '}
                        <strong className="text-[#FCE7A2]">Chrome</strong> for 1-tap installation:
                      </p>
                      <div className="grid grid-cols-2 gap-2">
                        <button
                          type="button"
                          onClick={openInExternalBrowser}
                          className="min-h-[40px] px-3 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-bold flex items-center justify-center gap-1.5 shadow-[0_6px_20px_rgba(251,191,36,0.3)] hover:brightness-105 cursor-pointer"
                        >
                          <ExternalLink className="w-3.5 h-3.5" />
                          <span>Open in Chrome</span>
                        </button>
                        <button
                          type="button"
                          onClick={() => void handleCopyLink()}
                          className="min-h-[40px] px-3 rounded-xl border border-[#D4AF37]/40 bg-[#18181F] hover:bg-[#1F1F28] text-[#FCE7A2] font-semibold flex items-center justify-center gap-1.5 cursor-pointer"
                        >
                          {copiedLink ? (
                            <>
                              <Check className="w-3.5 h-3.5 text-emerald-400" />
                              <span>Copied!</span>
                            </>
                          ) : (
                            <>
                              <Copy className="w-3.5 h-3.5" />
                              <span>Copy Link</span>
                            </>
                          )}
                        </button>
                      </div>
                    </div>
                  )}

                  <ol className="space-y-2.5 text-xs text-[#E8E1D3]">
                    <li className="flex items-center gap-3 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 p-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1A160B] border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                        <MoreVertical className="w-4 h-4 text-[#FCE7A2]" />
                      </div>
                      <span className="leading-relaxed">
                        <strong className="text-[#FCE7A2]">1. Tap your browser&apos;s top-right menu (⋮)</strong>.
                      </span>
                    </li>
                    <li className="flex items-center gap-3 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 p-3">
                      <div className="w-9 h-9 rounded-lg bg-[#1A160B] border border-[#D4AF37]/50 flex items-center justify-center shrink-0">
                        <PlusSquare className="w-4 h-4 text-[#FCE7A2]" />
                      </div>
                      <span className="leading-relaxed">
                        <strong className="text-[#FCE7A2]">2. Tap Install App or Add to Home Screen</strong>.
                      </span>
                    </li>
                  </ol>

                  <button
                    type="button"
                    onClick={() => setShowModal(false)}
                    className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 text-xs font-extrabold hover:brightness-105 cursor-pointer"
                  >
                    Got it
                  </button>
                </div>
              )}
            </div>
          </div>,
          document.body
        )}
    </>
  );
};
