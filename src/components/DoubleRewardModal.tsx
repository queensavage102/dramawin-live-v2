import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ExternalLink, Lock, Play, Sparkles, X, Zap } from 'lucide-react';
import { COIN_POT_BASE_REWARD, resolveSponsorLink } from '../constants';
import { BottomAdBanner } from './BottomAdBanner';

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

type AdBreakPhase = 'offer' | 'watching_ad' | 'ad_complete';

export const DoubleRewardModal: React.FC<DoubleRewardModalProps> = ({
  open,
  baseCoins = COIN_POT_BASE_REWARD,
  sponsorUrl = '#',
  episodeTitle,
  onClaimDouble,
  onContinueAfterAd,
  onCancelAd,
  onClaimBase,
}) => {
  const [phase, setPhase] = useState<AdBreakPhase>('offer');
  const [submitting, setSubmitting] = useState<'base' | 'awarding' | null>(null);
  const [secondsLeft, setSecondsLeft] = useState(AD_COUNTDOWN_SECONDS);
  const [adProgress, setAdProgress] = useState(0);

  const startedAtRef = useRef(0);
  const cancelledRef = useRef(false);
  const awardTriggeredRef = useRef(false);
  const pushedHistoryRef = useRef(false);
  const timerRef = useRef<number | null>(null);
  const rafRef = useRef<number | null>(null);

  const onClaimDoubleRef = useRef(onClaimDouble);
  const onContinueAfterAdRef = useRef(onContinueAfterAd);
  const onCancelAdRef = useRef(onCancelAd);

  useEffect(() => {
    onClaimDoubleRef.current = onClaimDouble;
  }, [onClaimDouble]);

  useEffect(() => {
    onContinueAfterAdRef.current = onContinueAfterAd;
  }, [onContinueAfterAd]);

  useEffect(() => {
    onCancelAdRef.current = onCancelAd;
  }, [onCancelAd]);

  const stopTimers = () => {
    if (timerRef.current !== null) {
      window.clearInterval(timerRef.current);
      timerRef.current = null;
    }
    if (rafRef.current !== null) {
      window.cancelAnimationFrame(rafRef.current);
      rafRef.current = null;
    }
  };

  useEffect(() => {
    if (open) {
      setPhase('offer');
      setSubmitting(null);
      setSecondsLeft(AD_COUNTDOWN_SECONDS);
      setAdProgress(0);
      startedAtRef.current = 0;
      cancelledRef.current = false;
      awardTriggeredRef.current = false;
    } else {
      stopTimers();
      cancelledRef.current = true;
    }
  }, [open]);

  useEffect(() => {
    if (!open || phase !== 'watching_ad') return;

    const totalMs = AD_COUNTDOWN_SECONDS * 1000;
    startedAtRef.current = Date.now();
    cancelledRef.current = false;
    awardTriggeredRef.current = false;
    setSecondsLeft(AD_COUNTDOWN_SECONDS);
    setAdProgress(0);

    if (typeof window !== 'undefined' && !pushedHistoryRef.current) {
      try {
        window.history.pushState({ dramawinAdBreak: true }, '');
        pushedHistoryRef.current = true;
      } catch {
        // Ignore history API restrictions
      }
    }

    const cleanupHistoryEntry = () => {
      if (pushedHistoryRef.current) {
        pushedHistoryRef.current = false;
        try {
          window.history.back();
        } catch {
          // Ignore history back errors
        }
      }
    };

    const abortAdZeroCoins = (fromPopState = false) => {
      if (cancelledRef.current || awardTriggeredRef.current) return;
      cancelledRef.current = true;
      stopTimers();
      setAdProgress(0);
      setSecondsLeft(AD_COUNTDOWN_SECONDS);
      if (!fromPopState) {
        cleanupHistoryEntry();
      } else {
        pushedHistoryRef.current = false;
      }
      const cancelCallback = onCancelAdRef.current || onContinueAfterAdRef.current;
      cancelCallback?.();
    };

    const handleVisibilityChange = () => {
      if (document.hidden || document.visibilityState === 'hidden') {
        abortAdZeroCoins(false);
      }
    };

    const handlePageHide = () => {
      abortAdZeroCoins(false);
    };

    const handlePopState = () => {
      abortAdZeroCoins(true);
    };

    document.addEventListener('visibilitychange', handleVisibilityChange);
    window.addEventListener('pagehide', handlePageHide);
    window.addEventListener('popstate', handlePopState);

    const completeIfVisible = () => {
      if (
        cancelledRef.current ||
        awardTriggeredRef.current ||
        document.hidden ||
        document.visibilityState === 'hidden'
      ) {
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      if (elapsed < totalMs) return;

      awardTriggeredRef.current = true;
      stopTimers();
      setAdProgress(100);
      setSecondsLeft(0);
      setSubmitting('awarding');
      void onClaimDoubleRef
        .current()
        .catch(() => {})
        .finally(() => {
          if (cancelledRef.current) return;
          setSubmitting(null);
          setPhase('ad_complete');
        });
    };

    // Strict useRef interval timer enforcing 20s visible completion
    timerRef.current = window.setInterval(() => {
      if (cancelledRef.current || awardTriggeredRef.current) {
        stopTimers();
        return;
      }
      if (document.hidden || document.visibilityState === 'hidden') {
        abortAdZeroCoins(false);
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      const remaining = Math.max(0, Math.ceil((totalMs - elapsed) / 1000));
      setSecondsLeft(remaining);
      if (elapsed >= totalMs) {
        completeIfVisible();
      }
    }, 100);

    // Smooth 60fps visual progress & circular countdown ring animation
    const animate60fps = () => {
      if (cancelledRef.current || awardTriggeredRef.current) return;
      if (document.hidden || document.visibilityState === 'hidden') {
        abortAdZeroCoins(false);
        return;
      }
      const elapsed = Date.now() - startedAtRef.current;
      const pct = Math.min(100, Math.max(0, (elapsed / totalMs) * 100));
      setAdProgress(pct);

      if (elapsed >= totalMs) {
        completeIfVisible();
        return;
      }
      rafRef.current = window.requestAnimationFrame(animate60fps);
    };
    rafRef.current = window.requestAnimationFrame(animate60fps);

    return () => {
      stopTimers();
      document.removeEventListener('visibilitychange', handleVisibilityChange);
      window.removeEventListener('pagehide', handlePageHide);
      window.removeEventListener('popstate', handlePopState);
      if (!awardTriggeredRef.current && pushedHistoryRef.current) {
        cleanupHistoryEntry();
      }
    };
  }, [open, phase]);

  if (!open) return null;

  const doubledCoins = baseCoins * 2;

  const handleDoubleClick = () => {
    if (submitting || phase !== 'offer') return;
    // Start in-page 20s live ad break; coins are ONLY awarded if user stays visible for full 20s.
    setPhase('watching_ad');
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

  const handleExitAdEarly = () => {
    if (awardTriggeredRef.current || phase === 'ad_complete') return;
    cancelledRef.current = true;
    stopTimers();
    setAdProgress(0);
    setSecondsLeft(AD_COUNTDOWN_SECONDS);
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      try {
        window.history.back();
      } catch {
        // Ignore history back errors
      }
    }
    const cancelCallback = onCancelAd || onContinueAfterAd;
    cancelCallback?.();
  };

  const handleContinueMovie = () => {
    if (phase !== 'ad_complete') return;
    if (pushedHistoryRef.current) {
      pushedHistoryRef.current = false;
      try {
        window.history.back();
      } catch {
        // Ignore history back errors
      }
    }
    if (onContinueAfterAd) {
      onContinueAfterAd();
    }
  };

  if (phase === 'watching_ad' || phase === 'ad_complete') {
    const isComplete = phase === 'ad_complete';
    const ringSize = 84;
    const strokeWidth = 5;
    const radius = (ringSize - strokeWidth) / 2;
    const circumference = 2 * Math.PI * radius;
    const activePct = isComplete ? 100 : adProgress;
    const dashOffset = circumference * (1 - activePct / 100);

    return (
      <div
        role="dialog"
        aria-modal="true"
        aria-label={isComplete ? 'Ad Complete! Coins Earned' : 'Sponsored Ad Break'}
        className="fixed inset-0 z-[2147483600] bg-black/92 backdrop-blur-md flex flex-col justify-between p-3 sm:p-5 overflow-y-auto"
      >
        {/* Top Prominent 60fps Countdown Banner & Progress Bar */}
        <div className="w-full max-w-lg mx-auto rounded-2xl border border-[#D4AF37]/45 bg-[#12100B]/95 shadow-[0_10px_40px_rgba(0,0,0,0.85)] overflow-hidden shrink-0">
          <div className="px-4 py-3 flex items-center justify-between gap-3">
            {isComplete ? (
              <div className="inline-flex items-center gap-2 px-3 py-1 rounded-full bg-emerald-500/20 border border-emerald-400 text-emerald-300 text-xs sm:text-sm font-extrabold shadow-[0_0_20px_rgba(16,185,129,0.35)]">
                <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                <span>Ad Complete! +Coins Earned</span>
              </div>
            ) : (
              <div className="inline-flex items-center gap-2 text-xs sm:text-sm font-extrabold text-[#FCE7A2]">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span>
                  Sponsored Ad • Reward in{' '}
                  <span className="font-mono-num text-amber-300">{secondsLeft}s</span>...
                </span>
              </div>
            )}

            <button
              type="button"
              disabled={!isComplete}
              aria-disabled={!isComplete}
              onClick={handleContinueMovie}
              aria-label={
                isComplete
                  ? 'Close ad overlay and continue movie'
                  : `Close locked until countdown finishes (${secondsLeft}s)`
              }
              title={isComplete ? 'Close & Continue Movie' : `Wait ${secondsLeft}s`}
              className={`min-h-[36px] px-2.5 rounded-xl border text-xs font-bold inline-flex items-center gap-1 transition-all shrink-0 ${
                isComplete
                  ? 'border-emerald-400/60 bg-emerald-500/15 text-emerald-200 hover:bg-emerald-500/25 cursor-pointer'
                  : 'border-white/10 bg-white/[0.04] text-zinc-500 opacity-50 cursor-not-allowed'
              }`}
            >
              {isComplete ? <X className="w-4 h-4" /> : <Lock className="w-3.5 h-3.5" />}
            </button>
          </div>

          <div className="h-2.5 w-full bg-black/70 overflow-hidden">
            <div
              className={`h-full will-change-[width] ${
                isComplete
                  ? 'bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 shadow-[0_0_12px_rgba(16,185,129,0.8)]'
                  : 'bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)]'
              }`}
              style={{ width: `${activePct}%` }}
            />
          </div>
        </div>

        {/* Center Sponsored Ad Card with Animated Circular Ring & Live Ad Container */}
        <div className="my-auto w-full max-w-sm mx-auto rounded-3xl bg-gradient-to-b from-[#17121E] via-[#0F0D14] to-[#09090b] border border-amber-400/45 shadow-[0_0_70px_rgba(245,158,11,0.3)] p-5 text-center space-y-4">
          {!isComplete ? (
            <div className="flex flex-col items-center gap-2.5">
              {/* Animated 60fps Circular Countdown Ring (20s -> 0s) */}
              <div className="relative w-[84px] h-[84px] flex items-center justify-center">
                <svg
                  width={ringSize}
                  height={ringSize}
                  viewBox={`0 0 ${ringSize} ${ringSize}`}
                  className="-rotate-90 absolute inset-0"
                  aria-hidden="true"
                >
                  <defs>
                    <linearGradient id="ad-ring-grad" x1="0%" y1="0%" x2="100%" y2="100%">
                      <stop offset="0%" stopColor="#FEF08A" />
                      <stop offset="50%" stopColor="#FBBF24" />
                      <stop offset="100%" stopColor="#F59E0B" />
                    </linearGradient>
                  </defs>
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="rgba(0,0,0,0.55)"
                    stroke="rgba(255,255,255,0.12)"
                    strokeWidth={strokeWidth}
                  />
                  <circle
                    cx={ringSize / 2}
                    cy={ringSize / 2}
                    r={radius}
                    fill="none"
                    stroke="url(#ad-ring-grad)"
                    strokeWidth={strokeWidth}
                    strokeLinecap="round"
                    strokeDasharray={circumference}
                    strokeDashoffset={dashOffset}
                  />
                </svg>
                <div className="relative flex flex-col items-center">
                  <span className="font-mono-num text-2xl font-black text-amber-300 leading-none">
                    {secondsLeft}s
                  </span>
                  <span className="text-[9px] font-bold uppercase tracking-wider text-zinc-400 mt-0.5">
                    Stay Active
                  </span>
                </div>
              </div>

              {/* Pulsing Anti-Freeze Badge Around Live Ad Container */}
              <div className="w-full rounded-2xl border border-amber-400/50 bg-[#0A0A0F] p-2.5 space-y-2 shadow-[0_0_24px_rgba(251,191,36,0.18)] animate-pulse">
                <div className="inline-flex items-center gap-1.5 px-2.5 py-1 rounded-full bg-amber-400/15 border border-amber-400/40 text-[11px] font-extrabold text-amber-200">
                  <span className="w-2 h-2 rounded-full bg-emerald-400 animate-ping shrink-0" />
                  <span>Ad Playing • Stay 20s for +{doubledCoins} Coins</span>
                </div>
                <div className="rounded-xl overflow-hidden bg-[#09090b] border border-white/10 py-1">
                  <BottomAdBanner />
                </div>
              </div>

              <div className="space-y-1">
                <p className="font-mono-num text-2xl font-black text-amber-300">
                  +{doubledCoins.toLocaleString()} Coins
                </p>
                <p className="text-xs font-medium text-zinc-300 leading-relaxed">
                  {submitting === 'awarding'
                    ? `Finalizing your +${doubledCoins} Coin reward...`
                    : `Sponsored Ad active — wait ${secondsLeft}s to unlock your x2 coin reward.`}
                </p>
                {(() => {
                  const activeSponsorLink = resolveSponsorLink(sponsorUrl);
                  return (
                    <a
                      href={activeSponsorLink}
                      target={activeSponsorLink !== '#' ? '_blank' : undefined}
                      rel={activeSponsorLink !== '#' ? 'noopener noreferrer' : undefined}
                      onClick={(e) => {
                        if (activeSponsorLink === '#') {
                          e.preventDefault();
                        }
                      }}
                      className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-xl border border-amber-400/35 bg-amber-400/10 text-amber-200 text-xs font-semibold hover:bg-amber-400/20 cursor-pointer"
                    >
                      <ExternalLink className="w-3.5 h-3.5" />
                      <span>View Sponsor Page</span>
                    </a>
                  );
                })()}
              </div>
            </div>
          ) : (
            <div className="space-y-3">
              <GoldCoinStackIllustration />
              <div className="inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-full bg-emerald-500/20 border border-emerald-400/70 text-emerald-300 text-xs font-extrabold">
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
                <span>Ad Complete! +{doubledCoins.toLocaleString()} Coins Earned</span>
              </div>
              <p className="text-xs text-zinc-300">
                Your coins have been added and your movie is ready right where you left off.
              </p>
            </div>
          )}

          {isComplete ? (
            <button
              type="button"
              onClick={handleContinueMovie}
              className="w-full min-h-[50px] px-4 rounded-2xl bg-gradient-to-r from-emerald-400 via-green-400 to-emerald-500 text-zinc-950 font-extrabold text-sm shadow-[0_0_28px_rgba(16,185,129,0.5)] hover:brightness-105 active:scale-[0.98] transition-all flex items-center justify-center gap-2 cursor-pointer"
            >
              <Play className="w-4 h-4 fill-current" />
              <span>Continue Movie ▶</span>
            </button>
          ) : (
            <div className="space-y-2">
              <button
                type="button"
                disabled
                className="w-full min-h-[48px] px-4 rounded-2xl bg-white/[0.06] border border-white/10 text-zinc-400 font-bold text-xs flex items-center justify-center gap-2 cursor-not-allowed"
              >
                <Lock className="w-3.5 h-3.5" />
                <span>Reward unlocks in {secondsLeft}s...</span>
              </button>
              <button
                type="button"
                onClick={handleExitAdEarly}
                className="w-full py-1.5 text-[11px] font-medium text-zinc-400 hover:text-zinc-200 underline underline-offset-4 transition-colors cursor-pointer"
              >
                Exit Ad (No Coins)
              </button>
            </div>
          )}
        </div>

        <div className="h-2 shrink-0" aria-hidden="true" />
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
            onClick={handleDoubleClick}
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
