import React, { useState } from 'react';
import { CalendarCheck2, Check, Crown } from 'lucide-react';
import {
  STREAK_DAYS,
  getCurrentWeekKey,
  getTodayWeekdayKey,
  resolveSponsorLink,
} from '../constants';
import { PlayerPrivate, WeekDayKey } from '../types';

interface DailyCheckInBoxProps {
  privateState: PlayerPrivate;
  sponsorAdUrl?: string;
  onCompleteCheckIn: (dayKey: WeekDayKey, rewardCoins: number) => Promise<void>;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: { claimLabel?: string; readyHeadline?: string }
  ) => void;
}

export const DailyCheckInBox: React.FC<DailyCheckInBoxProps> = ({
  privateState,
  sponsorAdUrl = '#',
  onCompleteCheckIn,
  onStartSponsorReward,
}) => {
  const todayWeekday = getTodayWeekdayKey();
  const currentWeek = getCurrentWeekKey();
  const claimedDays =
    privateState.weekKey === currentWeek ? privateState.claimedDays || [] : [];

  const [collecting, setCollecting] = useState(false);

  const todaySpec =
    STREAK_DAYS.find((d) => d.key === todayWeekday) || STREAK_DAYS[0];
  const isTodayClaimed = claimedDays.includes(todaySpec.key);

  const handleClaimToday = async () => {
    if (isTodayClaimed || collecting) return;

    if (onStartSponsorReward) {
      onStartSponsorReward(
        async () => {
          setCollecting(true);
          try {
            await onCompleteCheckIn(todaySpec.key, todaySpec.reward);
          } finally {
            setCollecting(false);
          }
        },
        {
          claimLabel: `Claim +${todaySpec.reward}`,
          readyHeadline: `Sponsor Ad • Ready! +${todaySpec.reward} Coins Unlocked`,
        }
      );
      return;
    }

    const activeSponsorLink = resolveSponsorLink(sponsorAdUrl);
    if (activeSponsorLink && activeSponsorLink !== '#') {
      window.open(activeSponsorLink, '_blank', 'noopener,noreferrer');
    }

    setCollecting(true);
    try {
      await onCompleteCheckIn(todaySpec.key, todaySpec.reward);
    } finally {
      setCollecting(false);
    }
  };

  const renderTile = (day: { key: WeekDayKey; label: string; reward: number }) => {
    const isClaimed = claimedDays.includes(day.key);
    const isToday = day.key === todayWeekday;
    const isSunday = day.key === 'Sun';

    return (
      <div
        key={day.key}
        className={`rounded-xl px-2 py-2.5 border flex flex-col items-center justify-center gap-1 text-center transition-all ${
          isClaimed
            ? 'bg-emerald-950/30 border-emerald-500/45'
            : isToday
              ? 'bg-gradient-to-b from-[#2A200A] to-[#131008] border-[#FCE7A2] shadow-[0_0_16px_rgba(212,175,55,0.22)]'
              : 'bg-[#0B0B10] border-white/[0.08] opacity-75'
        }`}
      >
        <div className="flex items-center justify-center gap-1 text-[11px] font-bold uppercase tracking-wide">
          <span
            className={
              isClaimed
                ? 'text-emerald-300'
                : isToday
                  ? 'text-[#FCE7A2]'
                  : 'text-[#C4BDB0]'
            }
          >
            {day.key}
          </span>
          {isClaimed ? (
            <Check className="w-3 h-3 text-emerald-400 stroke-[3]" />
          ) : isSunday ? (
            <Crown className="w-3 h-3 text-[#D4AF37]" />
          ) : null}
        </div>

        <div
          className={`font-mono-num text-xs font-extrabold ${
            isClaimed
              ? 'text-emerald-300'
              : isToday
                ? 'text-[#FCE7A2]'
                : 'text-[#E8C96D]'
          }`}
        >
          +{day.reward}
        </div>

        <div className="text-[10px] leading-none font-semibold">
          {isClaimed ? (
            <span className="text-emerald-400">Done</span>
          ) : isToday ? (
            <span className="text-[#FCE7A2]">Today</span>
          ) : (
            <span className="text-[#7A746A]">{isSunday ? 'Bonus' : 'Locked'}</span>
          )}
        </div>
      </div>
    );
  };

  const topRowDays = STREAK_DAYS.slice(0, 4);
  const bottomRowDays = STREAK_DAYS.slice(4, 7);

  return (
    <section
      id="daily-checkin-box"
      aria-label="Monday to Sunday Daily Check-In"
      className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-3 border border-[#D4AF37]/40 shadow-[0_8px_28px_rgba(212,175,55,0.1)] scroll-mt-24"
    >
      <div className="flex items-center justify-between gap-2">
        <div className="flex items-center gap-2 min-w-0">
          <CalendarCheck2 className="w-4 h-4 text-[#D4AF37] shrink-0" />
          <h2 className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] truncate">
            Mon–Sun Daily Check-In Bonus
          </h2>
        </div>

        <span className="font-mono-num text-xs font-bold text-[#FCE7A2] whitespace-nowrap shrink-0">
          {claimedDays.length} / 7 Days
        </span>
      </div>

      {/* Compact 4-tile top row (Mon–Thu) + 3-tile bottom row (Fri–Sun) */}
      <div className="space-y-2">
        <div className="grid grid-cols-4 gap-2">
          {topRowDays.map(renderTile)}
        </div>
        <div className="grid grid-cols-3 gap-2">
          {bottomRowDays.map(renderTile)}
        </div>
      </div>

      {/* Single "Claim Today" button underneath */}
      {isTodayClaimed ? (
        <button
          type="button"
          disabled
          className="w-full min-h-[44px] px-4 rounded-xl bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 cursor-not-allowed"
        >
          <Check className="w-4 h-4 shrink-0" />
          <span>Today’s Check-In Claimed (+{todaySpec.reward} Coins)</span>
        </button>
      ) : (
        <button
          type="button"
          disabled={collecting}
          onClick={() => void handleClaimToday()}
          className="w-full min-h-[44px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_6px_20px_rgba(212,175,55,0.28)] hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60"
        >
          <CalendarCheck2 className="w-4 h-4 shrink-0" />
          <span>
            {collecting
              ? 'Claiming...'
              : `Claim Today (+${todaySpec.reward} Coins)`}
          </span>
        </button>
      )}
    </section>
  );
};
