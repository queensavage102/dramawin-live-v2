import React, { useEffect, useState } from 'react';
import { Bookmark, Check, Coins, Flame, RotateCcw, Trophy, UserPlus } from 'lucide-react';
import { getEpisodeSeriesId } from '../constants';
import { DramaEpisode, LeaderboardPlayer, PlayerPrivate } from '../types';
import { InstallAppWidget } from './InstallAppWidget';

interface MeTabProps {
  player: LeaderboardPlayer;
  privateState: PlayerPrivate;
  episodes: DramaEpisode[];
  myListSeriesIds: string[];
  qualificationThreshold: number;
  poolPrizeZar: number;
  onUpdatePlayerName: (newName: string) => Promise<void>;
  onResetMyCoins: () => Promise<void>;
  onToggleMyList: (seriesId: string, seriesName: string) => void;
  onGoToHome: () => void;
}

const TARGET_TOURNAMENT_COINS = 500000;

export const MeTab: React.FC<MeTabProps> = ({
  player,
  privateState,
  episodes,
  myListSeriesIds,
  qualificationThreshold,
  poolPrizeZar,
  onUpdatePlayerName,
  onResetMyCoins,
  onToggleMyList,
  onGoToHome,
}) => {
  const [nameInput, setNameInput] = useState(player.username);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSavedFlash, setNameSavedFlash] = useState(false);

  const [confirmReset, setConfirmReset] = useState(false);
  const [resettingCoins, setResettingCoins] = useState(false);
  const [resetFlash, setResetFlash] = useState(false);

  useEffect(() => {
    setNameInput(player.username);
  }, [player.username]);

  const handleSaveName = async (e: React.FormEvent) => {
    e.preventDefault();
    setNameError(null);
    const cleaned = nameInput.trim();
    if (cleaned.length < 2) {
      setNameError('Enter at least 2 characters for your player name.');
      return;
    }
    setSavingName(true);
    try {
      await onUpdatePlayerName(cleaned);
      setNameSavedFlash(true);
      window.setTimeout(() => setNameSavedFlash(false), 2500);
    } catch (err) {
      setNameError(err instanceof Error ? err.message : 'Unable to save player name.');
    } finally {
      setSavingName(false);
    }
  };

  const handleTriggerReset = async () => {
    if (!confirmReset) {
      setConfirmReset(true);
      return;
    }
    setResettingCoins(true);
    try {
      await onResetMyCoins();
      setConfirmReset(false);
      setResetFlash(true);
      window.setTimeout(() => setResetFlash(false), 2500);
    } finally {
      setResettingCoins(false);
    }
  };

  // Strict (currentCoins / 500000) * 100 starting cleanly at 0%
  const safeTarget = Math.max(TARGET_TOURNAMENT_COINS, qualificationThreshold || TARGET_TOURNAMENT_COINS);
  const exactPct = Math.min(100, Math.max(0, (player.weeklyCoins / safeTarget) * 100));
  const formattedPct =
    exactPct === 0
      ? '0%'
      : exactPct < 0.1
        ? `${exactPct.toFixed(3)}%`
        : exactPct < 10
          ? `${exactPct.toFixed(2)}%`
          : `${exactPct.toFixed(1)}%`;

  return (
    <div className="space-y-6">
      {/* Player Name Registration Card */}
      <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4 border border-[#D4AF37]/35">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            <h1 className="text-lg sm:text-xl font-display font-bold text-[#F6F2E9]">
              Player Name Registration
            </h1>
          </div>
          <span className="text-xs font-mono-num text-[#E8C96D]">
            Active: {player.username}
          </span>
        </div>

        <form onSubmit={handleSaveName} className="flex flex-col sm:flex-row gap-2.5">
          <input
            type="text"
            maxLength={32}
            value={nameInput}
            onChange={(e) => setNameInput(e.target.value)}
            placeholder="Enter your player name (e.g. Nomsa_K)"
            className="flex-1 min-h-[44px] px-3.5 rounded-xl bg-[#070709] border border-[#D4AF37]/30 text-sm text-[#F6F2E9] focus:outline-none focus:border-[#D4AF37]"
          />
          <button
            type="submit"
            disabled={savingName}
            className="min-h-[44px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-1.5 whitespace-nowrap shrink-0 hover:brightness-105 disabled:opacity-60 cursor-pointer"
          >
            {nameSavedFlash ? (
              <>
                <Check className="w-4 h-4" />
                <span>Saved!</span>
              </>
            ) : (
              <span>{savingName ? 'Saving...' : 'Save Player Name'}</span>
            )}
          </button>
        </form>
        {nameError && <p className="text-xs text-red-300">{nameError}</p>}
      </section>

      {/* Install DramaWin App (PWA) Widget */}
      <InstallAppWidget storageKey="dramawin_install_me_dismissed_v1" />

      {/* Personal Coin Stats */}
      <section className="grid grid-cols-1 sm:grid-cols-3 gap-3.5">
        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Wallet Balance</span>
            <Coins className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-mono-num text-2xl font-bold gold-gradient-text">
            {player.coins.toLocaleString()}
          </div>
          <p className="text-xs text-[#8D867A]">Instant play wallet coins</p>
        </div>

        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Weekly Tournament Coins</span>
            <Trophy className="w-4 h-4 text-[#E8C96D]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#F6F2E9]">
            {player.weeklyCoins.toLocaleString()}
          </div>
          <p className="text-xs text-[#8D867A]">
            Pool prize: R{poolPrizeZar} (Top 3)
          </p>
        </div>

        <div className="obsidian-card rounded-2xl p-4 sm:p-5 space-y-1.5">
          <div className="flex items-center justify-between text-xs text-[#A69F91]">
            <span>Check-In Streak</span>
            <Flame className="w-4 h-4 text-[#D4AF37]" />
          </div>
          <div className="font-mono-num text-2xl font-bold text-[#F6F2E9]">
            {privateState.claimedDays?.length || player.streakCount || 0} / 7
          </div>
          <p className="text-xs text-[#8D867A]">Days checked in this week</p>
        </div>
      </section>

      {/* Accurate (currentCoins / 500000) * 100 Progress Bar */}
      <section className="obsidian-card rounded-2xl p-5 space-y-2.5 border border-[#D4AF37]/25">
        <div className="flex flex-wrap items-center justify-between gap-2 text-xs">
          <span className="font-semibold text-[#E8C96D]">
            Sunday 500,000-Coin Target Progress
          </span>
          <span className="font-mono-num font-bold text-[#FCE7A2]">
            {player.weeklyCoins.toLocaleString()} / {safeTarget.toLocaleString()} Coins ({formattedPct})
          </span>
        </div>

        <div
          role="progressbar"
          aria-valuenow={Math.min(safeTarget, player.weeklyCoins)}
          aria-valuemin={0}
          aria-valuemax={safeTarget}
          className="h-3 w-full rounded-full bg-[#09090D] border border-white/[0.08] overflow-hidden"
        >
          <div
            className="h-full gold-gradient-bg rounded-full transition-all duration-500 ease-out"
            style={{ width: `${exactPct}%` }}
          />
        </div>
      </section>

      {/* Saved My List Section */}
      <section className="obsidian-card rounded-2xl p-5 space-y-3 border border-white/[0.08]">
        <div className="flex items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <Bookmark className="w-4 h-4 text-amber-400" />
            <h2 className="text-sm font-display font-bold text-[#F6F2E9]">
              My Saved Series ({myListSeriesIds.length})
            </h2>
          </div>
          <button
            type="button"
            onClick={onGoToHome}
            className="text-xs font-semibold text-amber-300 hover:text-amber-200 cursor-pointer"
          >
            Browse Home
          </button>
        </div>

        {myListSeriesIds.length === 0 ? (
          <p className="text-xs text-[#8D867A]">
            Tap <strong className="text-zinc-200">My List</strong> while watching in the For You tab to bookmark series here.
          </p>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
            {myListSeriesIds.map((sId) => {
              const matchedEp = episodes.find((ep) => getEpisodeSeriesId(ep) === sId);
              const label = matchedEp?.series || sId.replace(/^series-/, '').replace(/-/g, ' ');
              return (
                <div
                  key={sId}
                  className="rounded-xl bg-[#09090b] border border-white/[0.08] px-3.5 py-2.5 flex items-center justify-between gap-2"
                >
                  <button
                    type="button"
                    onClick={onGoToHome}
                    className="text-xs font-semibold text-white hover:text-amber-300 truncate text-left cursor-pointer"
                  >
                    {label}
                  </button>
                  <button
                    type="button"
                    onClick={() => onToggleMyList(sId, label)}
                    className="text-[11px] font-medium text-zinc-400 hover:text-red-300 shrink-0 cursor-pointer"
                  >
                    Remove
                  </button>
                </div>
              );
            })}
          </div>
        )}
      </section>

      {/* Reset My Coins to 0 (Test) Card */}
      <section className="obsidian-card rounded-2xl p-5 border border-white/[0.08] flex flex-wrap items-center justify-between gap-4">
        <div className="space-y-1">
          <h2 className="text-sm font-display font-bold text-[#F6F2E9]">
            Test Progress Bar &amp; Balance Reset
          </h2>
          <p className="text-xs text-[#A69F91]">
            Reset your wallet and weekly tournament coins to 0 to verify the 0 / 500,000 progress bar.
          </p>
        </div>

        <div className="flex items-center gap-2 shrink-0">
          {confirmReset && (
            <button
              type="button"
              onClick={() => setConfirmReset(false)}
              className="min-h-[44px] px-3.5 rounded-xl border border-white/[0.14] text-xs font-semibold text-[#A69F91] hover:text-[#F6F2E9] cursor-pointer"
            >
              Cancel
            </button>
          )}
          <button
            type="button"
            disabled={resettingCoins}
            onClick={() => void handleTriggerReset()}
            className={`min-h-[44px] px-4 rounded-xl text-xs font-bold inline-flex items-center gap-2 transition-colors cursor-pointer whitespace-nowrap ${
              confirmReset
                ? 'bg-red-600 hover:bg-red-500 text-white shadow-md shadow-red-900/40'
                : resetFlash
                  ? 'bg-[#171720] border border-[#D4AF37]/50 text-[#FCE7A2]'
                  : 'border border-red-500/40 bg-red-950/35 text-red-200 hover:bg-red-950/60'
            }`}
          >
            <RotateCcw className="w-4 h-4" />
            <span>
              {resettingCoins
                ? 'Resetting...'
                : confirmReset
                  ? 'Confirm Reset to 0'
                  : resetFlash
                    ? 'Coins Reset to 0!'
                    : 'Reset My Coins to 0 (Test)'}
            </span>
          </button>
        </div>
      </section>
    </div>
  );
};
