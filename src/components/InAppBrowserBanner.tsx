import React, { useEffect, useState } from 'react';
import { ExternalLink, X } from 'lucide-react';

const DISMISS_STORAGE_KEY = 'dramawin_inapp_banner_dismissed';

export function isSocialInAppBrowser(userAgent: string): boolean {
  if (!userAgent) return false;
  return /WhatsApp|FBAN|FBAV|FB_IAB|FBIOS|FB4A|Instagram/i.test(userAgent);
}

export const InAppBrowserBanner: React.FC = () => {
  const [visible, setVisible] = useState(false);

  useEffect(() => {
    if (typeof navigator === 'undefined') return;
    if (!isSocialInAppBrowser(navigator.userAgent || '')) return;

    try {
      if (window.sessionStorage.getItem(DISMISS_STORAGE_KEY) === 'true') {
        return;
      }
    } catch {
      // Ignore storage restrictions
    }

    setVisible(true);
  }, []);

  if (!visible) return null;

  const handleDismiss = () => {
    setVisible(false);
    try {
      window.sessionStorage.setItem(DISMISS_STORAGE_KEY, 'true');
    } catch {
      // Ignore storage restrictions
    }
  };

  return (
    <div
      role="region"
      aria-label="Browser playback tip"
      className="sticky top-0 z-[70] w-full bg-gradient-to-r from-[#2A2008] via-[#1C1608] to-[#2A2008] border-b border-amber-400/50 text-[#FCE7A2] px-3 py-2 pt-[max(0.5rem,env(safe-area-inset-top))] shadow-[0_6px_20px_rgba(0,0,0,0.65)]"
    >
      <div className="max-w-6xl mx-auto flex items-center justify-between gap-2.5">
        <div className="flex items-center gap-2 min-w-0">
          <ExternalLink className="w-4 h-4 text-amber-300 shrink-0" aria-hidden="true" />
          <p className="text-[11px] sm:text-xs font-semibold leading-snug text-[#FCE7A2]">
            For smooth video playback &amp; rewards, tap{' '}
            <span className="font-black text-white px-1 py-0.5 rounded bg-white/10">⋮</span> and
            select <strong className="text-amber-300">&apos;Open in Chrome&apos;</strong>
          </p>
        </div>

        <button
          type="button"
          onClick={handleDismiss}
          aria-label="Dismiss browser notice"
          className="min-h-[32px] min-w-[32px] rounded-lg flex items-center justify-center text-amber-200/80 hover:text-white hover:bg-white/10 transition-colors shrink-0 cursor-pointer"
        >
          <X className="w-4 h-4" />
        </button>
      </div>
    </div>
  );
};
