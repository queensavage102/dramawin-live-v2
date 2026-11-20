import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, Zap } from 'lucide-react';
import { COIN_POT_BASE_REWARD, resolveSponsorLink } from '../constants';

const AD_COUNTDOWN_SECONDS = 20;

interface DoubleRewardModalProps {
  open: boolean;
  baseCoins?: number;
  sponsorUrl?: string;
  episodeTitle?: string;
  onStartSponsorTimer?: () => void;
  onClaimDouble: () => Promise<void>;
  onContinueAfterAd?: () => void;
  onCancelAd?: () => void;
  onClaimBase: () => Promise<void>;
}

const GoldCoinStackIllustration: React.FC = () => (
  <div className="relative w-24 h-20 mx-auto flex items-center justify-center">
    <div
      aria-hidden="true"
      className="absolute inset-0 rounded-full bg-[radial-gradient(circle,rgba(251,191,36,0.45)_0%,rgba(217,70,239,0.22)_48%,transparent_72%)] blur-lg"
    />
    <svg
      viewBox="0 0 120 96"
      className="relative w-24 h-20 drop-shadow-[0_10px_24px_rgba(250,204,21,0.5)]"
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

      <path d="M26 26l2 4.5 4.5 2-4.5 2-2 4.5-2-4.5-4.5-2 4.5-2z" fill="#FEF08A" />
      <path d="M98 18l1.6 3.5 3.5 1.6-3.5 1.6-1.6 3.5-1.6-3.5-3.5-1.6 3.5-1.6z" fill="#FFFFFF" />
      <circle cx="88" cy="24" r="2" fill="#F472B6" />
    </svg>
  </div>
);

type DoublePhase = 'offer' | 'overlay' | 'ready_to_claim';

export const DoubleRewardModal: React.FC<DoubleRewardModalProps> = ({
  open,
  baseCoins = COIN_POT_BASE_REWARD,
  sponsorUrl,
  episodeTitle,
  onClaimDouble,
  onContinueAfterAd,
  onClaimBase,
}) => {
  const [phase, setPhase] = useState<DoublePhase>('offer');
  const [submitting, setSubmitting] = useState<'base' | 'double' | null>(null);
  const [hasVisitedSponsor, setHasVisitedSponsor] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AD_COUNTDOWN_SECONDS);
  const [adProgress, setAdProgress] = useState(0);

  const hasVisitedSponsorRef = useRef(false);
  const accumulatedAwayMsRef = useRef(0);
  const awayStartAtRef = useRef(0);
  const timerRef = useRef<number | null>(null);

  const stopTimers = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setPhase('offer');
      setSubmitting(null);
      setHasVisitedSponsor(false);
      hasVisitedSponsorRef.current = false;
      accumulatedAwayMsRef.current = 0;
      awayStartAtRef.current = 0;
      setSecondsLeft(AD_COUNTDOWN_SECONDS);
      setAdProgress(0);
    } else {
      stopTimers();
    }
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'overlay') return;

    const totalMs = AD_COUNTDOWN_SECONDS * 1000;

    const getEffectiveAwayMs = () => {
      if (awayStartAtRef.current > 0 && document.visibilityState === 'hidden') {
        return Math.min(
          totalMs,
          accumulatedAwayMsRef.current + Math.max(0, Date.now() - awayStartAtRef.current)
        );
      }
      return Math.min(totalMs, accumulatedAwayMsRef.current);
    };

    const syncUI = (effectiveMs: number) => {
      const pct = Math.min(100, Math.max(0, (effectiveMs / totalMs) * 100));
      const remaining = Math.max(0, Math.ceil((totalMs - effectiveMs) / 1000));
      setAdProgress(pct);
      setSecondsLeft(remaining);
    };

    const handleVisibilityChange = () => {
      if (!hasVisitedSponsorRef.current) return;

      if (document.visibilityState === 'hidden') {
        if (awayStartAtRef.current === 0 && accumulatedAwayMsRef.current < totalMs) {
          awayStartAtRef.current = Date.now();
        }
        return;
      }

      if (document.visibilityState === 'visible') {
        if (awayStartAtRef.current > 0) {
          const awayChunk = Math.max(0, Date.now() - awayStartAtRef.current);
          accumulatedAwayMsRef.current = Math.min(totalMs, accumulatedAwayMsRef.current + awayChunk);
          awayStartAtRef.current = 0;
        }
        syncUI(accumulatedAwayMsRef.current);
        if (accumulatedAwayMsRef.current >= totalMs) {
          stopTimers();
          setAdProgress(100);
          setSecondsLeft(0);
          setPhase('ready_to_claim');
        }
      }
    };

    const handlePageHide = () => {
      if (
        hasVisitedSponsorRef.current &&
        awayStartAtRef.current === 0 &&
        accumulatedAwayMsRef.current < totalMs
      ) {
        awayStartAtRef.current = Date.now();
      }
    };

    const handleReturnCheck = () => {
      if (document.visibilityState === 'visible') {
        handleVisibilityChange();
      }
    };

    // Only track elapsed away time while document.visibilityState === 'hidden'
    timerRef.current = window.setInterval(() => {
      if (!hasVisitedSponsorRef.current) return;
      if (document.visibilityState !== 'hidden') return;
      if (awayStartAtRef.current === 0) {
        awayStartAtRef.current = Date.now();
      }
      syncUI(getEffectiveAwayMs());
    }, 250);

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('focus', handleReturnCheck);
    window.addEventListener('pageshow', handleReturnCheck);

    return () => {
      stopTimers();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('focus', handleReturnCheck);
      window.removeEventListener('pageshow', handleReturnCheck);
    };
  }, [open, phase]);

  if (!open) return null;

  const doubledCoins = baseCoins * 2;
  const activeMonetagUrl = resolveSponsorLink(sponsorUrl);

  const handleOpenSponsorOverlay = () => {
    if (submitting || phase !== 'offer') return;
    hasVisitedSponsorRef.current = false;
    setHasVisitedSponsor(false);
    accumulatedAwayMsRef.current = 0;
    awayStartAtRef.current = 0;
    setSecondsLeft(AD_COUNTDOWN_SECONDS);
    setAdProgress(0);
    setPhase('overlay');
  };

  const handleVisitSponsorClick = () => {
    hasVisitedSponsorRef.current = true;
    setHasVisitedSponsor(true);
    if (document.visibilityState === 'hidden' && awayStartAtRef.current === 0) {
      awayStartAtRef.current = Date.now();
    }
  };

  const handleClaimDoubleNow = async () => {
    if (submitting || phase !== 'ready_to_claim') return;
    setSubmitting('double');
    try {
      await onClaimDouble();
      onContinueAfterAd?.();
    } finally {
      setSubmitting(null);
    }
  };

  const handleBaseClaimClick = async () => {
    if (submitting || phase !== 'offer') return;
    setSubmitting('base');
    try {
      await onClaimBase();
    } finally {
      setSubmitting(null);
    }
  };

  if (phase === 'overlay' || phase === 'ready_to_claim') {
    const isComplete = phase === 'ready_to_claim';
    const topBarMessage = isComplete
      ? `Sponsor Ad • Ready! +${doubledCoins} Coins Unlocked`
      : hasVisitedSponsor
        ? `Paused (${secondsLeft}s left) — Tap Visit Sponsor Page to continue!`
        : 'Tap Visit Sponsor Page to start 20s timer';

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isComplete ? `Claim +${doubledCoins} Coins` : 'Sponsor Ad Overlay'}
        className="fixed inset-0 z-[2147483600] bg-[#09090b] flex flex-col w-full h-full overflow-hidden"
      >
        {/* 1) Slim Top Bar with live 20s gold progress bar & locked -> bright green Claim button */}
        <header className="shrink-0 w-full bg-[#12100B] border-b border-[#D4AF37]/40 shadow-[0_6px_28px_rgba(0,0,0,0.8)]">
          <div className="px-3 sm:px-5 py-2 flex items-center justify-between gap-3">
            <div className="min-w-0 flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#FCE7A2]">
              <span
                className={`w-2 h-2 rounded-full shrink-0 ${
                  isComplete ? 'bg-emerald-400' : 'bg-amber-400'
                }`}
              />
              <span className="truncate font-mono-num">{topBarMessage}</span>
            </div>

            <button
              type="button"
              disabled={!isComplete || submitting === 'double'}
              onClick={() => void handleClaimDoubleNow()}
              className={`shrink-0 min-h-[36px] px-3.5 rounded-xl font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.55)] hover:brightness-105 active:scale-[0.98] cursor-pointer'
                  : 'bg-white/[0.06] border border-white/15 text-zinc-400 cursor-not-allowed'
              }`}
            >
              {isComplete ? (
                <span>
                  {submitting === 'double' ? 'Claiming...' : `✕ Claim +${doubledCoins}`}
                </span>
              ) : (
                <span className="font-mono-num">{`🔒 ${secondsLeft}s`}</span>
              )}
            </button>
          </div>

          <div className="h-1.5 w-full bg-black/80 overflow-hidden">
            <div
              className={`h-full will-change-[width] transition-[width] duration-150 ease-linear ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.85)]'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
              }`}
              style={{ width: `${isComplete ? 100 : Math.min(100, Math.max(0, adProgress))}%` }}
            />
          </div>
        </header>

        {/* 2) Dark-and-Gold Featured Sponsor Spotlight Card centered below top bar */}
        <div className="flex-1 w-full bg-[#09090b] relative overflow-y-auto flex items-center justify-center p-4 sm:p-6">
          <div
            aria-hidden="true"
            className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.18),transparent_68%)]"
          />

          <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1B150A] via-[#100D08] to-[#08080A] border border-[#D4AF37]/50 shadow-[0_0_75px_rgba(212,175,55,0.28)] ring-1 ring-inset ring-[#FCE7A2]/15 p-6 sm:p-8 text-center space-y-5 overflow-hidden">
            <div
              aria-hidden="true"
              className="pointer-events-none absolute -top-20 left-1/2 -translate-x-1/2 w-72 h-40 rounded-full bg-[radial-gradient(circle,rgba(252,231,162,0.28),transparent_70%)] blur-2xl"
            />

            <div className="relative inline-flex items-center gap-1.5 px-3.5 py-1 rounded-full bg-[#D4AF37]/15 border border-[#D4AF37]/45 text-[11px] font-bold uppercase tracking-widest text-[#FCE7A2]">
              <Sparkles className="w-3.5 h-3.5 text-[#FCE7A2]" />
              <span>Featured Sponsor Spotlight</span>
            </div>

            <div className="relative space-y-2.5">
              <h3 className="text-2xl sm:text-3xl font-display font-extrabold tracking-tight bg-gradient-to-r from-[#FFF7D6] via-[#F3D37A] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_0_20px_rgba(251,191,36,0.45)]">
                🔥 Featured Partner Offer
              </h3>
              <p className="text-xs sm:text-sm text-[#D6CEBF] leading-relaxed max-w-sm mx-auto">
                Tap below to explore today&apos;s sponsor while your 20s reward timer completes!
              </p>
            </div>

            <div className="relative pt-1">
              <a
                href={activeMonetagUrl}
                target="_blank"
                rel="noopener noreferrer"
                onClick={handleVisitSponsorClick}
                className="w-full min-h-[54px] px-5 rounded-2xl bg-gradient-to-r from-[#FCE7A2] via-[#E8C96D] to-[#D4AF37] text-[#181307] font-extrabold text-sm sm:text-base shadow-[0_0_32px_rgba(212,175,55,0.5)] hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 cursor-pointer"
              >
                <span>Visit Sponsor Page ↗</span>
              </a>
            </div>

            <p className="relative text-[11px] font-mono-num font-semibold text-[#A69F91]">
              {isComplete
                ? `Reward ready — tap ✕ Claim +${doubledCoins} at the top right!`
                : hasVisitedSponsor
                  ? `Paused (${secondsLeft}s left) — Tap Visit Sponsor Page to continue!`
                  : 'Tap Visit Sponsor Page to start 20s timer'}
            </p>
          </div>
        </div>
      </div>
    );
  }

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Congratulations! Episode Reward Unlocked"
      className="fixed inset-0 z-[95] bg-black/82 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="relative w-full max-w-sm rounded-3xl bg-gradient-to-b from-[#17121E] via-[#0F0D14] to-[#09090b] border border-amber-400/40 shadow-[0_0_70px_rgba(245,158,11,0.35)] p-6 text-center space-y-5 overflow-hidden">
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
            onClick={handleOpenSponsorOverlay}
            className="w-full min-h-[52px] px-4 rounded-2xl bg-gradient-to-r from-amber-400 via-yellow-400 to-fuchsia-500 text-zinc-950 font-extrabold text-sm shadow-[0_0_28px_rgba(251,191,36,0.55)] hover:brightness-110 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer disabled:opacity-60"
          >
            <span className="px-1.5 py-0.5 rounded bg-zinc-950/90 text-amber-300 font-mono-num text-[10px] font-black tracking-wider">
              AD
            </span>
            <Zap className="w-4 h-4 fill-current" />
            <span>{`AD Double Rewards (x2) +${doubledCoins}`}</span>
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
