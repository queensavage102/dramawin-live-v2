import React, { useState } from 'react';
import { CheckCircle2, Gift, Share2, Trophy } from 'lucide-react';
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

const WHATSAPP_INVITE_MESSAGE =
  '🔥 Watch free short dramas & win real Sunday cash prizes on DramaWin! Join me & earn coins here: https://vercel.app';
const WHATSAPP_SHARE_URL = `https://wa.me/?text=${encodeURIComponent(WHATSAPP_INVITE_MESSAGE)}`;

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
  whatsappShareClaimedToday?: boolean;
  onSundayZeroTick?: () => void;
  onCompleteCheckIn: (dayKey: WeekDayKey, rewardCoins: number) => Promise<void>;
  onStartSponsorReward?: (rewardAction?: () => Promise<void>) => void;
  onOpenMysteryBox: (boxNumber: number) => void;
  onDismissVoucherModal: () => void;
  onWhatsappShareReward?: () => Promise<void> | void;
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
  whatsappShareClaimedToday = false,
  onSundayZeroTick,
  onCompleteCheckIn,
  onStartSponsorReward,
  onOpenMysteryBox,
  onDismissVoucherModal,
  onWhatsappShareReward,
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
          {/* Daily WhatsApp Share Bonus Card */}
          <div className="rounded-2xl bg-[#111116] border border-emerald-500/30 p-4 sm:p-5 flex flex-col sm:flex-row sm:items-center justify-between gap-3.5 shadow-[0_8px_28px_rgba(16,185,129,0.08)]">
            <div className="space-y-1 min-w-0">
              <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                <Share2 className="w-3.5 h-3.5" />
                <span>Daily Invite Bonus</span>
              </div>
              <h3 className="text-base sm:text-lg font-display font-bold text-white">
                Invite Friends on WhatsApp
              </h3>
              <p className="text-xs text-zinc-400 leading-relaxed">
                Share DramaWin Tournament with friends on WhatsApp and claim{' '}
                <strong className="text-emerald-300 font-semibold">+500 Coins</strong> once per day.
              </p>
            </div>

            <a
              href={WHATSAPP_SHARE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => {
                void onWhatsappShareReward?.();
              }}
              className={`min-h-[46px] px-4 sm:px-5 rounded-xl text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shrink-0 transition-all cursor-pointer shadow-lg ${
                whatsappShareClaimedToday
                  ? 'bg-emerald-950/80 border border-emerald-500/50 text-emerald-200 hover:bg-emerald-900/80'
                  : 'bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-white shadow-emerald-600/25'
              }`}
            >
              {whatsappShareClaimedToday ? (
                <>
                  <CheckCircle2 className="w-4 h-4 text-emerald-400 shrink-0" />
                  <span>Claimed Today (+500 ✓) · Share Again</span>
                </>
              ) : (
                <>
                  <Share2 className="w-4 h-4 shrink-0" />
                  <span>Share on WhatsApp (+500 Coins)</span>
                </>
              )}
            </a>
          </div>

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
