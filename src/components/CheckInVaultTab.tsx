import React, { useState } from 'react';
import { ChevronRight, Gift, Trophy, Users } from 'lucide-react';
import { getTodayDateKey } from '../constants';
import {
  CoinTransaction,
  LeaderboardPlayer,
  MysteryWinnerRecord,
  PlayerPrivate,
  WeekDayKey,
} from '../types';
import { DailyCheckInBox } from './DailyCheckInBox';
import { LeaderboardTab } from './LeaderboardTab';
import { MysteryRevealState, MysteryVaultCard } from './MysteryVaultCard';

interface CheckInVaultTabProps {
  privateState: PlayerPrivate;
  sponsorAdUrl?: string;
  openedBoxesOverride?: number[];
  mysteryReveal: MysteryRevealState | null;
  pendingGiftBox?: {
    boxNumber: number;
    secondsLeft: number;
    progress?: number;
  } | null;
  voucherModal: {
    winner: MysteryWinnerRecord;
    newPoolPrizeZar?: number;
  } | null;
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
  onCompleteCheckIn: (dayKey: WeekDayKey, rewardCoins: number) => Promise<void>;
  onStartSponsorReward?: (
    rewardAction?: () => Promise<void>,
    options?: { claimLabel?: string; readyHeadline?: string }
  ) => void;
  onOpenMysteryBox: (boxNumber: number) => void;
  onDismissVoucherModal: () => void;
  onOpenInviteSocial?: () => void;
}

export const CheckInVaultTab: React.FC<CheckInVaultTabProps> = ({
  privateState,
  sponsorAdUrl,
  openedBoxesOverride,
  mysteryReveal,
  pendingGiftBox,
  voucherModal,
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
  onCompleteCheckIn,
  onStartSponsorReward,
  onOpenMysteryBox,
  onDismissVoucherModal,
  onOpenInviteSocial,
}) => {
  const [subView, setSubView] = useState<'gifts' | 'leaderboard'>('gifts');
  const todayKey = getTodayDateKey();

  return (
    <div className="space-y-4">
      {/* Compact Top Entry to Unified Invite & Social Section */}
      {onOpenInviteSocial && (
        <button
          type="button"
          onClick={onOpenInviteSocial}
          className="w-full min-h-[44px] px-3.5 py-2 rounded-xl bg-[#14110A] hover:bg-[#1C170D] border border-[#D4AF37]/35 flex items-center justify-between gap-2 text-left transition-colors cursor-pointer"
        >
          <span className="flex items-center gap-2.5 min-w-0">
            <span className="w-7 h-7 rounded-lg bg-amber-500/15 border border-[#D4AF37]/35 text-[#FCE7A2] flex items-center justify-center shrink-0">
              <Users className="w-3.5 h-3.5" />
            </span>
            <span className="text-xs font-bold text-[#F6F2E9] truncate">
              Invite &amp; Social · Share personal link (+1,000 / friend) &amp; TikTok
            </span>
          </span>
          <ChevronRight className="w-4 h-4 text-[#D4AF37] shrink-0" />
        </button>
      )}

      {/* Sub-Navigation inside Rewards Tab */}
      <div
        role="tablist"
        aria-label="Rewards sections"
        className="grid grid-cols-2 gap-2 p-1 rounded-2xl bg-[#111116] border border-white/[0.08]"
      >
        <button
          type="button"
          role="tab"
          aria-selected={subView === 'gifts'}
          onClick={() => setSubView('gifts')}
          className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subView === 'gifts'
              ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-zinc-950 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Gift className="w-4 h-4" />
          <span>Gifts &amp; Daily Streak</span>
        </button>

        <button
          type="button"
          role="tab"
          aria-selected={subView === 'leaderboard'}
          onClick={() => setSubView('leaderboard')}
          className={`min-h-[42px] rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
            subView === 'leaderboard'
              ? 'bg-gradient-to-r from-amber-400 to-fuchsia-500 text-zinc-950 shadow'
              : 'text-zinc-400 hover:text-white'
          }`}
        >
          <Trophy className="w-4 h-4" />
          <span>Weekly Leaderboard</span>
        </button>
      </div>

      {subView === 'gifts' ? (
        <div className="space-y-4">
          <DailyCheckInBox
            privateState={privateState}
            sponsorAdUrl={sponsorAdUrl}
            onCompleteCheckIn={onCompleteCheckIn}
            onStartSponsorReward={onStartSponsorReward}
          />

          <MysteryVaultCard
            privateState={privateState}
            todayKey={todayKey}
            openedBoxesOverride={openedBoxesOverride}
            mysteryReveal={mysteryReveal}
            pendingGiftBox={pendingGiftBox}
            voucherModal={voucherModal}
            onOpenMysteryBox={onOpenMysteryBox}
            onDismissVoucherModal={onDismissVoucherModal}
          />
        </div>
      ) : (
        <LeaderboardTab
          players={players}
          currentUserId={currentUserId}
          poolPrizeZar={poolPrizeZar}
          rolloverAmountZar={rolloverAmountZar}
          lastPoolWinnerSummary={lastPoolWinnerSummary}
          qualifiedCount={qualifiedCount}
          qualificationThreshold={qualificationThreshold}
          streakActivityDates={streakActivityDates}
          transactions={transactions}
          onSundayZeroTick={onSundayZeroTick}
        />
      )}
    </div>
  );
};
