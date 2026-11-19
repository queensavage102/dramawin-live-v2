import React, { useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { COIN_POT_BASE_REWARD, DEFAULT_SPONSOR_URL } from '../constants';

interface DoubleRewardModalProps {
  open: boolean;
  baseCoins?: number;
  sponsorUrl?: string;
  episodeTitle?: string;
  onStartSponsorTimer?: () => void;
  onClaimDouble: () => Promise<void>;
  onClaimBase: () => Promise<void>;
}

const GoldCoinStackIllustration: React.FC = () => (
  <div className="relative w-28 h-24 mx-auto flex items-center justify-center">
    <div
      aria-hidden="true"
      className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.45)_0%,rgba(217,70,239,0.22)_48%,transparent_72%)] blur-lg"
    />
    <svg
      viewBox="0 0 120 96"
      className="relative w-28 h-24 drop-shadow-[0_10px_24px_rgba(250,204,21,0.5)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="coinRimGrad" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#92400E" />
          <stop offset="35%" stopColor="#FBBF24" />
          <stop offset="55%" stopColor="#FEF08A" />
          <stop offset="85%" stopColor="#D97706" />
          <stop offset="100%" stopColor="#78350F" />
        </linearGradient>
        <radialGradient id="coinTopGrad" cx="35%" cy="32%" r="72%">
          <stop offset="0%" stopColor="#FFFBEB" />
          <stop offset="35%" stopColor="#FDE047" />
          <stop offset="78%" stopColor="#EAB308" />
          <stop offset="100%" stopColor="#A16207" />
        </radialGradient>
      </defs>

      {/* Left lower stack */}
      {[74, 66, 58].map((y, idx) => (
        <g key={`left-${idx}`}>
          <path
            d={`M18 ${y} v6 c0 5 11 9 24 9 s24-4 24-9 v-6 z`}
            fill="url(#coinRimGrad)"
            stroke="#78350F"
            strokeWidth="0.9"
          />
          <ellipse
            cx="42"
            cy={y}
            rx="24"
            ry="8.5"
            fill="url(#coinTopGrad)"
            stroke="#FEF9C3"
            strokeWidth="1"
          />
        </g>
      ))}

      {/* Right tall stack */}
      {[76, 68, 60, 52, 44, 36].map((y, idx) => (
        <g key={`right-${idx}`}>
          <path
            d={`M52 ${y} v6 c0 5 12 9 26 9 s26-4 26-9 v-6 z`}
            fill="url(#coinRimGrad)"
            stroke="#78350F"
            strokeWidth="0.9"
          />
          <ellipse
            cx="78"
            cy={y}
            rx="26"
            ry="9"
            fill="url(#coinTopGrad)"
            stroke="#FEF9C3"
            strokeWidth="1.1"
          />
        </g>
      ))}

      {/* Front hero coin */}
      <g transform="translate(0, 2)">
        <circle cx="56" cy="56" r="19" fill="#92400E" />
        <circle
          cx="54"
          cy="54"
          r="19"
          fill="url(#coinTopGrad)"
          stroke="#FEF9C3"
          strokeWidth="1.6"
        />
        <circle
          cx="54"
          cy="54"
          r="14.2"
          fill="none"
          stroke="#92400E"
          strokeWidth="1.1"
          strokeDasharray="2.2 2"
        />
        <text
          x="54"
          y="60"
          textAnchor="middle"
          fontSize="18"
          fontWeight="900"
          fontFamily="Georgia, serif"
          fill="#78350F"
        >
          $
        </text>
      </g>

      {/* Sparkles */}
      <path d="M26 26l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#FEF08A" />
      <path d="M98 18l1.6 3.5 3.5 1.6-3.5 1.6-1.6 3.5-1.6-3.5-3.5-1.6 3.5-1.6z" fill="#FFFFFF" />
      <circle cx="88" cy="24" r="2" fill="#F472B6" />
    </svg>
  </div>
);

export const DoubleRewardModal: React.FC<DoubleRewardModalProps> = ({
  open,
  baseCoins = COIN_POT_BASE_REWARD,
  sponsorUrl,
  episodeTitle,
  onStartSponsorTimer,
  onClaimDouble,
  onClaimBase,
}) => {
  const [submitting, setSubmitting] = useState<'double' | 'base' | null>(null);

  if (!open) return null;

  const doubledCoins = baseCoins * 2;

  const handleDoubleClick = async () => {
    if (submitting) return;
    // Open direct link synchronously on tap so mobile browsers allow it cleanly
    window.open(DEFAULT_SPONSOR_URL, '_blank');
    onStartSponsorTimer?.();
    setSubmitting('double');
    try {
      await onClaimDouble();
    } finally {
      setSubmitting(null);
    }
  };

  const handleBaseClaimClick = async () => {
    if (submitting) return;
    setSubmitting('base');
    try {
      await onClaimBase();
    } finally {
      setSubmitting(null);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Congratulations! Episode Reward Unlocked"
      className="fixed inset-0 z-[95] bg-black/82 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#17121E] via-[#0F0D14] to-[#09090b] border border-amber-400/40 shadow-[0_0_70px_rgba(245,158,11,0.35)] p-6 text-center space-y-5 overflow-hidden">
        {/* Ambient radial sheen */}
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-64 h-44 rounded-full bg-gradient-to-b from-amber-400/25 via-fuchsia-500/15 to-transparent blur-2xl"
        />

        <div className="relative space-y-1.5">
          <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-amber-400/15 border border-amber-400/35 text-[11px] font-bold uppercase tracking-widest text-amber-300">
            <Sparkles className="w-3.5 h-3.5" />
            <span>Coin Ring Complete</span>
          </div>
          <h3 className="text-2xl font-display font-bold bg-gradient-to-r from-amber-200 via-yellow-300 to-fuchsia-300 bg-clip-text text-transparent">
            Congratulations!
          </h3>
          {episodeTitle && (
            <p className="text-xs text-zinc-400 line-clamp-1 px-2">{episodeTitle}</p>
          )}
        </div>

        <GoldCoinStackIllustration />

        <div className="relative space-y-1">
          <p className="font-mono-num text-4xl font-black tracking-tight text-amber-300 drop-shadow-[0_0_16px_rgba(251,191,36,0.55)]">
            +{baseCoins.toLocaleString()}
          </p>
          <p className="text-xs font-medium text-zinc-400">
            Coins ready for your tournament wallet
          </p>
        </div>

        <div className="relative space-y-3 pt-1">
          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => void handleDoubleClick()}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-fuchsia-500 text-zinc-950 font-extrabold text-sm shadow-[0_0_28px_rgba(251,191,36,0.55)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-amber-300 font-mono-num text-[10px] font-black tracking-wider">
              AD
            </span>
            <Zap className="w-4 h-4 fill-current" />
            <span>
              {submitting === 'double'
                ? 'Crediting x2...'
                : `AD Double Rewards (x2) +${doubledCoins}`}
            </span>
          </button>

          <button
            type="button"
            disabled={Boolean(submitting)}
            onClick={() => void handleBaseClaimClick()}
            className="w-full min-h-[44px] text-xs font-semibold text-zinc-400 hover:text-white transition-colors cursor-pointer disabled:opacity-50"
          >
            {submitting === 'base' ? 'Claiming...' : `Claim +${baseCoins}`}
          </button>
        </div>
      </div>
    </div>
  );
};
