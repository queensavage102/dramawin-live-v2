import React, { useState } from 'react';
import { Coins, Lock, RotateCcw, Sparkles, Unlock } from 'lucide-react';
import { FULL_EPISODE_UNLOCK_COINS } from '../utils/modernCatalog';

interface MovieUnlockOverlayProps {
  open: boolean;
  movieTitle: string;
  playerTotalCoins: number;
  unlockCost?: number;
  onUnlock: () => Promise<boolean>;
  onReplayPreview?: () => void;
  onGoToBoost?: () => void;
  onClose?: () => void;
}

export const MovieUnlockOverlay: React.FC<MovieUnlockOverlayProps> = ({
  open,
  movieTitle,
  playerTotalCoins,
  unlockCost = FULL_EPISODE_UNLOCK_COINS,
  onUnlock,
  onReplayPreview,
  onGoToBoost,
  onClose,
}) => {
  const [unlocking, setUnlocking] = useState(false);

  if (!open) return null;

  const canAfford = playerTotalCoins >= unlockCost;
  const shortfall = Math.max(0, unlockCost - playerTotalCoins);

  const handleUnlockClick = async () => {
    if (unlocking || !canAfford) return;
    setUnlocking(true);
    try {
      await onUnlock();
    } finally {
      setUnlocking(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label={`Spend ${unlockCost} Coins to Unlock Full Episode`}
      className="absolute inset-0 z-40 bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
    >
      <div className="w-full max-w-sm rounded-3xl bg-[#111116]/95 border border-[#D4AF37]/55 p-5 sm:p-6 shadow-[0_24px_64px_rgba(0,0,0,0.92)] text-center space-y-4">
        <div className="mx-auto w-14 h-14 rounded-2xl bg-gradient-to-br from-amber-400/25 via-amber-500/15 to-yellow-600/20 border border-[#D4AF37]/60 flex items-center justify-center shadow-[0_0_24px_rgba(212,175,55,0.28)]">
          <Lock className="w-7 h-7 text-[#FBBF24]" />
        </div>

        <div className="space-y-1.5">
          <p className="text-[11px] font-mono-num font-bold uppercase tracking-[0.16em] text-amber-300">
            3-Minute Free Preview Ended
          </p>
          <h2 className="text-lg sm:text-xl font-display font-extrabold text-white leading-snug text-balance">
            Spend {unlockCost.toLocaleString()} Coins to Unlock Full Episode
          </h2>
          <p className="text-xs text-zinc-400 line-clamp-2">{movieTitle}</p>
        </div>

        <div className="rounded-2xl bg-white/[0.04] border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-2 text-xs">
          <span className="text-zinc-400 font-medium">Your Wallet</span>
          <span className="inline-flex items-center gap-1.5 font-mono-num font-extrabold text-[#FCE7A2]">
            <Coins className="w-3.5 h-3.5 text-[#FBBF24]" />
            <span>{playerTotalCoins.toLocaleString()} Coins</span>
          </span>
        </div>

        <div className="space-y-2">
          {canAfford ? (
            <button
              type="button"
              disabled={unlocking}
              onClick={() => void handleUnlockClick()}
              className="w-full min-h-[46px] px-4 rounded-2xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(212,175,55,0.4)] hover:brightness-105 active:scale-[0.98] disabled:opacity-60 cursor-pointer transition"
            >
              <Unlock className="w-4 h-4 shrink-0" />
              <span>
                {unlocking
                  ? 'Unlocking Full Episode...'
                  : `Spend ${unlockCost.toLocaleString()} Coins to Unlock Full Episode`}
              </span>
            </button>
          ) : (
            <div className="space-y-2">
              <div className="rounded-xl bg-amber-500/10 border border-amber-400/30 px-3 py-2 text-[11px] font-semibold text-amber-200">
                You need{' '}
                <span className="font-mono-num font-extrabold">
                  {shortfall.toLocaleString()} more Coins
                </span>{' '}
                to unlock this full episode.
              </div>
              {onGoToBoost && (
                <button
                  type="button"
                  onClick={onGoToBoost}
                  className="w-full min-h-[44px] px-4 rounded-2xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shadow-[0_8px_24px_rgba(212,175,55,0.35)] hover:brightness-105 cursor-pointer transition"
                >
                  <Sparkles className="w-4 h-4 shrink-0" />
                  <span>Earn Coins on Boost</span>
                </button>
              )}
            </div>
          )}

          <div className="flex items-center justify-center gap-2 pt-1">
            {onReplayPreview && (
              <button
                type="button"
                onClick={onReplayPreview}
                className="min-h-[40px] px-3 rounded-xl bg-white/[0.06] hover:bg-white/[0.1] border border-white/[0.1] text-[11px] font-semibold text-zinc-200 inline-flex items-center gap-1.5 cursor-pointer transition"
              >
                <RotateCcw className="w-3.5 h-3.5 text-amber-300" />
                <span>Replay Preview</span>
              </button>
            )}
            {onClose && (
              <button
                type="button"
                onClick={onClose}
                className="min-h-[40px] px-3.5 rounded-xl bg-white/[0.04] hover:bg-white/[0.08] border border-white/[0.08] text-[11px] font-semibold text-zinc-300 cursor-pointer transition"
              >
                Back
              </button>
            )}
          </div>
        </div>
      </div>
    </div>
  );
};
