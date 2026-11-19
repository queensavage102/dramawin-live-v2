import React, { useState } from 'react';
import { Gift, Trophy } from 'lucide-react';
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
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onOpenMysteryBox: (boxNumber: number) => void;
  onDismissVoucherModal: () => void;
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
}) => {
  const [subView, setSubView] = useState<'gifts' | 'leaderboard'>('gifts');
  const todayKey = getTodayDateKey();

  return (
    <div className="space-y-5">
      {/* Sleek Sub-Navigation inside Rewards Tab */}
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
          className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
          className={`min-h-[44px] rounded-xl text-xs sm:text-sm font-bold inline-flex items-center justify-center gap-2 transition-all cursor-pointer ${
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
        <div className="space-y-6">
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
