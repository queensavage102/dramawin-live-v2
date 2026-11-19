import React, { useEffect, useRef, useState } from 'react';
import { Trophy, Users, Clock, Award } from 'lucide-react';
import { getSundayCountdown, getTodayWeekdayKey } from '../constants';
import { CoinTransaction, LeaderboardPlayer } from '../types';
import { StreakHistoryChart } from './StreakHistoryChart';

interface LeaderboardTabProps {
  players: LeaderboardPlayer[];
  currentUserId: string;
  poolPrizeZar: number;
  rolloverAmountZar: number;
  lastPoolWinnerSummary: string;
  qualifiedCount: number;
  qualificationThreshold: number;
  streakActivityDates?: string[];
  transactions?: CoinTransaction[];
  onSundayZeroTick?: () => void;
}

export const LeaderboardTab: React.FC<LeaderboardTabProps> = ({
  players,
  currentUserId,
  poolPrizeZar,
  rolloverAmountZar,
  lastPoolWinnerSummary,
  qualifiedCount,
  qualificationThreshold,
  streakActivityDates = [],
  transactions = [],
  onSundayZeroTick,
}) => {
  const [countdown, setCountdown] = useState(() => getSundayCountdown());
  const zeroFiredRef = useRef(false);

  useEffect(() => {
    const interval = setInterval(() => {
      const next = getSundayCountdown();
      setCountdown(next);
      const isZero =
        next.days === '00' &&
        next.hours === '00' &&
        next.minutes === '00' &&
        next.seconds === '00';
      if (isZero && !zeroFiredRef.current) {
        zeroFiredRef.current = true;
        onSundayZeroTick?.();
      } else if (!isZero) {
        zeroFiredRef.current = false;
      }
    }, 1000);
    return () => clearInterval(interval);
  }, [onSundayZeroTick]);

  const isSunday = getTodayWeekdayKey() === 'Sun';
  const userIndex = players.findIndex((p) => p.uid === currentUserId);
  const userRank = userIndex >= 0 ? userIndex + 1 : null;
  const userRow = userIndex >= 0 ? players[userIndex] : null;
  const poolUnlocked = qualifiedCount >= 3;

  const p1 = Math.round(poolPrizeZar * 0.5);
  const p2 = Math.round(poolPrizeZar * 0.3);
  const p3 = Math.round(poolPrizeZar * 0.2);

  // Strict Sunday Winner Rule:
  // Winners & prize badges are hidden Monday-Saturday and revealed ONLY on Sunday for players >= 500,000 weekly coins.
  const qualifiedTop3 = isSunday
    ? players.filter((p) => (p.weeklyCoins || 0) >= qualificationThreshold).slice(0, 3)
    : [];

  const getSundayWinnerBadge = (
    uid: string
  ): {
    placeLabel: string;
    prizeZar: number;
    badgeClass: string;
    rowAccentClass: string;
  } | null => {
    if (!isSunday) return null;
    const qIndex = qualifiedTop3.findIndex((p) => p.uid === uid);
    if (qIndex === 0) {
      return {
        placeLabel: '1st',
        prizeZar: p1,
        badgeClass:
          'bg-gradient-to-r from-[#FCE7A2] via-[#D4AF37] to-[#A88220] text-[#181307] border border-[#FFF2C6]',
        rowAccentClass: 'bg-[#D4AF37]/[0.08]',
      };
    }
    if (qIndex === 1) {
      return {
        placeLabel: '2nd',
        prizeZar: p2,
        badgeClass:
          'bg-gradient-to-r from-[#F1F5F9] via-[#CBD5E1] to-[#94A3B8] text-[#0F172A] border border-white/70',
        rowAccentClass: 'bg-slate-300/[0.04]',
      };
    }
    if (qIndex === 2) {
      return {
        placeLabel: '3rd',
        prizeZar: p3,
        badgeClass:
          'bg-gradient-to-r from-[#F3B98E] via-[#CD7F32] to-[#8C4A19] text-[#1A0E05] border border-[#F5C7A3]/80',
        rowAccentClass: 'bg-amber-700/[0.06]',
      };
    }
    return null;
  };

  return (
    <div className="space-y-6">
      {/* Header & Official Sunday Notice */}
      <div className="space-y-2.5 px-1">
        <h1 className="text-2xl sm:text-3xl font-display font-bold text-[#F6F2E9]">
          THE WEEKLY CLIMB — Live Leaderboard
        </h1>
        <p className="text-xs sm:text-sm font-medium text-[#FCE7A2] bg-[#16130A] border border-[#D4AF37]/40 rounded-xl px-4 py-3">
          Winners crowned every Sunday! Target: 500,000 Coins. If target is not reached, the prize pool rolls over to next Sunday.
        </p>

        {rolloverAmountZar > 0 && (
          <div className="inline-block gold-gradient-bg text-[#181307] rounded-xl px-4 py-2 text-xs font-bold shadow-md shadow-[#D4AF37]/20">
            🔥 ROLLOVER JACKPOT: R{poolPrizeZar} — Unclaimed from last week!
          </div>
        )}

        {lastPoolWinnerSummary && (
          <div className="rounded-xl bg-[#1A1508] border border-[#D4AF37]/45 px-4 py-2.5 text-xs text-[#FCE7A2]">
            Previous Sunday Payout: {lastPoolWinnerSummary}
          </div>
        )}
        <p className="text-xs text-[#A69F91]">
          Register or update your player name in the Me tab.
        </p>
      </div>

      {/* 3 Metric Cards: Qualified players, Prize pool, Live Sunday Countdown */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Qualified (500,000+)</span>
            <Users className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#F6F2E9]">
            {qualifiedCount.toLocaleString()}
          </div>
          <p className="text-xs text-[#8D867A]">
            {poolUnlocked ? 'Pool unlocked (3+ qualified)' : 'Climbing toward 500,000 Coins'}
          </p>
        </div>

        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Sunday Prize Pool</span>
            <Trophy className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-mono-num text-2xl font-bold gold-gradient-text">
            R{poolPrizeZar}
          </div>
          <p className="text-xs text-[#A69F91]">
            {isSunday
              ? qualifiedTop3.length > 0
                ? 'Sunday Reveal Active'
                : 'Awaiting 500,000 Coin qualifiers'
              : 'Winners revealed on Sunday'}
          </p>
        </div>

        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-2">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Sunday countdown</span>
            <Clock className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-mono-num text-xl sm:text-2xl font-bold text-[#F6F2E9] tracking-tight">
            {countdown.days}d : {countdown.hours}h : {countdown.minutes}m : {countdown.seconds}s
          </div>
          <p className="text-xs text-[#8D867A]">Resets Sunday 23:59 SAST</p>
        </div>
      </section>

      {/* D3 Visual 7-Day Streak History Chart */}
      <StreakHistoryChart
        streakActivityDates={streakActivityDates}
        transactions={transactions}
      />

      {/* Current User Rank Summary */}
      {userRow && userRank !== null && (
        <div className="rounded-2xl bg-gradient-to-r from-[#1A1508] to-[#111116] border border-[#D4AF37]/50 p-4 sm:p-5 flex flex-wrap items-center justify-between gap-3">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl gold-gradient-bg text-[#181307] font-mono-num font-bold text-sm flex items-center justify-center shrink-0">
              #{userRank}
            </div>
            <div>
              <p className="text-xs text-[#E8C96D] font-semibold">Your Current Standing</p>
              <p className="text-sm sm:text-base font-bold text-[#F6F2E9]">{userRow.username}</p>
            </div>
          </div>

          <div className="flex items-center gap-4 text-right">
            <div>
              <p className="text-xs text-[#A69F91]">Weekly Coins</p>
              <p className="font-mono-num text-base font-bold text-[#E8C96D]">
                {userRow.weeklyCoins.toLocaleString()}
              </p>
            </div>
            <div>
              <p className="text-xs text-[#A69F91]">Target</p>
              <p className="font-mono-num text-xs font-semibold text-[#F6F2E9]">
                {userRow.weeklyCoins >= qualificationThreshold
                  ? 'Qualified (500,000+)'
                  : `${Math.max(0, qualificationThreshold - userRow.weeklyCoins).toLocaleString()} left`}
              </p>
            </div>
          </div>
        </div>
      )}

      {/* Ranked Player Rows (Strictly Rank, Name, and Coin Total Mon-Sat; Winner Badges ONLY Sunday >= 500,000) */}
      <section className="obsidian-card rounded-2xl overflow-hidden">
        <div className="px-4 sm:px-6 py-3.5 border-b border-white/[0.08] flex items-center justify-between text-xs font-semibold text-[#A69F91]">
          <span>Rank &amp; Player</span>
          <span>Coins</span>
        </div>

        {players.length === 0 ? (
          <div className="p-8 text-center text-sm text-[#A69F91]">
            No ranked players yet. Be the first to earn coins this week.
          </div>
        ) : (
          <div className="divide-y divide-white/[0.06]">
            {players.map((entry, idx) => {
              const rank = idx + 1;
              const isMe = entry.uid === currentUserId;
              const sundayWinner = getSundayWinnerBadge(entry.uid);
              const initials =
                entry.avatar ||
                entry.username
                  .split(/\s+/)
                  .map((part) => part[0] || '')
                  .join('')
                  .slice(0, 2)
                  .toUpperCase();
              const avatarPalette = [
                'from-amber-400 to-orange-500 text-zinc-950',
                'from-fuchsia-500 to-purple-600 text-white',
                'from-emerald-400 to-teal-600 text-zinc-950',
                'from-sky-400 to-indigo-600 text-white',
                'from-rose-400 to-pink-600 text-white',
              ][idx % 5];

              return (
                <div
                  key={entry.uid}
                  className={`px-4 sm:px-6 py-3.5 min-h-[60px] flex items-center justify-between gap-3 transition-colors ${
                    isMe
                      ? 'bg-[#D4AF37]/12'
                      : sundayWinner
                        ? sundayWinner.rowAccentClass
                        : 'hover:bg-white/[0.02]'
                  }`}
                >
                  <div className="flex items-center gap-3 min-w-0">
                    <span
                      className={`font-mono-num text-sm font-bold w-8 shrink-0 ${
                        sundayWinner || rank <= 3 ? 'text-[#E8C96D]' : 'text-[#8D867A]'
                      }`}
                    >
                      #{rank}
                    </span>

                    <div
                      aria-hidden="true"
                      className={`w-9 h-9 rounded-full bg-gradient-to-br ${
                        isMe ? 'from-yellow-300 via-amber-400 to-orange-500 text-zinc-950 ring-2 ring-amber-300/70' : avatarPalette
                      } flex items-center justify-center font-bold text-xs shrink-0 shadow-md`}
                    >
                      {initials}
                    </div>

                    <div className="min-w-0">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="text-sm font-semibold text-[#F6F2E9] truncate">
                          {entry.username}
                        </span>
                        {isMe && (
                          <span className="text-xs font-semibold text-[#E8C96D] shrink-0">
                            (You)
                          </span>
                        )}
                        {sundayWinner && (
                          <span
                            className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-md font-mono-num text-[11px] font-extrabold shrink-0 shadow-sm ${sundayWinner.badgeClass}`}
                          >
                            <Award className="w-3 h-3" />
                            <span>
                              {sundayWinner.placeLabel}: R{sundayWinner.prizeZar}
                            </span>
                          </span>
                        )}
                      </div>
                    </div>
                  </div>

                  <div className="text-right shrink-0">
                    <span className="font-mono-num text-sm sm:text-base font-bold text-[#F6F2E9]">
                      {entry.weeklyCoins.toLocaleString()}
                    </span>
                    <p className="font-mono-num text-[11px] text-[#8D867A]">
                      {entry.coins.toLocaleString()} total
                    </p>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </section>
    </div>
  );
};
