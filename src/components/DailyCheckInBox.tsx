import React, { useState } from 'react';
import { CalendarCheck2, Check, Coins, Crown } from 'lucide-react';
import {
  DEFAULT_SPONSOR_URL,
  STREAK_DAYS,
  getCurrentWeekKey,
  getTodayWeekdayKey,
} from '../constants';
import { PlayerPrivate, WeekDayKey } from '../types';

interface DailyCheckInBoxProps {
  privateState: PlayerPrivate;
  sponsorAdUrl?: string;
  onCompleteCheckIn: (dayKey: WeekDayKey, rewardCoins: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
}

export const DailyCheckInBox: React.FC<DailyCheckInBoxProps> = ({
  privateState,
  onCompleteCheckIn,
  onStartSponsorReward,
}) => {
  const todayWeekday = getTodayWeekdayKey();
  const currentWeek = getCurrentWeekKey();
  const claimedDays =
    privateState.weekKey === currentWeek ? privateState.claimedDays || [] : [];

  const [collecting, setCollecting] = useState(false);

  const handleCheckIn = async (day: { key: WeekDayKey; reward: number }) => {
    if (claimedDays.includes(day.key) || day.key !== todayWeekday || collecting) {
      return;
    }
    window.open(DEFAULT_SPONSOR_URL, '_blank');
    onStartSponsorReward?.();
    setCollecting(true);
    try {
      await onCompleteCheckIn(day.key, day.reward);
    } finally {
      setCollecting(false);
    }
  };

  return (
    <section
      id="daily-checkin-box"
      aria-label="Monday to Sunday Daily Check-In"
      className="obsidian-card rounded-2xl p-4 sm:p-6 space-y-4 border border-[#D4AF37]/40 shadow-[0_8px_32px_rgba(212,175,55,0.12)] scroll-mt-24"
    >
      <div className="flex flex-wrap items-center justify-between gap-2">
        <div className="space-y-0.5">
          <div className="flex items-center gap-2">
            <CalendarCheck2 className="w-4 h-4 text-[#D4AF37]" />
            <h2 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]">
              Mon–Sun Daily Check-In Bonus
            </h2>
          </div>
          <p className="text-xs text-[#A69F91]">
            Tap <strong className="text-[#FCE7A2]">Claim</strong> on today’s card to visit sponsor &amp; collect 100–300 bonus coins.
          </p>
        </div>

        <div className="inline-flex items-center gap-1.5 px-3 py-1 rounded-full bg-[#15120A] border border-[#D4AF37]/35 font-mono-num text-xs font-bold text-[#FCE7A2]">
          <span>{claimedDays.length} / 7 Checked In</span>
        </div>
      </div>

      <div className="grid grid-cols-2 sm:grid-cols-4 lg:grid-cols-7 gap-2.5">
        {STREAK_DAYS.map((day) => {
          const isClaimed = claimedDays.includes(day.key);
          const isToday = day.key === todayWeekday;
          const isSunday = day.key === 'Sun';

          return (
            <div
              key={day.key}
              className={`rounded-xl p-3 border flex flex-col justify-between gap-2.5 transition-all ${
                isSunday ? 'col-span-2 sm:col-span-1' : ''
              } ${
                isClaimed
                  ? 'bg-emerald-950/30 border-emerald-500/50 shadow-[0_0_16px_rgba(34,197,94,0.12)]'
                  : isToday
                    ? 'bg-gradient-to-b from-[#2A200A] to-[#131008] border-[#FCE7A2] shadow-[0_0_24px_rgba(212,175,55,0.24)]'
                    : 'bg-[#0B0B10] border-white/[0.08] opacity-80'
              }`}
            >
              <div className="flex items-center justify-between gap-1.5">
                <div className="flex items-center gap-1 min-w-0">
                  <span
                    className={`text-xs font-bold uppercase tracking-wide ${
                      isClaimed
                        ? 'text-emerald-300'
                        : isToday
                          ? 'text-[#FCE7A2]'
                          : 'text-[#C4BDB0]'
                    }`}
                  >
                    {day.key}
                  </span>
                  {isSunday && !isClaimed && (
                    <Crown className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  )}
                </div>

                {isClaimed ? (
                  <span
                    aria-label={`${day.label} checked in`}
                    className="w-5 h-5 rounded-full bg-emerald-500 text-[#052010] flex items-center justify-center shrink-0 shadow-sm shadow-emerald-500/40"
                  >
                    <Check className="w-3.5 h-3.5 stroke-[3]" />
                  </span>
                ) : isToday ? (
                  <span className="text-[10px] font-bold uppercase tracking-wider text-[#181307] gold-gradient-bg px-1.5 py-0.5 rounded">
                    Today
                  </span>
                ) : null}
              </div>

              <div className="space-y-2">
                <div className="font-mono-num text-sm font-extrabold text-[#FCE7A2] flex items-center gap-1">
                  <Coins className="w-3.5 h-3.5 text-[#D4AF37] shrink-0" />
                  <span>+{day.reward}</span>
                </div>

                {isClaimed ? (
                  <div className="min-h-[34px] rounded-lg bg-emerald-500/15 border border-emerald-500/35 text-emerald-300 text-[11px] font-bold flex items-center justify-center gap-1">
                    <Check className="w-3.5 h-3.5" />
                    <span>Collected</span>
                  </div>
                ) : isToday ? (
                  <button
                    type="button"
                    disabled={collecting}
                    onClick={() => void handleCheckIn(day)}
                    className="w-full min-h-[38px] px-2.5 rounded-lg gold-gradient-bg text-[#181307] text-xs font-extrabold tracking-wide hover:brightness-105 active:scale-[0.97] transition-all shadow-md shadow-[#D4AF37]/25 cursor-pointer disabled:opacity-60"
                  >
                    {collecting ? 'Claiming...' : 'Claim'}
                  </button>
                ) : (
                  <div className="min-h-[34px] rounded-lg bg-[#14141B] border border-white/[0.06] text-[#7A746A] text-[11px] font-medium flex items-center justify-center">
                    {isSunday ? 'Sunday Bonus' : 'Locked'}
                  </div>
                )}
              </div>
            </div>
          );
        })}
      </div>
    </section>
  );
};
