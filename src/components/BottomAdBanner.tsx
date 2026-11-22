import React from 'react';
import { ExternalLink, Sparkles } from 'lucide-react';
import { MONETAG_LINK } from '../constants';

export const BottomAdBanner: React.FC = () => {
  return (
    <div className="w-full max-w-full overflow-hidden bg-[#09090b] flex items-center justify-center px-2">
      <a
        href={MONETAG_LINK}
        target="_blank"
        rel="noopener noreferrer"
        aria-label="Featured Partner Offer — Visit Sponsor Page"
        className="w-full max-w-[320px] h-[50px] px-3.5 rounded-xl bg-gradient-to-r from-[#17120A] via-[#120E08] to-[#17120A] border border-[#D4AF37]/45 hover:border-[#FCE7A2]/80 flex items-center justify-between gap-2 shadow-[0_0_18px_rgba(212,175,55,0.2)] transition-all"
      >
        <div className="flex items-center gap-2 min-w-0">
          <Sparkles className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <div className="min-w-0 text-left">
            <p className="text-[11px] font-extrabold text-[#FCE7A2] truncate leading-tight">
              Featured Partner Offer
            </p>
            <p className="text-[10px] text-[#A69F91] truncate leading-tight">
              Tap to explore sponsored deals
            </p>
          </div>
        </div>
        <span className="shrink-0 px-2.5 py-1 rounded-lg bg-gradient-to-r from-[#FCE7A2] to-[#D4AF37] text-[#181307] text-[10px] font-extrabold inline-flex items-center gap-1">
          <span>Visit</span>
          <ExternalLink className="w-2.5 h-2.5" />
        </span>
      </a>
    </div>
  );
};
