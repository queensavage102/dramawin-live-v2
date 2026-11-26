import React, { useCallback, useEffect, useRef, useState } from 'react';
import {
  Check,
  Clock,
  ExternalLink,
  Film,
  Flame,
  Gamepad2,
  Gift,
  Loader2,
  Lock,
  Play,
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
} from '../utils/localState';
import { useSponsorVisibilityTimers } from '../utils/useSponsorVisibilityTimer';
import {
  InlineDramaTriviaGame,
  InlineGoldMemoryMatch,
} from './BoostMiniGames';
import { RealisticGoldCoin } from './RealisticGoldCoin';

const VERIFICATION_DURATION_MS = 20_000;
const SPEED_BOOST_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const DAILY_MEGA_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const MARATHON_COOLDOWN_MS = 24 * 60 * 60 * 1000; // 24 hours
const SPOTLIGHT_COOLDOWN_MS = 60 * 60 * 1000; // 1 hour
const HOURLY_BOX_COOLDOWN_MS = 60 * 60 * 1000; // 60 minutes

const EPISODE_MILESTONE_TIERS: readonly {
  episodes: 1 | 3 | 5 | 10;
  coins: number;
  label: string;
}[] = [
  { episodes: 1, coins: 1000, label: 'Watch 1 Full Episode' },
  { episodes: 3, coins: 3500, label: 'Watch 3 Full Episodes' },
  { episodes: 5, coins: 7500, label: 'Watch 5 Full Episodes' },
  { episodes: 10, coins: 20000, label: 'Watch 10 Full Episodes' },
];

type SpotlightTimerKey = 'spotlight1' | 'spotlight2' | 'spotlight3';

const SPONSOR_SPOTLIGHT_TASKS: readonly {
  slot: 1 | 2 | 3;
  timerKey: SpotlightTimerKey;
  coins: number;
  title: string;
  subtitle: string;
  iconBoxClass: string;
}[] = [
  {
    slot: 1,
    timerKey: 'spotlight1',
    coins: 1500,
    title: 'VIP Sponsor Spotlight',
    subtitle: 'Visit sponsor · 20s verify · Every 1h',
    iconBoxClass:
      'bg-cyan-500/15 border-cyan-400/60 text-cyan-300 shadow-[0_0_14px_rgba(34,211,238,0.28)]',
  },
  {
    slot: 2,
    timerKey: 'spotlight2',
    coins: 1000,
    title: 'Trending Partner Pick',
    subtitle: 'Visit sponsor · 20s verify · Every 1h',
    iconBoxClass:
      'bg-emerald-500/15 border-emerald-400/60 text-emerald-300 shadow-[0_0_14px_rgba(16,185,129,0.28)]',
  },
  {
    slot: 3,
    timerKey: 'spotlight3',
    coins: 500,
    title: 'Quick Sponsor Drop',
    subtitle: 'Visit sponsor · 20s verify · Every 1h',
    iconBoxClass:
      'bg-violet-500/15 border-violet-400/60 text-violet-300 shadow-[0_0_14px_rgba(167,139,250,0.28)]',
  },
];

type SponsorTimerKey =
  | 'speed'
  | 'mega'
  | 'unlockPlay'
  | 'marathon'
  | SpotlightTimerKey;
type ActiveBoostTaskKey = 'marathon' | 'speed' | 'mega' | SpotlightTimerKey;
type MiniGameTab = 'trivia' | 'memory';
type BoostSubTab = 'tasks' | 'games';

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
      initialVisited?: boolean;
      onCancel?: () => void;
    }
  ) => void;
  onClaimAdBoost: (kind: 'speed' | 'mega', rewardCoins: number, title: string) => Promise<void>;
  onAdvanceMarathonAd: () => void;
  onClaimMarathonReward: () => Promise<void>;
  onClaimSpotlightOffer: (slot: 1 | 2 | 3, rewardCoins: number, title: string) => Promise<void>;
  onClaimHourlyMysteryBox: () => Promise<void>;
  onClaimWatchMilestone: (tierEpisodes: 1 | 3 | 5 | 10) => Promise<void>;
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
  onClaimSpotlightOffer,
  onClaimHourlyMysteryBox,
  onClaimWatchMilestone,
  onConsumeGamePlay,
  onUnlockSponsorGamePlay,
  onClaimMiniGameWin,
}) => {
  const [nowMs, setNowMs] = useState<number>(() => Date.now());
  const [claimingMarathon, setClaimingMarathon] = useState(false);
  const [claimingMysteryBox, setClaimingMysteryBox] = useState(false);
  const [claimingMilestone, setClaimingMilestone] = useState<1 | 3 | 5 | 10 | null>(null);
  const [selectedGameTab, setSelectedGameTab] = useState<MiniGameTab>('trivia');
  const [activeSubTab, setActiveSubTab] = useState<BoostSubTab>('tasks');
  const [activeBoostTask, setActiveBoostTask] = useState<ActiveBoostTaskKey | null>(null);

  useEffect(() => {
    if (!isSponsorOfferActive) {
      setActiveBoostTask(null);
    }
  }, [isSponsorOfferActive]);

  const latestClaimAdBoostRef = useRef(onClaimAdBoost);
  const latestUnlockGamePlayRef = useRef(onUnlockSponsorGamePlay);
  const latestAdvanceMarathonRef = useRef(onAdvanceMarathonAd);
  const latestClaimSpotlightRef = useRef(onClaimSpotlightOffer);

  useEffect(() => {
    latestClaimAdBoostRef.current = onClaimAdBoost;
  }, [onClaimAdBoost]);

  useEffect(() => {
    latestUnlockGamePlayRef.current = onUnlockSponsorGamePlay;
  }, [onUnlockSponsorGamePlay]);

  useEffect(() => {
    latestAdvanceMarathonRef.current = onAdvanceMarathonAd;
  }, [onAdvanceMarathonAd]);

  useEffect(() => {
    latestClaimSpotlightRef.current = onClaimSpotlightOffer;
  }, [onClaimSpotlightOffer]);

  const finishSponsorTimer = useCallback(async (kind: SponsorTimerKey) => {
    if (kind === 'speed') {
      await latestClaimAdBoostRef.current(
        'speed',
        1500,
        '⚡ 2x Watch Speed Boost (+1,500 Coins)'
      );
    } else if (kind === 'mega') {
      await latestClaimAdBoostRef.current(
        'mega',
        2500,
        '🔥 Daily Mega Boost (+2,500 Coins)'
      );
    } else if (kind === 'marathon') {
      latestAdvanceMarathonRef.current();
    } else if (kind === 'spotlight1' || kind === 'spotlight2' || kind === 'spotlight3') {
      const card = SPONSOR_SPOTLIGHT_TASKS.find((item) => item.timerKey === kind);
      if (card) {
        await latestClaimSpotlightRef.current(
          card.slot,
          card.coins,
          `✨ ${card.title} (+${card.coins.toLocaleString()} Coins)`
        );
      }
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
  const spotlight1EndsAt =
    boostState.spotlight1LastClaimAt > 0
      ? boostState.spotlight1LastClaimAt + SPOTLIGHT_COOLDOWN_MS
      : 0;
  const spotlight2EndsAt =
    boostState.spotlight2LastClaimAt > 0
      ? boostState.spotlight2LastClaimAt + SPOTLIGHT_COOLDOWN_MS
      : 0;
  const spotlight3EndsAt =
    boostState.spotlight3LastClaimAt > 0
      ? boostState.spotlight3LastClaimAt + SPOTLIGHT_COOLDOWN_MS
      : 0;
  const hourlyBoxEndsAt =
    boostState.hourlyMysteryBoxLastClaimAt > 0
      ? boostState.hourlyMysteryBoxLastClaimAt + HOURLY_BOX_COOLDOWN_MS
      : 0;

  const hasActiveCooldown =
    speedEndsAt > nowMs ||
    megaEndsAt > nowMs ||
    marathonCooldownEndsAt > nowMs ||
    spotlight1EndsAt > nowMs ||
    spotlight2EndsAt > nowMs ||
    spotlight3EndsAt > nowMs ||
    hourlyBoxEndsAt > nowMs;

  useEffect(() => {
    if (!hasActiveCooldown) return;
    const id = window.setInterval(() => setNowMs(Date.now()), 1000);
    return () => window.clearInterval(id);
  }, [hasActiveCooldown]);

  const completedEpisodeIdsToday =
    boostState.episodesWatchDate === todayKey && Array.isArray(boostState.completedEpisodeIdsToday)
      ? boostState.completedEpisodeIdsToday
      : [];
  const completedEpisodesCount = completedEpisodeIdsToday.length;
  const milestoneClaimMap: Record<1 | 3 | 5 | 10, boolean> = {
    1: boostState.episodesWatchDate === todayKey && Boolean(boostState.milestone1EpClaimed),
    3: boostState.episodesWatchDate === todayKey && Boolean(boostState.milestone3EpClaimed),
    5: boostState.episodesWatchDate === todayKey && Boolean(boostState.milestone5EpClaimed),
    10: boostState.episodesWatchDate === todayKey && Boolean(boostState.milestone10EpClaimed),
  };

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
  const hourlyBoxCooldownRemainingMs = Math.max(0, hourlyBoxEndsAt - nowMs);
  const spotlightCooldownMap: Record<1 | 2 | 3, number> = {
    1: Math.max(0, spotlight1EndsAt - nowMs),
    2: Math.max(0, spotlight2EndsAt - nowMs),
    3: Math.max(0, spotlight3EndsAt - nowMs),
  };

  const speedTimer = sponsorTimers.speed;
  const megaTimer = sponsorTimers.mega;
  const marathonTimer = sponsorTimers.marathon;
  const unlockPlayTimer = sponsorTimers.unlockPlay;

  const isAnyBoostVerifying =
    activeBoostTask !== null ||
    Boolean(isSponsorOfferActive) ||
    Boolean(
      speedTimer ||
        megaTimer ||
        marathonTimer ||
        sponsorTimers.spotlight1 ||
        sponsorTimers.spotlight2 ||
        sponsorTimers.spotlight3
    );

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

  const handleClaimHourlyBox = async () => {
    if (claimingMysteryBox || hourlyBoxCooldownRemainingMs > 0) return;
    setClaimingMysteryBox(true);
    try {
      await onClaimHourlyMysteryBox();
      setNowMs(Date.now());
    } finally {
      setClaimingMysteryBox(false);
    }
  };

  const handleClaimMilestone = async (tierEpisodes: 1 | 3 | 5 | 10) => {
    if (claimingMilestone !== null) return;
    setClaimingMilestone(tierEpisodes);
    try {
      await onClaimWatchMilestone(tierEpisodes);
    } finally {
      setClaimingMilestone(null);
    }
  };

  const handleStartSpotlight = (card: (typeof SPONSOR_SPOTLIGHT_TASKS)[number]) => {
    const cooldownRemainingMs = spotlightCooldownMap[card.slot];
    if (isAnyBoostVerifying || cooldownRemainingMs > 0) return;
    if (onStartSponsorReward) {
      setActiveBoostTask(card.timerKey);
      onStartSponsorReward(
        async () => {
          await latestClaimSpotlightRef.current(
            card.slot,
            card.coins,
            `✨ ${card.title} (+${card.coins.toLocaleString()} Coins)`
          );
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: `Claim +${card.coins.toLocaleString()}`,
          readyHeadline: `${card.title} • +${card.coins.toLocaleString()} Coins Unlocked`,
          initialVisited: false,
          onCancel: () => setActiveBoostTask(null),
        }
      );
      return;
    }
    startSponsorVerification(card.timerKey, VERIFICATION_DURATION_MS);
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
          initialVisited: false,
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
            1500,
            '⚡ 2x Watch Speed Boost (+1,500 Coins)'
          );
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: 'Claim +1,500',
          readyHeadline: '2x Watch Speed Boost • +1,500 Coins Unlocked',
          initialVisited: false,
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
            2500,
            '🔥 Daily Mega Boost (+2,500 Coins)'
          );
          setActiveBoostTask(null);
          setNowMs(Date.now());
        },
        {
          claimLabel: 'Claim +2,500',
          readyHeadline: 'Daily Mega Boost • +2,500 Coins Unlocked',
          initialVisited: false,
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
  const watchProgressPct = Math.min(100, Math.max(0, (completedEpisodesCount / 10) * 100));

  const triviaRewardDisplay = isDoubleNext ? 200 : 100;
  const memoryRewardDisplay = isDoubleNext ? 300 : 150;

  return (
    <div className="space-y-3 pb-6">
      {/* Compact Header + Coin Balance */}
      <section className="obsidian-card rounded-2xl px-3.5 py-3 border border-[#D4AF37]/40 bg-gradient-to-r from-[#161209] via-[#100F14] to-[#0A0A0E] flex items-center justify-between gap-3">
        <div className="min-w-0">
          <h1 className="text-lg sm:text-xl font-display font-bold text-[#F6F2E9] tracking-tight leading-tight">
            Coin Boosters
          </h1>
          <p className="text-[11px] text-[#A69F91] truncate">
            Watch milestones, daily bonuses &amp; sponsor tasks
          </p>
        </div>

        <div className="shrink-0 rounded-xl bg-[#09090D] border border-[#D4AF37]/40 px-2.5 py-1.5 flex items-center gap-2">
          <RealisticGoldCoin sizePx={26} emblem="$" />
          <div className="text-right font-mono-num leading-tight">
            <div className="text-xs sm:text-sm font-extrabold gold-gradient-text whitespace-nowrap">
              {coins.toLocaleString()}
            </div>
            <div className="text-[10px] text-[#8D867A] flex items-center justify-end gap-1 whitespace-nowrap">
              <Trophy className="w-2.5 h-2.5 text-[#D4AF37]" />
              <span>{weeklyPct.toFixed(1)}%</span>
            </div>
          </div>
        </div>
      </section>

      {/* Clean 2-Pill Sub-Tab Bar */}
      <div
        role="tablist"
        aria-label="Boost categories"
        className="grid grid-cols-2 gap-1 p-1 rounded-full bg-[#0D0B12] border border-[#D4AF37]/30 shadow-[0_6px_20px_rgba(0,0,0,0.45)]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'tasks'}
          onClick={() => setActiveSubTab('tasks')}
          className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'tasks'
              ? 'gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
          }`}
        >
          <span>⚡ Boost Tasks</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={activeSubTab === 'games'}
          onClick={() => setActiveSubTab('games')}
          className={`min-h-[40px] px-3 py-1.5 rounded-full text-xs font-extrabold inline-flex items-center justify-center gap-1.5 whitespace-nowrap transition-all cursor-pointer ${
            activeSubTab === 'games'
              ? 'gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
              : 'text-[#C4BDB0] hover:text-[#FCE7A2] hover:bg-white/[0.04]'
          }`}
        >
          <span>🎮 Mini-Games</span>
        </button>
      </div>

      {/* Sub-Tab 1: Compact Single-Row Boost Tasks + Tiered Watch Milestones */}
      {activeSubTab === 'tasks' && (
        <section role="tabpanel" aria-label="Boost tasks and milestones" className="space-y-3">
          {/* Tiered Full Episode Watch Milestones (1, 3, 5, 10 Full Episodes) */}
          <div className="obsidian-card rounded-2xl border border-[#D4AF37]/40 bg-gradient-to-br from-[#16120B] via-[#111016] to-[#0B0A0F] p-3 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-2 min-w-0">
                <Play className="w-4 h-4 text-[#FBBF24] fill-current shrink-0" />
                <h2 className="text-xs sm:text-sm font-display font-bold text-[#F6F2E9] truncate">
                  Watch Episodes Milestones
                </h2>
              </div>
              <span className="font-mono-num text-[11px] font-extrabold text-[#FCE7A2] shrink-0">
                {completedEpisodesCount} / 10 episodes today
              </span>
            </div>

            <div
              role="progressbar"
              aria-valuenow={Math.min(10, completedEpisodesCount)}
              aria-valuemin={0}
              aria-valuemax={10}
              aria-label="Daily full episode watch milestone progress"
              className="h-1.5 w-full rounded-full bg-[#08080C] border border-white/[0.08] overflow-hidden"
            >
              <div
                className="h-full rounded-full gold-gradient-bg transition-all duration-300"
                style={{ width: `${watchProgressPct}%` }}
              />
            </div>

            <div className="space-y-1.5">
              {EPISODE_MILESTONE_TIERS.map((tier) => {
                const reached = completedEpisodesCount >= tier.episodes;
                const claimed = milestoneClaimMap[tier.episodes];
                const isClaiming = claimingMilestone === tier.episodes;

                return (
                  <div
                    key={tier.episodes}
                    className="rounded-xl border border-white/[0.08] bg-[#16141C] px-2.5 py-2 flex items-center gap-2.5"
                  >
                    <div
                      className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${
                        claimed
                          ? 'bg-emerald-500/15 border-emerald-400/60 text-emerald-300 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                          : reached
                            ? 'bg-amber-400/20 border-[#FBBF24] text-[#FDE68A] shadow-[0_0_14px_rgba(251,191,36,0.35)]'
                            : 'bg-sky-500/15 border-sky-400/45 text-sky-300 shadow-[0_0_12px_rgba(56,189,248,0.2)]'
                      }`}
                    >
                      {claimed ? <Check className="w-4 h-4" /> : <Play className="w-4 h-4 fill-current" />}
                    </div>

                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-1.5">
                        <span className="text-xs sm:text-sm font-bold text-[#FFF8E7] truncate">
                          {tier.label}
                        </span>
                        <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                          +{tier.coins.toLocaleString()}
                        </span>
                      </div>
                      <p className="text-[11px] text-[#A69F91] truncate">
                        {claimed
                          ? 'Reward credited today'
                          : reached
                            ? 'Goal reached — ready to claim'
                            : `${Math.min(tier.episodes, completedEpisodesCount)}/${tier.episodes} full episodes completed`}
                      </p>
                    </div>

                    {claimed ? (
                      <span className="min-h-[34px] px-3 rounded-full bg-emerald-500/15 border border-emerald-400/50 text-emerald-300 text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0">
                        <Check className="w-3 h-3" />
                        <span>Done</span>
                      </span>
                    ) : reached ? (
                      <button
                        type="button"
                        disabled={isClaiming}
                        onClick={() => void handleClaimMilestone(tier.episodes)}
                        className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer disabled:opacity-60"
                      >
                        {isClaiming ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                        <span>{isClaiming ? '...' : 'Claim'}</span>
                      </button>
                    ) : (
                      <span className="min-h-[34px] px-3 rounded-full bg-white/[0.06] border border-white/15 text-[#A69F91] font-mono-num text-[11px] font-bold inline-flex items-center justify-center shrink-0">
                        {Math.min(tier.episodes, completedEpisodesCount)}/{tier.episodes} eps
                      </span>
                    )}
                  </div>
                );
              })}
            </div>
          </div>

          {/* All Compact Single-Row Boost Tasks */}
          <div className="space-y-1.5">
            {/* 1. Hourly Mystery Box (+500 Coins) */}
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#121017] px-2.5 py-2 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-fuchsia-500/15 border border-fuchsia-400/60 text-fuchsia-300 shadow-[0_0_14px_rgba(232,121,249,0.28)] flex items-center justify-center shrink-0">
                <Gift className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#FFF8E7] truncate">
                    Hourly Mystery Box
                  </span>
                  <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                    +500
                  </span>
                </div>
                <p className="text-[11px] text-[#A69F91] truncate">
                  Free coin drop · Resets every 60 min
                </p>
              </div>

              {hourlyBoxCooldownRemainingMs > 0 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] text-[11px] font-bold font-mono-num inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
                >
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{formatCompactDuration(hourlyBoxCooldownRemainingMs)}</span>
                </button>
              ) : (
                <button
                  type="button"
                  disabled={claimingMysteryBox}
                  onClick={() => void handleClaimHourlyBox()}
                  className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer disabled:opacity-60"
                >
                  {claimingMysteryBox ? <Loader2 className="w-3 h-3 animate-spin" /> : null}
                  <span>{claimingMysteryBox ? '...' : 'Claim'}</span>
                </button>
              )}
            </div>

            {/* 2-4. Sponsor Spotlight Rows (+1,500, +1,000, +500 Coins — Anti-Cheat Modal Enforced) */}
            {SPONSOR_SPOTLIGHT_TASKS.map((card) => {
              const timer = sponsorTimers[card.timerKey];
              const cooldownRemainingMs = spotlightCooldownMap[card.slot];
              const isModalActiveForCard = activeBoostTask === card.timerKey;

              return (
                <div
                  key={card.timerKey}
                  className="rounded-xl border border-[#D4AF37]/30 bg-[#121017] px-2.5 py-2 flex items-center gap-2.5"
                >
                  <div
                    className={`w-10 h-10 rounded-xl border flex items-center justify-center shrink-0 ${card.iconBoxClass}`}
                  >
                    <Sparkles className="w-4 h-4" />
                  </div>

                  <div className="flex-1 min-w-0">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs sm:text-sm font-bold text-[#FFF8E7] truncate">
                        {card.title}
                      </span>
                      <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                        +{card.coins.toLocaleString()}
                      </span>
                    </div>
                    <p className="text-[11px] text-[#A69F91] truncate">
                      {card.subtitle}
                    </p>
                  </div>

                  {isModalActiveForCard ? (
                    <button
                      type="button"
                      disabled
                      className="min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-wait font-mono-num"
                    >
                      <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                      <span>20s...</span>
                    </button>
                  ) : timer ? (
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled
                        className="relative overflow-hidden min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold font-mono-num inline-flex items-center justify-center gap-1 cursor-wait"
                      >
                        <span
                          aria-hidden="true"
                          className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                          style={{ width: `${timer.progressPct}%` }}
                        />
                        <span className="relative z-10 inline-flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                          <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                          <span>{timer.isCompleting ? '...' : `${timer.secondsLeft}s`}</span>
                        </span>
                      </button>
                      {!timer.isCompleting && (
                        <button
                          type="button"
                          onClick={() => cancelSponsorVerification(card.timerKey)}
                          aria-label={`Cancel ${card.title} timer`}
                          className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                        >
                          <X className="w-3 h-3" />
                        </button>
                      )}
                    </div>
                  ) : cooldownRemainingMs > 0 ? (
                    <button
                      type="button"
                      disabled
                      className="min-h-[34px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] text-[11px] font-bold font-mono-num inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
                    >
                      <Clock className="w-3 h-3 text-amber-300" />
                      <span>{formatCompactDuration(cooldownRemainingMs)}</span>
                    </button>
                  ) : isAnyBoostVerifying ? (
                    <button
                      type="button"
                      disabled
                      className="min-h-[34px] px-3 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed opacity-70"
                    >
                      <Lock className="w-3 h-3" />
                      <span>Wait</span>
                    </button>
                  ) : (
                    <button
                      type="button"
                      onClick={() => handleStartSpotlight(card)}
                      className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer"
                    >
                      <span>Go</span>
                      <ExternalLink className="w-3 h-3" />
                    </button>
                  )}
                </div>
              );
            })}

            {/* 5. 5-Ad Marathon Streak (+5,000 Coins — Anti-Cheat Modal Enforced) */}
            <div className="rounded-xl border border-[#FBBF24]/50 bg-gradient-to-r from-[#1D1608] via-[#141117] to-[#121017] px-2.5 py-2 flex items-center gap-2.5 shadow-[0_0_14px_rgba(251,191,36,0.12)]">
              <div className="w-10 h-10 rounded-xl gold-gradient-bg text-[#181307] shadow-[0_0_14px_rgba(251,191,36,0.4)] flex items-center justify-center shrink-0">
                <Film className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0 space-y-1">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#FCE7A2] truncate">
                    5-Ad Marathon Streak
                  </span>
                  <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                    +5,000
                  </span>
                </div>
                <div className="flex items-center gap-2">
                  <span className="text-[11px] font-mono-num text-[#B8B0A0] whitespace-nowrap">
                    {marathonCooldownRemainingMs > 0 ? '5/5' : `${marathonAdsWatched}/5 Ads`}
                  </span>
                  <div className="flex-1 grid grid-cols-5 gap-1 max-w-[110px]">
                    {[0, 1, 2, 3, 4].map((idx) => (
                      <div
                        key={idx}
                        className={`h-1 rounded-full ${
                          marathonCooldownRemainingMs > 0 || idx < marathonAdsWatched
                            ? 'gold-gradient-bg'
                            : 'bg-white/15'
                        }`}
                      />
                    ))}
                  </div>
                </div>
              </div>

              {marathonCooldownRemainingMs > 0 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] text-[11px] font-bold font-mono-num inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
                >
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{formatCompactDuration(marathonCooldownRemainingMs)}</span>
                </button>
              ) : activeBoostTask === 'marathon' ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-wait font-mono-num"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                  <span>20s...</span>
                </button>
              ) : marathonTimer ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled
                    className="relative overflow-hidden min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold font-mono-num inline-flex items-center justify-center gap-1 cursor-wait"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                      style={{ width: `${marathonTimer.progressPct}%` }}
                    />
                    <span className="relative z-10 inline-flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                      <span>{marathonTimer.isCompleting ? '...' : `${marathonTimer.secondsLeft}s`}</span>
                    </span>
                  </button>
                  {!marathonTimer.isCompleting && (
                    <button
                      type="button"
                      onClick={() => cancelSponsorVerification('marathon')}
                      aria-label="Cancel marathon verification timer"
                      className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : marathonAdsWatched >= 5 ? (
                <button
                  type="button"
                  disabled={claimingMarathon || isAnyBoostVerifying}
                  onClick={() => void handleClaimMarathon()}
                  className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1 shrink-0 shadow-[0_0_16px_rgba(251,191,36,0.5)] hover:brightness-105 cursor-pointer disabled:opacity-60"
                >
                  <span>{claimingMarathon ? '...' : 'Claim'}</span>
                </button>
              ) : isAnyBoostVerifying ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3 h-3" />
                  <span>Wait</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMarathonStep}
                  className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer"
                >
                  <span>Go</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 6. 2x Watch Speed Boost (+1,500 Coins — Anti-Cheat Modal Enforced) */}
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#121017] px-2.5 py-2 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-amber-400/15 border border-amber-400/60 text-amber-300 shadow-[0_0_14px_rgba(245,158,11,0.28)] flex items-center justify-center shrink-0">
                <Zap className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#FFF8E7] truncate">
                    2x Watch Speed Boost
                  </span>
                  <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                    +1,500
                  </span>
                </div>
                <p className="text-[11px] text-[#A69F91] truncate">
                  20s sponsor check · Every 1 hour
                </p>
              </div>

              {activeBoostTask === 'speed' ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-wait font-mono-num"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                  <span>20s...</span>
                </button>
              ) : speedTimer ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled
                    className="relative overflow-hidden min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold font-mono-num inline-flex items-center justify-center gap-1 cursor-wait"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                      style={{ width: `${speedTimer.progressPct}%` }}
                    />
                    <span className="relative z-10 inline-flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                      <span>{speedTimer.isCompleting ? '...' : `${speedTimer.secondsLeft}s`}</span>
                    </span>
                  </button>
                  {!speedTimer.isCompleting && (
                    <button
                      type="button"
                      onClick={() => cancelSponsorVerification('speed')}
                      aria-label="Cancel 2x Watch Speed Boost verification"
                      className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : speedCooldownRemainingMs > 0 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] text-[11px] font-bold font-mono-num inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
                >
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{formatCompactDuration(speedCooldownRemainingMs)}</span>
                </button>
              ) : isAnyBoostVerifying ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3 h-3" />
                  <span>Wait</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartSpeedBoost}
                  className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer"
                >
                  <span>Go</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>

            {/* 7. Daily Mega Boost (+2,500 Coins — Anti-Cheat Modal Enforced) */}
            <div className="rounded-xl border border-[#D4AF37]/30 bg-[#121017] px-2.5 py-2 flex items-center gap-2.5">
              <div className="w-10 h-10 rounded-xl bg-orange-500/20 border border-orange-400/60 text-orange-300 shadow-[0_0_14px_rgba(251,146,60,0.28)] flex items-center justify-center shrink-0">
                <Flame className="w-4 h-4" />
              </div>

              <div className="flex-1 min-w-0">
                <div className="flex items-center gap-1.5">
                  <span className="text-xs sm:text-sm font-bold text-[#FFF8E7] truncate">
                    Daily Mega Boost
                  </span>
                  <span className="font-mono-num text-[11px] font-extrabold text-[#FBBF24] shrink-0">
                    +2,500
                  </span>
                </div>
                <p className="text-[11px] text-[#A69F91] truncate">
                  20s sponsor check · Once every 24h
                </p>
              </div>

              {activeBoostTask === 'mega' ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold inline-flex items-center gap-1 shrink-0 cursor-wait font-mono-num"
                >
                  <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                  <span>20s...</span>
                </button>
              ) : megaTimer ? (
                <div className="flex items-center gap-1 shrink-0">
                  <button
                    type="button"
                    disabled
                    className="relative overflow-hidden min-h-[34px] px-3 rounded-full bg-[#151109] border border-[#D4AF37]/80 text-[#FFF8E7] text-[11px] font-extrabold font-mono-num inline-flex items-center justify-center gap-1 cursor-wait"
                  >
                    <span
                      aria-hidden="true"
                      className="absolute inset-y-0 left-0 gold-gradient-bg opacity-85 transition-[width] duration-150 ease-linear"
                      style={{ width: `${megaTimer.progressPct}%` }}
                    />
                    <span className="relative z-10 inline-flex items-center gap-1 drop-shadow-[0_1px_2px_rgba(0,0,0,0.9)]">
                      <Loader2 className="w-3 h-3 animate-spin text-[#FFF3B0]" />
                      <span>{megaTimer.isCompleting ? '...' : `${megaTimer.secondsLeft}s`}</span>
                    </span>
                  </button>
                  {!megaTimer.isCompleting && (
                    <button
                      type="button"
                      onClick={() => cancelSponsorVerification('mega')}
                      aria-label="Cancel Daily Mega Boost verification"
                      className="w-7 h-7 rounded-full bg-white/[0.08] hover:bg-rose-500/25 border border-white/15 text-zinc-300 hover:text-rose-200 flex items-center justify-center shrink-0 cursor-pointer"
                    >
                      <X className="w-3 h-3" />
                    </button>
                  )}
                </div>
              ) : megaCooldownRemainingMs > 0 ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-amber-500/15 border border-amber-400/50 text-[#FCE7A2] text-[11px] font-bold font-mono-num inline-flex items-center gap-1 shrink-0 cursor-not-allowed"
                >
                  <Clock className="w-3 h-3 text-amber-300" />
                  <span>{formatCompactDuration(megaCooldownRemainingMs)}</span>
                </button>
              ) : isAnyBoostVerifying ? (
                <button
                  type="button"
                  disabled
                  className="min-h-[34px] px-3 rounded-full bg-white/[0.06] border border-white/15 text-zinc-400 text-[11px] font-bold inline-flex items-center gap-1 shrink-0 cursor-not-allowed opacity-70"
                >
                  <Lock className="w-3 h-3" />
                  <span>Wait</span>
                </button>
              ) : (
                <button
                  type="button"
                  onClick={handleStartMegaBoost}
                  className="min-h-[34px] px-3.5 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center justify-center gap-1 shrink-0 shadow-[0_0_14px_rgba(251,191,36,0.4)] hover:brightness-105 cursor-pointer"
                >
                  <span>Go</span>
                  <ExternalLink className="w-3 h-3" />
                </button>
              )}
            </div>
          </div>
        </section>
      )}

      {/* Sub-Tab 2: Mini-Games */}
      {activeSubTab === 'games' && (
        <section
          role="tabpanel"
          aria-labelledby="minigames-heading"
          className="obsidian-card rounded-2xl p-3.5 sm:p-4 border border-[#D4AF37]/40 space-y-3.5"
        >
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
                  Daily Game Coins: {dailyGameCoins.toLocaleString()} /{' '}
                  {BOOST_DAILY_GAME_COIN_CAP.toLocaleString()}
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
    </div>
  );
};
