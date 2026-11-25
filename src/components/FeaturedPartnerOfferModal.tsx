import React, { useEffect, useRef, useState } from 'react';
import { Sparkles } from 'lucide-react';
import { MONETAG_LINK } from '../constants';

const AD_COUNTDOWN_SECONDS = 20;

interface FeaturedPartnerOfferModalProps {
  open: boolean;
  sponsorUrl?: string;
  claimLabel: string;
  readyHeadline?: string;
  initialVisited?: boolean;
  onClaim: () => Promise<void> | void;
  onCancel?: () => void;
}

export const FeaturedPartnerOfferModal: React.FC<FeaturedPartnerOfferModalProps> = ({
  open,
  sponsorUrl,
  claimLabel,
  readyHeadline,
  initialVisited = false,
  onClaim,
  onCancel,
}) => {
  const [submitting, setSubmitting] = useState(false);
  const [hasVisitedSponsor, setHasVisitedSponsor] = useState(false);
  const [secondsLeft, setSecondsLeft] = useState(AD_COUNTDOWN_SECONDS);
  const [adProgress, setAdProgress] = useState(0);
  const [isComplete, setIsComplete] = useState(false);

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
      setSubmitting(false);
      setHasVisitedSponsor(initialVisited);
      hasVisitedSponsorRef.current = initialVisited;
      accumulatedAwayMsRef.current = 0;
      awayStartAtRef.current =
        initialVisited && document.visibilityState === 'hidden' ? Date.now() : 0;
      setSecondsLeft(AD_COUNTDOWN_SECONDS);
      setAdProgress(0);
      setIsComplete(false);
    } else {
      stopTimers();
    }
  }, [open, initialVisited]);

  useEffect(() => {
    if (!open || isComplete) return;

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
          setIsComplete(true);
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
  }, [open, isComplete]);

  if (!open) return null;

  const activeMonetagUrl = MONETAG_LINK;
  const topBarMessage = isComplete
    ? readyHeadline || `Sponsor Ad • Ready! ${claimLabel} Unlocked`
    : hasVisitedSponsor
      ? `Paused (${secondsLeft}s left) — Tap Visit Sponsor Page to continue!`
      : 'Tap Visit Sponsor Page to start 20s timer';

  const handleVisitSponsorClick = () => {
    hasVisitedSponsorRef.current = true;
    setHasVisitedSponsor(true);
    if (document.visibilityState === 'hidden' && awayStartAtRef.current === 0) {
      awayStartAtRef.current = Date.now();
    }
  };

  const handleClaimClick = async () => {
    if (!isComplete || submitting) return;
    setSubmitting(true);
    try {
      await onClaim();
    } finally {
      setSubmitting(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={isComplete ? claimLabel : 'Featured Partner Offer'}
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
            disabled={!isComplete || submitting}
            onClick={() => void handleClaimClick()}
            className={`shrink-0 min-h-[36px] px-3.5 rounded-xl font-extrabold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 transition-all ${
              isComplete
                ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 text-zinc-950 shadow-[0_0_20px_rgba(16,185,129,0.55)] hover:brightness-105 active:scale-[0.98] cursor-pointer'
                : 'bg-white/[0.06] border border-white/15 text-zinc-400 cursor-not-allowed'
            }`}
          >
            {isComplete ? (
              <span>{submitting ? 'Claiming...' : `✕ ${claimLabel}`}</span>
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
              ? `Reward ready — tap ✕ ${claimLabel} at the top right!`
              : hasVisitedSponsor
                ? `Paused (${secondsLeft}s left) — Tap Visit Sponsor Page to continue!`
                : 'Tap Visit Sponsor Page to start 20s timer'}
          </p>

          {onCancel && !isComplete && !submitting && (
            <button
              type="button"
              onClick={onCancel}
              className="relative inline-block text-[11px] font-medium text-zinc-500 hover:text-zinc-300 underline underline-offset-4 transition-colors cursor-pointer"
            >
              Cancel (No Reward)
            </button>
          )}
        </div>
      </div>
    </div>
  );
};
