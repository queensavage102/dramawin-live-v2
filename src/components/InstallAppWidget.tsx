import React, { useState } from 'react';
import {
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
  storageKey = 'dramawin_install_widget_dismissed_v1',
}) => {
  const {
    isInstallable,
    isInstalled,
    isIOS,
    isInAppBrowser,
    inIframe,
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

  const handleInstallClick = async () => {
    if (isInstallable && !installing) {
      setInstalling(true);
      try {
        const outcome = await install();
        if (outcome === 'unavailable') {
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
      await window.navigator.clipboard.writeText(window.location.href);
      setCopiedLink(true);
      window.setTimeout(() => setCopiedLink(false), 2500);
    } catch {
      // Ignore clipboard errors
    }
  };

  return (
    <>
      <div className="rounded-2xl bg-gradient-to-r from-[#16120B] via-[#111116] to-[#15121B] border border-[#D4AF37]/40 px-4 py-3.5 shadow-[0_8px_28px_rgba(212,175,55,0.12)]">
        <div className="flex items-center justify-between gap-3">
          <div className="flex items-center gap-3 min-w-0">
            <div className="w-11 h-11 rounded-xl bg-[#09090b] border border-[#D4AF37]/60 flex items-center justify-center shrink-0 shadow-[0_0_16px_rgba(212,175,55,0.28)]">
              <Smartphone className="w-5 h-5 text-[#FCE7A2]" />
            </div>
            <div className="min-w-0">
              <h3 className="text-sm font-display font-bold text-[#F6F2E9] truncate">
                Install DramaWin App
              </h3>
              <p className="text-[11px] text-[#B8B0A0] truncate">
                {isInstallable
                  ? 'Tap Install for one-tap Home Screen access.'
                  : 'Add to your Home Screen for instant full-screen access.'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-1.5 shrink-0">
            <button
              type="button"
              disabled={installing}
              onClick={() => void handleInstallClick()}
              className="min-h-[38px] px-3.5 rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-zinc-950 font-extrabold text-xs inline-flex items-center gap-1.5 shadow-[0_0_16px_rgba(251,191,36,0.35)] hover:brightness-110 active:scale-[0.98] disabled:opacity-70 transition-all cursor-pointer whitespace-nowrap"
            >
              <Download className="w-3.5 h-3.5" />
              <span>{installing ? 'Opening...' : 'Install'}</span>
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

      {showModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="Install DramaWin App"
          onClick={() => setShowModal(false)}
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-end sm:items-center justify-center p-4"
        >
          <div
            onClick={(e) => e.stopPropagation()}
            className="w-full max-w-sm rounded-2xl bg-[#121217] border border-[#D4AF37]/50 p-5 shadow-[0_16px_48px_rgba(0,0,0,0.85)] space-y-4 text-[#F6F2E9]"
          >
            <div className="flex items-start justify-between gap-3">
              <div className="flex items-center gap-2.5">
                <div className="w-10 h-10 rounded-xl bg-[#1C180E] border border-[#D4AF37]/60 flex items-center justify-center shrink-0">
                  <Smartphone className="w-5 h-5 text-[#FCE7A2]" />
                </div>
                <div>
                  <h4 className="text-base font-display font-bold text-[#FCE7A2]">
                    Add DramaWin to Home Screen
                  </h4>
                  <p className="text-xs text-[#A69F91]">
                    2 quick steps for full-screen app mode
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

            {isInAppBrowser || inIframe ? (
              <div className="space-y-3 text-xs text-[#E8E1D3]">
                <p className="leading-relaxed text-[#CFC8B8]">
                  You are viewing this inside an in-app browser. Open it in{' '}
                  <strong className="text-[#FCE7A2]">{isIOS ? 'Safari' : 'Chrome'}</strong> to
                  install the app to your Home Screen:
                </p>

  <button
    type="button"
    onClick={openInExternalBrowser}
    className="w-full min-h-[42px] rounded-xl bg-gradient-to-r from-amber-400 via-yellow-400 to-amber-500 text-black font-bold flex items-center justify-center gap-2"
  >
    <ExternalLink className="w-4 h-4" />
    <span>{isIOS ? 'Open in Safari Now' : 'Open in Chrome Now'}</span>
        
  </button>



                <button
                  type="button"
                  onClick={() => void handleCopyLink()}
                  className="w-full min-h-[40px] rounded-xl border border-[#D4AF37]/40 bg-[#18181F] text-[#FCE7A2] font-semibold text-xs flex items-center justify-center gap-2 cursor-pointer"
                >
                  {copiedLink ? (
                    <>
                      <Check className="w-4 h-4 text-emerald-400" />
                      <span>Link Copied! Paste in {isIOS ? 'Safari' : 'Chrome'}</span>
                    </>
                  ) : (
                    <>
                      <Copy className="w-4 h-4" />
                      <span>Copy App Link</span>
                    </>
                  )}
                </button>
              </div>
            ) : isIOS ? (
              <ol className="space-y-2.5 text-xs text-[#E8E1D3]">
                <li className="flex items-center gap-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 p-3">
                  <Share className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    1. Tap the <strong className="text-[#FCE7A2]">Share</strong> button at the
                    bottom of Safari.
                  </span>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 p-3">
                  <PlusSquare className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    2. Scroll down and tap{' '}
                    <strong className="text-[#FCE7A2]">Add to Home Screen</strong>.
                  </span>
                </li>
              </ol>
            ) : (
              <ol className="space-y-2.5 text-xs text-[#E8E1D3]">
                <li className="flex items-center gap-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 p-3">
                  <MoreVertical className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    1. Tap the <strong className="text-[#FCE7A2]">⋮ menu</strong> at the top-right
                    of your browser.
                  </span>
                </li>
                <li className="flex items-center gap-2.5 rounded-xl bg-[#0B0B0F] border border-white/10 p-3">
                  <PlusSquare className="w-4 h-4 text-amber-300 shrink-0" />
                  <span>
                    2. Tap <strong className="text-[#FCE7A2]">Install app</strong> or{' '}
                    <strong className="text-[#FCE7A2]">Add to Home screen</strong>.
                  </span>
                </li>
              </ol>
            )}

            <button
              type="button"
              onClick={() => setShowModal(false)}
              className="w-full min-h-[40px] rounded-xl border border-white/15 bg-white/[0.05] hover:bg-white/[0.1] text-xs font-bold text-[#F6F2E9] cursor-pointer"
            >
              Got it
            </button>
          </div>
        </div>
      )}
    </>
  );
};
