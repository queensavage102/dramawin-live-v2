import React, { useCallback, useEffect, useMemo, useRef, useState } from 'react';
import {
  ClipboardList,
  Clock,
  ExternalLink,
  Film,
  Flame,
  Gamepad2,
  Globe,
  Loader2,
  Lock,
  ShoppingBag,
  Sparkles,
  Trophy,
  X,
  Zap,
} from 'lucide-react';
import { MONETAG_LINK } from '../constants';
import {
  BOOST_DAILY_GAME_COIN_CAP,
  BOOST_FREE_GAME_PLAYS_PER_DAY,
  BoostTrackerState,
  getOrCreatePlayerTrackingId,
} from '../utils/localState';
import { useSponsorVisibilityTimers } from '../utils/useSponsorVisibilityTimer';
import {
  InlineDramaTriviaGame,
  InlineGoldMemoryMatch,
} from './BoostMiniGames';
import { BottomAdBanner } from './BottomAdBanner';
import { RealisticGoldCoin } from './RealisticGoldCoin';

const VERIFICATION_DURATION_MS = 20_000;
const SPEED_BOOST_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const DAILY_MEGA_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MARATHON_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours

type SponsorTimerKey = 'speed' | 'mega' | 'unlockPlay' | 'marathon';
type MiniGameTab = 'trivia' | 'memory';
type BoostSubTab = 'ads' | 'offers' | 'games';

interface BoostTabProps {
  trackingId?: string;
  coins: number;
  weeklyCoins: number;
  qualificationThreshold: number;
  todayKey: string;
  boostState: BoostTrackerState;
  isSponsorOfferActive?: boolean;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: {
      claimLabel?: string;
      readyHeadline?: string;
      onCancel?: () => void;
    }
  ) => void;
  onClaimAdBoost: (kind: 'speed' | 'mega', rewardCoins: number, title: string) => Promise<void>;
  onAdvanceMarathonAd: () => void;
  onClaimMarathonReward: () => Promise<void>;
  onConsumeGamePlay: () => boolean;
  onUnlockSponsorGamePlay: () => void;
  onClaimMiniGameWin: (game: 'trivia' | 'memory', baseCoins: number) => Promise<number>;
}

function formatCompactDuration(ms: number): string {
  const totalSeconds = Math.max(0, Math.ceil(ms / 1000));
  const hours = Math.floor(totalSeconds / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;

  if (hours > 0) {
    return `${hours}h ${String(minutes).padStart(2, '0')}m`;
  }
  if (minutes > 0) {
    return `${minutes}m ${String(seconds).padStart(2, '0')}s`;
  }
  return `${seconds}s`;
}

export const BoostTab: React.FC<BoostTabProps> = ({
  trackingId,
  coins,
  weeklyCoins,
  qualificationThreshold,
  todayKey,
  boostState,
  isSponsorOfferActive = false,
  onStartSponsorReward,
  onClaimAdBoost,
  onAdvanceMarathonAd,
  onClaimMarathonReward,
  onConsumeGamePlay,
  onUnlockSponsorGamePlay,
  onClaimMiniGameWin,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [claimingMarathon, setClaimingMarathon] = useState(false);
  const [selectedGameTab, setSelectedGameTab] = useState<MiniGameTab>('trivia');
  const [activeSubTab, setActiveSubTab] = useState<BoostSubTab>('ads');
  const [activeBoostTask, setActiveBoostTask] = useState<'marathon' | 'speed' | 'mega' | null>(null);
  const [timewallOpen, setTimewallOpen] = useState(false);
  const fallbackTrackingId = useMemo(() => getOrCreatePlayerTrackingId(), []);
  const resolvedTrackingId = trackingId && trackingId.trim() ? trackingId.trim() : fallbackTrackingId;
  const encodedTrackingId = encodeURIComponent(resolvedTrackingId);
  const timewallUrl = `https://timewall.io/?uid=${encodedTrackingId}`;

  useEffect(() => {
    if (!timewallOpen) return;
    const handleKeyDown = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setTimewallOpen(false);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, [timewallOpen]);

  useEffect(() => {
    if (!isSponsorOfferActive) {
      setActiveBoostTask(null);
    }
  }, [isSponsorOfferActive]);

  const latestClaimAdBoostRef = useRef(onClaimAdBoost);
  const latestUnlockGamePlayRef = useRef(onUnlockSponsorGamePlay);
  const latestAdvanceMarathonRef = useRef(onAdvanceMarathonAd);

  useEffect(() => {
    latestClaimAdBoostRef.current = onClaimAdBoost;
  }, [onClaimAdBoost]);

  useEffect(() => {
    latestUnlockGamePlayRef.current = onUnlockSponsorGamePlay;
  }, [onUnlockSponsorGamePlay]);

  useEffect(() => {
    latestAdvanceMarathonRef.current = onAdvanceMarathonAd;
  }, [onAdvanceMarathonAd]);

  const finishSponsorTimer = useCallback(async (kind: SponsorTimerKey) => {
    if (kind === 'speed') {
      await latestClaimAdBoostRef.current(
        'speed',
        300,
        '⚡ 2x Watch Speed Boost (+300 Coins)'
      );
    } else if (kind === 'mega') {
      await latestClaimAdBoostRef.current(
        'mega',
        500,
        '🔥 Daily Mega Boost (+500 Coins)'
      );
    } else if (kind === 'marathon') {
      latestAdvanceMarathonRef.current();
    } else {
      latestUnlockGamePlayRef.current();
    }
    setNowMs(Date.now());
  }, []);

  const {
    timers: sponsorTimers,
    startTimer: startSponsorVerification,
    cancelTimer: cancelSponsorVerification,
  } = useSponsorVisibilityTimers<SponsorTimerKey>(finishSponsorTimer);

  const speedEndsAt =
    boostState.speedBoostLastClaimAt > 0
      ? boostState.speedBoostLastClaimAt + SPEED_BOOST_COOLDOWN_MS
      : 0;
  const megaEndsAt =
    boostState.dailyMegaLastClaimAt > 0
      ? boostState.dailyMegaLastClaimAt + DAILY_MEGA_COOLDOWN_MS
      : 0;
  const marathonCooldownEndsAt =
    boostState.marathonLastClaimAt > 0
      ? boostState.marathonLastClaimAt + MARATHON_COOLDOWN_MS
      : 0;

  const hasActiveCooldown =
    speedEndsAt > nowMs ||
    megaEndsAt > nowMs ||
    marathonCooldownEndsAt > nowMs;

  useEffect(() => {
    if (!hasActiveCooldown) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasActiveCooldown]);

  const dailyGameCoins =
    boostState.dailyGameDate === todayKey ? boostState.dailyGameCoins : 0;
  const dailyCapReached = dailyGameCoins >= BOOST_DAILY_GAME_COIN_CAP;

  const totalPlaysGranted =
    BOOST_FREE_GAME_PLAYS_PER_DAY +
    (boostState.dailyGameDate === todayKey ? boostState.dailyGameExtraPlaysUnlocked : 0);
  const playsUsedToday =
    boostState.dailyGameDate === todayKey ? boostState.dailyGamePlaysUsed : 0;
  const playsRemaining = Math.max(0, totalPlaysGranted - playsUsedToday);
  const isDoubleNext =
    boostState.dailyGameDate === todayKey && boostState.dailyGameDoubleBonusNext;

  const speedCooldownRemainingMs = Math.max(0, speedEndsAt - nowMs);
  const megaCooldownRemainingMs = Math.max(0, megaEndsAt - nowMs);
  const marathonCooldownRemainingMs = Math.max(0, marathonCooldownEndsAt - nowMs);

  const speedTimer = sponsorTimers.speed;
  const megaTimer = sponsorTimers.mega;
  const marathonTimer = sponsorTimers.marathon;
  const unlockPlayTimer = sponsorTimers.unlockPlay;

  const isAnyBoostVerifying =
    activeBoostTask !== null ||
    Boolean(isSponsorOfferActive) ||
    Boolean(speedTimer || megaTimer || marathonTimer);

  const marathonAdsWatched = Math.min(5, Math.max(0, boostState.marathonAdsWatched || 0));
  const handleClaimMarathon = async () => {
    if (claimingMarathon || isAnyBoostVerifying || marathonAdsWatched < 5 || marathonCooldownRemainingMs > 0) return;
    setClaimingMarathon(true);
    try {
      await onClaimMarathonReward();
    } finally {
      setClaimingMarathon(false);
    }
  };

  const handleStartMarathonStep = () => {
    if (isAnyBoostVerifying || marathonAdsWatched >= 5 || marathonCooldownRemainingMs > 0) return;
    if (onStartSponsorReward) {
      setActiveBoostTask('marathon');
      const nextStep = marathonAdsWatched + 1;
      onStartSponsorReward(
        async () => {
          latestAdvanceMarathonRef.current();
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: `Verify Ad (${nextStep}/5)`,
          readyHeadline: `5-Ad Marathon • Ad ${nextStep}/5 Verified!`,
          onCancel: () => setActiveBoostTask(null),
        }
      );
      return;
    }
    startSponsorVerification('marathon', VERIFICATION_DURATION_MS);
  };

  const handleStartSpeedBoost = () => {
    if (isAnyBoostVerifying || speedCooldownRemainingMs > 0) return;
    if (onStartSponsorReward) {
      setActiveBoostTask('speed');
      onStartSponsorReward(
        async () => {
          await latestClaimAdBoostRef.current(
            'speed',
            300,
            '⚡ 2x Watch Speed Boost (+300 Coins)'
          );
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: 'Claim +300',
          readyHeadline: '2x Watch Speed Boost • +300 Coins Unlocked',
          onCancel: () => setActiveBoostTask(null),
        }
      );
      return;
    }
    startSponsorVerification('speed', VERIFICATION_DURATION_MS);
  };

  const handleStartMegaBoost = () => {
    if (isAnyBoostVerifying || megaCooldownRemainingMs > 0) return;
    if (onStartSponsorReward) {
      setActiveBoostTask('mega');
      onStartSponsorReward(
        async () => {
          await latestClaimAdBoostRef.current(
            'mega',
            500,
            '🔥 Daily Mega Boost (+500 Coins)'
          );
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: 'Claim +500',
          readyHeadline: 'Daily Mega Boost • +500 Coins Unlocked',
          onCancel: () => setActiveBoostTask(null),
        }
      );
      return;
    }
    startSponsorVerification('mega', VERIFICATION_DURATION_MS);
  };

  const safeTarget = Math.max(500000, qualificationThreshold || 500000);
  const weeklyPct = Math.min(100, Math.max(0, (weeklyCoins / safeTarget) * 100));
  const dailyGamePct = Math.min(
    100,
    Math.max(0, (dailyGameCoins / BOOST_DAILY_GAME_COIN_CAP) * 100)
  );

  const triviaRewardDisplay = isDoubleNext ? 200 : 100;
  const memoryRewardDisplay = isDoubleNext ? 300 : 150;

  return (
    <div className="space-y-4 pb-20">
      {/* 1. Compact Header + Coin Balance */}
      <section className="obsidian-card rounded-2xl px-4 py-3.5 border border-[#D4AF37]/40 bg-gradient-to-r from-[#161209] via-[#100F14] to-[#0A0A0E] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-xl sm:text-2xl font-display font-bold text-[#F6F2E9] tracking-tight leading-tight">
            Coin Boosters
          </h1>
          <p className="text-[11px] sm:text-xs text-[#A69F91] truncate">
            Quick tasks, paid surveys &amp; daily mini-games
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-[#09090D] border border-[#D4AF37]/40 px-3 py-2 flex items-center gap-2">
          <RealisticGoldCoin sizePx={28} emblem="$" />
          <div className="text-right font-mono-num leading-tight">
            <div className="text-sm sm:text-base font-extrabold gold-gradient-text whitespace-nowrap">
              {coins.toLocaleString()} Coins
            </div>
            <div className="text-[10px] text-[#8D867A] flex items-center justify-end gap-1 whitespace-nowrap">
              <Trophy className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>{weeklyPct.toFixed(1)}% Weekly</span>
            </div>
          </div>
        </div>
      </section>

      {/* 3-Pill Segmented Sub-Tab Bar */}
      <div
        role="tablist"
        aria-label="Boost categories"
        className="flex items-center gap-1 p-1 rounded-full bg-[#0D0B12] border border-[#D4AF37]/30 shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'ads'}
          onClick={() => setActiveSubTab('ads')}
          className={`flex-auto min-h-[44px] px-2 sm:px-3.5 py-2 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'ads'
              ? 'gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
          }`}
        >
          <span>⚡ Ad Tasks</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'offers'}
          onClick={() => setActiveSubTab('offers')}
          className={`flex-auto min-h-[44px] px-2 sm:px-3.5 py-2 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'offers'
              ? 'gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
          }`}
        >
          <span>🎁 Offers &amp; Surveys</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'games'}
          onClick={() => setActiveSubTab('games')}
          className={`flex-auto min-h-[44px] px-2 sm:px-3.5 py-2 rounded-full text-[11px] sm:text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'games'
              ? 'gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
          }`}
        >
          <span>🎮 Mini-Games</span>
        </button>
      </div>

      {/* Sub-Tab 1: Ad Tasks */}
      {activeSubTab === 'ads' && (
      <section role="tabpanel" aria-labelledby="active-tasks-heading" className="space-y-2">
        <div className="flex items-center justify-between px-0.5">
          <h2
            id="active-tasks-heading"
            className="text-sm sm:text-base font-display font-bold text-[#F6F2E9]"
          >
            Active Boost Tasks
          </h2>
          <span className="text-[11px] text-[#8D867A]">20s sponsor check</span>
        </div>

        <div className="obsidian-card rounded-2xl border border-[#D4AF37]/35 p-2 space-y-2 bg-[#0B090F]">
          {/* Highlighted Gold-Bordered Task: 🎬 5-Ad Marathon Streak (+2,000 Coins) */}
          <div className="rounded-xl border-2 border-[#FBBF24]/80 bg-gradient-to-r from-[#241B08] via-[#171208] to-[#1D1508] px-3 py-2.5 shadow-[0_0_20px_rgba(251,191,36,0.22)] space-y-2">
            <div className="flex items-center justify-between gap-2.5 flex-wrap">
              <div className="w-9 h-9 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.45)]">
                <Film className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-[180px]">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs sm:text-sm font-extrabold text-[#FCE7A2]">
                    🎬 5-Ad Marathon Streak
                  </span>
                  <span className="font-mono-num text-[11px] font-extrabold text-[#181307] gold-gradient-bg px-2 py-0.5 rounded-full whitespace-nowrap shadow-sm">
                    +2,000 Coins
                  </span>
                </div>
                <div className="flex items-center gap-2 text-[11px] text-[#C4BDB0] font-mono-num mt-0.5">
                  <span className="font-bold text-[#FCE7A2]">
                    {marathonCooldownRemainingMs > 0 ? '5 / 5 Ads' : `${marathonAdsWatched} / 5 Ads`}
                  </span>
                  <span className="text-[#8D867A]">
                    {marathonCooldownRemainingMs > 0
                      ? '· Resets every 24h'
                      : marathonAdsWatched >= 5
                        ? '· Streak Complete!'
                        : '· 20s sponsor check each'}
                  </span>
                </div>
              </div>

              {marathonCooldownRemainingMs > 0 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[38px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] shadow-[0_0_12px_rgba(245,158,11,0.22)] text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-not-allowed font-mono-num"
                >
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{formatCompactDuration(marathonCooldownRemainingMs)}</span>
                </button>
              ) : activeBoostTask === 'marathon' ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-wait font-mono-num shadow-[0_0_14px_rgba(251,191,36,0.28)]"
                >
                  <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                  <span>Verifying 20s...</span>
                </button>
              ) : marathonTimer ? (
                <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                  <button
                    type="button"
                    disabled
                    className="relative overflow-hidden min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-wait font-mono-num shadow-[0_0_14px_rgba(251,191,36,0.28)]"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                      style={{ width: `${marathonTimer.progressPct}%` }}
                    />
                    <span className="relative z-10 inline-flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                      <span>
                        {marathonTimer.isCompleting
                          ? 'Saving...'
                          : `Verifying... ${marathonTimer.secondsLeft}s`}
                      </span>
                    </span>
                  </button>
                  {!marathonTimer.isCompleting && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelSponsorVerification('marathon');
                      }}
                      aria-label="Cancel marathon verification timer"
                      title="Cancel timer"
                      className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/60 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                    >
                      <X className="w-3.5 h-3.5" />
                    </button>
                  )}
                </div>
              ) : marathonAdsWatched >= 5 ? (
                <button
                  type="button"
                  disabled={claimingMarathon || isAnyBoostVerifying}
                  onClick={() => void handleClaimMarathon()}
                  className="min-h-[38px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-[0_0_18px_rgba(251,191,36,0.55)] border border-[#FFF3B0] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer disabled:opacity-60 disabled:cursor-not-allowed"
                >
                  <Sparkles className="w-3.5 h-3.5" />
                  <span>{claimingMarathon ? 'Claiming...' : 'Claim +2,000 Coins'}</span>
                </button>
              ) : isAnyBoostVerifying ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[38px] px-3.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3 h-3" />
                  <span>Locked</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMarathonStep}
                  className="min-h-[38px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 shadow-[0_0_16px_rgba(251,191,36,0.45)] border border-[#FFF3B0] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer"
                >
                  <span>Watch Ad ({marathonAdsWatched + 1}/5)</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 5-Segment Streak Progress Bar */}
            <div
              role="progressbar"
              aria-valuenow={marathonCooldownRemainingMs > 0 ? 5 : marathonAdsWatched}
              aria-valuemin={0}
              aria-valuemax={5}
              aria-label="5-Ad Marathon Streak progress"
              className="grid grid-cols-5 gap-1.5"
            >
              {[0, 1, 2, 3, 4].map((stepIdx) => {
                const filled = marathonCooldownRemainingMs > 0 || stepIdx < marathonAdsWatched;
                return (
                  <div
                    key={stepIdx}
                    className={`h-1.5 rounded-full transition-all duration-300 ${
                      filled
                        ? 'gold-gradient-bg shadow-[0_0_8px_rgba(251,191,36,0.55)]'
                        : 'bg-white/[0.1]'
                    }`}
                  />
                );
              })}
            </div>
          </div>

          {/* Row 1: 2x Watch Speed Boost (Vibrant Amber/Gold Card) */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-[#241A07] via-[#191308] to-[#1D1508] px-3 py-2.5 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap shadow-[0_0_18px_rgba(245,158,11,0.16)]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-amber-400/30 to-amber-600/20 border border-amber-400/60 flex items-center justify-center text-[#FEF08A] shrink-0 shadow-[0_0_12px_rgba(245,158,11,0.28)]">
              <Zap className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-[175px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[#FFF7E0]">
                  ⚡ 2x Watch Speed Boost
                </span>
                <span className="font-mono-num text-[11px] font-extrabold text-[#181307] gold-gradient-bg px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                  +300 Coins
                </span>
              </div>
              <p className="text-[11px] text-[#C9BA9B]">
                Sponsor visit (20s) · Every 1 hour
              </p>
            </div>

            {activeBoostTask === 'speed' ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-wait font-mono-num shadow-[0_0_14px_rgba(245,158,11,0.25)] ml-auto"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                <span>Verifying 20s...</span>
              </button>
            ) : speedTimer ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  type="button"
                  disabled
                  className="relative overflow-hidden min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-wait font-mono-num shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                    style={{ width: `${speedTimer.progressPct}%` }}
                  />
                  <span className="relative z-10 inline-flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                    <span>
                      {speedTimer.isCompleting ? 'Saving...' : `Verifying... ${speedTimer.secondsLeft}s`}
                    </span>
                  </span>
                </button>
                {!speedTimer.isCompleting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelSponsorVerification('speed');
                    }}
                    aria-label="Cancel 2x Watch Speed Boost verification"
                    title="Cancel timer"
                    className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/60 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : speedCooldownRemainingMs > 0 ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] shadow-[0_0_12px_rgba(245,158,11,0.22)] text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-not-allowed font-mono-num ml-auto"
              >
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{formatCompactDuration(speedCooldownRemainingMs)}</span>
              </button>
            ) : isAnyBoostVerifying ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-not-allowed opacity-70 ml-auto"
              >
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartSpeedBoost}
                className="min-h-[38px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer ml-auto"
              >
                <span>Go</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>

          {/* Row 2: Daily Mega Boost (Vibrant Amber/Gold Card) */}
          <div className="rounded-xl border border-amber-500/40 bg-gradient-to-r from-[#241A07] via-[#191308] to-[#1D1508] px-3 py-2.5 flex items-center justify-between gap-2.5 flex-wrap sm:flex-nowrap shadow-[0_0_18px_rgba(245,158,11,0.16)]">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0 shadow-[0_0_12px_rgba(251,191,36,0.4)]">
              <Flame className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-[175px]">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-bold text-[#FFF7E0]">
                  🔥 Daily Mega Boost
                </span>
                <span className="font-mono-num text-[11px] font-extrabold text-[#181307] gold-gradient-bg px-2.5 py-0.5 rounded-full whitespace-nowrap shadow-[0_0_10px_rgba(251,191,36,0.35)]">
                  +500 Coins
                </span>
              </div>
              <p className="text-[11px] text-[#C9BA9B]">
                Quick sponsor check · Once every 24h
              </p>
            </div>

            {activeBoostTask === 'mega' ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-wait font-mono-num shadow-[0_0_14px_rgba(245,158,11,0.25)] ml-auto"
              >
                <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                <span>Verifying 20s...</span>
              </button>
            ) : megaTimer ? (
              <div className="flex items-center gap-1.5 shrink-0 ml-auto">
                <button
                  type="button"
                  disabled
                  className="relative overflow-hidden min-h-[38px] px-3.5 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap cursor-wait font-mono-num shadow-[0_0_14px_rgba(245,158,11,0.25)]"
                >
                  <span
                    aria-hidden="true"
                    className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                    style={{ width: `${megaTimer.progressPct}%` }}
                  />
                  <span className="relative z-10 inline-flex items-center gap-1.5 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                    <Loader2 className="w-3.5 h-3.5 animate-spin text-[#FFF3B0]" />
                    <span>
                      {megaTimer.isCompleting ? 'Saving...' : `Verifying... ${megaTimer.secondsLeft}s`}
                    </span>
                  </span>
                </button>
                {!megaTimer.isCompleting && (
                  <button
                    type="button"
                    onClick={(e) => {
                      e.preventDefault();
                      e.stopPropagation();
                      cancelSponsorVerification('mega');
                    }}
                    aria-label="Cancel Daily Mega Boost verification"
                    title="Cancel timer"
                    className="w-8 h-8 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 hover:border-rose-400/60 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer transition-colors"
                  >
                    <X className="w-3.5 h-3.5" />
                  </button>
                )}
              </div>
            ) : megaCooldownRemainingMs > 0 ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] shadow-[0_0_12px_rgba(245,158,11,0.22)] text-[11px] font-bold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 cursor-not-allowed font-mono-num ml-auto"
              >
                <Clock className="w-3 h-3 text-amber-300" />
                <span>{formatCompactDuration(megaCooldownRemainingMs)}</span>
              </button>
            ) : isAnyBoostVerifying ? (
              <button
                type="button"
                disabled
                className="min-h-[38px] px-3.5 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 cursor-not-allowed opacity-70 ml-auto"
              >
                <Lock className="w-3 h-3" />
                <span>Locked</span>
              </button>
            ) : (
              <button
                type="button"
                onClick={handleStartMegaBoost}
                className="min-h-[38px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 active:scale-[0.97] transition-all cursor-pointer ml-auto"
              >
                <span>Go</span>
                <ExternalLink className="w-3 h-3" />
              </button>
            )}
          </div>
        </div>
      </section>
      )}

      {/* Sub-Tab 2: Offers & Surveys */}
      {activeSubTab === 'offers' && (
      <section role="tabpanel" aria-label="Offers and Surveys" className="space-y-3">
        {/* Quick Tasks & Paid Surveys — TimeWall */}
        <button
          type="button"
          onClick={() => setTimewallOpen(true)}
          className="w-full text-left p-[1.5px] rounded-xl bg-gradient-to-r from-emerald-400 via-[#D4AF37] to-emerald-500 shadow-[0_0_20px_rgba(16,185,129,0.25)] hover:brightness-105 active:scale-[0.99] transition-all cursor-pointer"
        >
          <div className="rounded-[10.5px] px-3 py-2.5 flex items-center justify-between gap-2 bg-gradient-to-r from-[#0B241B] via-[#101C1B] to-[#17140A]">
            <div className="w-9 h-9 rounded-xl bg-gradient-to-br from-emerald-500/30 to-amber-500/25 border border-emerald-400/50 flex items-center justify-center text-emerald-300 shrink-0 shadow-[0_0_12px_rgba(16,185,129,0.35)]">
              <ClipboardList className="w-4 h-4" />
            </div>

            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-1.5 flex-wrap">
                <span className="text-xs sm:text-sm font-extrabold text-white leading-tight">
                  Quick Tasks &amp; Paid Surveys
                </span>
              </div>
              <p className="text-[11px] text-emerald-200/80 font-medium">
                TimeWall · Tap to open tasks
              </p>
            </div>

            <span className="px-3 py-1.5 rounded-full bg-gradient-to-r from-emerald-400 to-green-500 border border-emerald-200/70 text-zinc-950 text-xs font-extrabold inline-flex items-center justify-center gap-1 whitespace-nowrap shrink-0 shadow-[0_0_14px_rgba(16,185,129,0.45)]">
              <span>Earn Coins</span>
              <ExternalLink className="w-3 h-3" />
            </span>
          </div>
        </button>

        {/* Featured Partner Offers (OfferForge) */}
        <div className="rounded-2xl border border-[#D4AF37]/30 bg-[#121015] p-3 space-y-2.5">
          <div className="flex items-center justify-between gap-2 px-0.5">
            <div className="flex items-center gap-1.5">
              <Sparkles className="w-3.5 h-3.5 text-[#D4AF37]" />
              <h3 className="text-xs sm:text-sm font-display font-bold text-[#F6F2E9]">
                Featured Partner Offers
              </h3>
            </div>
            <span className="text-[10px] uppercase tracking-wider text-zinc-400 font-semibold">
              Sponsored
            </span>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-3 gap-2.5 items-stretch">
            {/* Card 1: Truworths Store Card */}
            <div className="rounded-xl border border-white/[0.1] bg-[#18151C] p-3 flex flex-col justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center shrink-0">
                    <ShoppingBag className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight truncate">
                    Truworths Store Card
                  </h4>
                </div>
                <p className="text-[11px] text-[#C4BDB0] leading-snug line-clamp-2 min-h-[2.75em]">
                  New cardholders get R1,000 in fashion vouchers when you open a Truworths account online.
                </p>
              </div>

              <a
                href={`https://ofofa.co.za/?E=NhGtJQQVSB8Oyo1LSgUc8r%2fbzfuyE53&s1=${encodedTrackingId}`}
                target="_blank"
                rel="noreferrer noopener"
                referrerPolicy="no-referrer"
                className="w-full min-h-[34px] px-3 rounded-xl gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Apply Online</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            {/* Card 2: FASTA - Instant Online Cash */}
            <div className="rounded-xl border border-white/[0.1] bg-[#18151C] p-3 flex flex-col justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center shrink-0">
                    <Zap className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight truncate">
                    FASTA - Instant Online Cash
                  </h4>
                </div>
                <p className="text-[11px] text-[#C4BDB0] leading-snug line-clamp-2 min-h-[2.75em]">
                  Apply online in minutes for fast, flexible short-term cash up to R8,000 in South Africa.
                </p>
              </div>

              <a
                href={`https://offerforge.co/?E=NhGtJQQVsB9zn8HZsgiBhMr%2fbzfuyE55&s1=${encodedTrackingId}`}
                target="_blank"
                rel="noreferrer noopener"
                referrerPolicy="no-referrer"
                className="w-full min-h-[34px] px-3 rounded-xl gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Apply Now</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>

            {/* Card 3: HostAfrica AI Website Builder */}
            <div className="rounded-xl border border-white/[0.1] bg-[#18151C] p-3 flex flex-col justify-between gap-2">
              <div className="space-y-1.5 min-w-0">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="w-8 h-8 rounded-lg bg-[#D4AF37]/15 border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center shrink-0">
                    <Globe className="w-4 h-4" />
                  </div>
                  <h4 className="text-xs font-bold text-white leading-tight truncate">
                    HostAfrica AI Website Builder
                  </h4>
                </div>
                <p className="text-[11px] text-[#C4BDB0] leading-snug line-clamp-2 min-h-[2.75em]">
                  Build a custom business website in 1 minute with AI.
                </p>
              </div>

              <a
                href={`https://of0101.com/?E=8B1dlgfYqJEnyzbLCycpP8r%2fbzfuyE55&s1=${encodedTrackingId}`}
                target="_blank"
                rel="noreferrer noopener"
                referrerPolicy="no-referrer"
                className="w-full min-h-[34px] px-3 rounded-xl gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1.5 shadow-[0_0_12px_rgba(251,191,36,0.3)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
              >
                <span>Try AI Builder</span>
                <ExternalLink className="w-3.5 h-3.5 shrink-0" />
              </a>
            </div>
          </div>
        </div>
      </section>
      )}

      {/* Sub-Tab 3: Mini-Games */}
      {activeSubTab === 'games' && (
      <section role="tabpanel" aria-labelledby="minigames-heading" className="obsidian-card rounded-2xl p-3.5 sm:p-4 border border-[#D4AF37]/40 space-y-3.5">
        {/* Daily Game Coins Progress Tracker */}
        <div className="space-y-2">
          <div className="flex items-center justify-between gap-2">
            <div className="flex items-center gap-2 min-w-0">
              <Gamepad2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
              <h2
                id="minigames-heading"
                className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] truncate"
              >
                Daily Mini-Games
              </h2>
            </div>

            <div className="text-right font-mono-num text-xs shrink-0">
              <span className="font-extrabold text-[#FCE7A2]">
                Daily Game Coins: {dailyGameCoins.toLocaleString()} / {BOOST_DAILY_GAME_COIN_CAP.toLocaleString()}
              </span>
            </div>
          </div>

          <div
            role="progressbar"
            aria-valuenow={dailyGameCoins}
            aria-valuemin={0}
            aria-valuemax={BOOST_DAILY_GAME_COIN_CAP}
            aria-label="Daily game coins progress"
            className="h-2 w-full rounded-full bg-[#09090D] border border-white/[0.08] overflow-hidden"
          >
            <div
              className={`h-full rounded-full transition-all duration-300 ${
                dailyCapReached ? 'bg-emerald-400' : 'gold-gradient-bg'
              }`}
              style={{ width: `${dailyGamePct}%` }}
            />
          </div>

          <div className="flex items-center justify-between gap-2 text-[11px] font-mono-num text-[#A69F91]">
            <span>
              {dailyCapReached
                ? 'Daily 1,000 cap reached · Fun mode unlocked'
                : `Free Plays Left: ${playsRemaining}${isDoubleNext ? ' · 2x Bonus Ready!' : ''}`}
            </span>

            {!dailyCapReached && playsRemaining <= 0 && (
              unlockPlayTimer ? (
                <span className="inline-flex items-center gap-1.5 text-[#FCE7A2] font-bold">
                  <span className="relative overflow-hidden px-2.5 py-1 rounded-full bg-[#151109] border border-[#D4AF37]/75 text-[#FFF8E7] text-[10px] font-extrabold font-mono-num">
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                      style={{ width: `${unlockPlayTimer.progressPct}%` }}
                    />
                    <span className="relative z-10 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      {unlockPlayTimer.isCompleting
                        ? 'Unlocking...'
                        : `Verifying... ${unlockPlayTimer.secondsLeft}s`}
                    </span>
                  </span>
                  {!unlockPlayTimer.isCompleting && (
                    <button
                      type="button"
                      onClick={(e) => {
                        e.preventDefault();
                        e.stopPropagation();
                        cancelSponsorVerification('unlockPlay');
                      }}
                      aria-label="Cancel 2x play unlock timer"
                      className="w-5 h-5 rounded-full bg-white/10 hover:bg-rose-500/30 text-zinc-300 hover:text-rose-200 inline-flex items-center justify-center cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </span>
              ) : (
                <a
                  href={MONETAG_LINK}
                  target="_blank"
                  rel="noopener noreferrer"
                  onClick={() => startSponsorVerification('unlockPlay', VERIFICATION_DURATION_MS)}
                  className="text-[#FCE7A2] font-bold underline underline-offset-2 inline-flex items-center gap-1 hover:text-white"
                >
                  <Sparkles className="w-3 h-3" />
                  <span>Unlock 2x Play</span>
                </a>
              )
            )}
          </div>
        </div>

        {/* Sleek 2-Tab Switcher (🎭 Drama Trivia +100 | 🃏 Memory Match +150) */}
        <div
          role="tablist"
          aria-label="Choose playable mini-game"
          className="grid grid-cols-2 gap-1.5 p-1 rounded-xl bg-[#09090D] border border-[#D4AF37]/30"
        >
          <button
            type="button"
            role="tab"
            aria-selected={selectedGameTab === 'trivia'}
            onClick={() => setSelectedGameTab('trivia')}
            className={`min-h-[42px] px-2.5 py-2 rounded-lg text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              selectedGameTab === 'trivia'
                ? 'gold-gradient-bg text-[#181307] shadow-sm shadow-[#D4AF37]/30'
                : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
            }`}
          >
            <span>🎭 Drama Trivia</span>
            <span className="font-mono-num">
              {dailyCapReached ? 'Fun' : `+${triviaRewardDisplay}`}
            </span>
          </button>

          <button
            type="button"
            role="tab"
            aria-selected={selectedGameTab === 'memory'}
            onClick={() => setSelectedGameTab('memory')}
            className={`min-h-[42px] px-2.5 py-2 rounded-lg text-xs font-extrabold inline-flex items-center justify-center gap-1.5 transition-all cursor-pointer whitespace-nowrap ${
              selectedGameTab === 'memory'
                ? 'gold-gradient-bg text-[#181307] shadow-sm shadow-[#D4AF37]/30'
                : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
            }`}
          >
            <span>🃏 Memory Match</span>
            <span className="font-mono-num">
              {dailyCapReached ? 'Fun' : `+${memoryRewardDisplay}`}
            </span>
          </button>
        </div>

        {/* Live Playable Game Board Rendered Immediately On-Screen */}
        <div role="tabpanel" className="pt-0.5">
          {selectedGameTab === 'trivia' ? (
            <InlineDramaTriviaGame
              dailyCapReached={dailyCapReached}
              playsRemaining={playsRemaining}
              rewardAmount={triviaRewardDisplay}
              onConsumePlay={onConsumeGamePlay}
              onWin={(awardBase) => onClaimMiniGameWin('trivia', awardBase)}
            />
          ) : (
            <InlineGoldMemoryMatch
              dailyCapReached={dailyCapReached}
              playsRemaining={playsRemaining}
              rewardAmount={memoryRewardDisplay}
              onConsumePlay={onConsumeGamePlay}
              onWin={(awardBase) => onClaimMiniGameWin('memory', awardBase)}
            />
          )}
        </div>
      </section>
      )}

      {/* 4. Bottom Adsterra 320x50px Banner Slot Cleanly Anchored Above Bottom Navigation Bar */}
      <div
        aria-label="Sponsored banner"
        className="fixed bottom-16 left-0 right-0 z-30 bg-[#09090b]/95 backdrop-blur-md border-t border-white/[0.08] flex items-center justify-center"
      >
        <BottomAdBanner />
      </div>

      {/* TimeWall Quick Tasks & Paid Surveys Modal */}
      {timewallOpen && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="TimeWall Quick Tasks and Paid Surveys"
          className="fixed inset-0 z-[2147483500] bg-black/85 backdrop-blur-md flex items-center justify-center sm:p-4"
          onClick={() => setTimewallOpen(false)}
        >
          <div
            className="w-full h-full sm:max-w-3xl sm:h-[88vh] sm:rounded-2xl bg-[#0D0E12] border border-emerald-400/40 shadow-2xl flex flex-col overflow-hidden"
            onClick={(e) => e.stopPropagation()}
          >
            <header className="shrink-0 px-3.5 sm:px-5 py-2.5 bg-[#101614] border-b border-emerald-400/25 flex items-center justify-between gap-3">
              <div className="flex items-center gap-2.5 min-w-0">
                <div className="w-8 h-8 rounded-lg bg-emerald-500/20 border border-emerald-400/40 text-emerald-300 flex items-center justify-center shrink-0">
                  <ClipboardList className="w-4 h-4" />
                </div>
                <div className="min-w-0">
                  <h3 className="text-xs sm:text-sm font-display font-bold text-white truncate">
                    Quick Tasks &amp; Paid Surveys — TimeWall
                  </h3>
                  <p className="text-[10px] font-mono-num text-emerald-300/80 truncate">
                    User ID: {resolvedTrackingId}
                  </p>
                </div>
              </div>

              <button
                type="button"
                onClick={() => setTimewallOpen(false)}
                aria-label="Close TimeWall modal"
                className="min-h-[38px] px-3.5 rounded-xl bg-white/[0.08] hover:bg-white/[0.15] border border-white/15 text-white text-xs font-bold inline-flex items-center gap-1.5 shrink-0 cursor-pointer transition-colors"
              >
                <X className="w-4 h-4" />
                <span>Close</span>
              </button>
            </header>

            <div className="flex-1 w-full bg-white relative">
              <iframe
                src={timewallUrl}
                title="TimeWall Quick Tasks & Paid Surveys"
                className="w-full h-full border-0"
                allow="clipboard-read; clipboard-write"
              />
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
