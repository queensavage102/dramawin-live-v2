import React, { useState } from 'react';
import {
  CheckCircle2,
  Coins,
  Crown,
  Film,
  Globe,
  Lock,
  Play,
  ShieldCheck,
  Sparkles,
  Ticket,
  X,
} from 'lucide-react';
import {
  WATCH_PARTY_ENTRY_AD_COUNT,
  WATCH_PARTY_ENTRY_COIN_COST,
} from '../constants';
import { DramaEpisode, WatchPartyRoom } from '../types';

export type PendingLobbyGateAction =
  | {
      kind: 'create';
      episode: DramaEpisode;
      isPublic: boolean;
    }
  | {
      kind: 'join';
      room: WatchPartyRoom;
      fromInviteLink?: boolean;
    };

interface VipScreeningPassModalProps {
  open: boolean;
  pendingAction: PendingLobbyGateAction | null;
  adsCompleted: number;
  playerTotalCoins: number;
  processing?: boolean;
  onPayWithCoins: () => Promise<void>;
  onWatchSponsorAd: () => void;
  onClose: () => void;
}

export const VipScreeningPassModal: React.FC<VipScreeningPassModalProps> = ({
  open,
  pendingAction,
  adsCompleted,
  playerTotalCoins,
  processing = false,
  onPayWithCoins,
  onWatchSponsorAd,
  onClose,
}) => {
  const [paying, setPaying] = useState(false);

  if (!open || !pendingAction) return null;

  const canAfford = playerTotalCoins >= WATCH_PARTY_ENTRY_COIN_COST;
  const clampedAds = Math.max(0, Math.min(WATCH_PARTY_ENTRY_AD_COUNT, adsCompleted));
  const isBusy = paying || processing;

  const title =
    pendingAction.kind === 'create'
      ? pendingAction.episode.title
      : pendingAction.room.episodeTitle;
  const coverImage =
    pendingAction.kind === 'create'
      ? pendingAction.episode.coverImage ||
        pendingAction.episode.posterUrl ||
        pendingAction.episode.thumbnailUrl ||
        ''
      : pendingAction.room.coverImage || '';
  const category =
    pendingAction.kind === 'create'
      ? pendingAction.episode.category || 'Drama'
      : pendingAction.room.category || 'Drama';

  const handlePayClick = async () => {
    if (!canAfford || isBusy) return;
    setPaying(true);
    try {
      await onPayWithCoins();
    } finally {
      setPaying(false);
    }
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="VIP Screening Pass"
      className="fixed inset-0 z-[90] bg-black/88 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto"
      onClick={(e) => {
        if (e.target === e.currentTarget && !isBusy) onClose();
      }}
    >
      <div className="relative w-full max-w-md my-auto rounded-3xl bg-gradient-to-b from-[#171208] via-[#101016] to-[#0B0B10] border border-[#D4AF37]/55 shadow-[0_24px_80px_rgba(0,0,0,0.95)] overflow-hidden">
        {/* Top Glow Bar */}
        <div className="px-4 sm:px-5 py-4 border-b border-white/[0.08] bg-gradient-to-r from-[#241A07]/90 via-[#141219] to-[#0D0D13] flex items-center justify-between gap-3">
          <div className="flex items-center gap-2.5 min-w-0">
            <span className="w-10 h-10 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0 shadow-[0_0_20px_rgba(212,175,55,0.5)]">
              <Ticket className="w-5 h-5" />
            </span>
            <div className="min-w-0">
              <div className="flex items-center gap-1.5">
                <h2 className="text-base sm:text-lg font-display font-extrabold text-white truncate">
                  VIP Screening Pass
                </h2>
                <span className="px-2 py-0.5 rounded-full bg-amber-400/20 border border-amber-400/50 text-[9px] font-black text-amber-300 uppercase tracking-wider shrink-0">
                  1.5x Coins
                </span>
              </div>
              <p className="text-[11px] text-zinc-400 truncate">
                {pendingAction.kind === 'create'
                  ? 'Unlock Watch Lobby hosting for all friends'
                  : pendingAction.fromInviteLink
                    ? `You're invited to Lobby ${pendingAction.room.roomId}`
                    : `Unlock entry to Lobby ${pendingAction.room.roomId}`}
              </p>
            </div>
          </div>

          <button
            type="button"
            disabled={isBusy}
            onClick={onClose}
            aria-label="Close VIP Screening Pass"
            className="min-h-[36px] min-w-[36px] rounded-xl bg-white/5 border border-white/10 text-zinc-300 hover:text-white flex items-center justify-center cursor-pointer disabled:opacity-50 shrink-0"
          >
            <X className="w-4 h-4" />
          </button>
        </div>

        <div className="p-4 sm:p-5 space-y-4">
          {/* Selected Movie / Room Summary Card */}
          <div className="rounded-2xl bg-black/50 border border-white/10 p-3 flex items-center gap-3">
            <div className="w-12 h-16 rounded-xl overflow-hidden bg-[#14141d] border border-[#D4AF37]/35 shrink-0">
              {coverImage ? (
                <img
                  src={coverImage}
                  alt={title}
                  referrerPolicy="no-referrer"
                  className="w-full h-full object-cover"
                />
              ) : (
                <div className="w-full h-full flex items-center justify-center">
                  <Film className="w-5 h-5 text-amber-400" />
                </div>
              )}
            </div>

            <div className="min-w-0 flex-1 space-y-1">
              <div className="flex flex-wrap items-center gap-1.5">
                {pendingAction.kind === 'join' ? (
                  <span className="px-2 py-0.5 rounded bg-emerald-950/75 border border-emerald-400/45 font-mono-num text-[10px] font-bold text-emerald-200">
                    Room {pendingAction.room.roomId}
                  </span>
                ) : (
                  <span
                    className={`px-2 py-0.5 rounded border text-[10px] font-bold inline-flex items-center gap-1 ${
                      pendingAction.isPublic
                        ? 'bg-emerald-950/70 border-emerald-400/45 text-emerald-200'
                        : 'bg-white/5 border-white/15 text-zinc-300'
                    }`}
                  >
                    {pendingAction.isPublic ? (
                      <Globe className="w-2.5 h-2.5" />
                    ) : (
                      <Lock className="w-2.5 h-2.5" />
                    )}
                    <span>{pendingAction.isPublic ? 'Public Lobby' : 'Private Lobby'}</span>
                  </span>
                )}
                <span className="px-1.5 py-0.5 rounded bg-white/10 text-[10px] font-semibold text-amber-300">
                  {category}
                </span>
              </div>

              <p className="text-xs sm:text-sm font-bold text-white line-clamp-1">{title}</p>

              <p className="text-[11px] text-zinc-400 truncate">
                {pendingAction.kind === 'create'
                  ? `Sync playback & live chat · ${pendingAction.episode.episodeLabel}`
                  : `Hosted by ${pendingAction.room.hostName} · ${pendingAction.room.episodeLabel}`}
              </p>
            </div>
          </div>

          {/* 3-Ad Progress Bar */}
          <div className="rounded-2xl bg-[#14141c] border border-[#D4AF37]/30 p-3.5 space-y-2.5">
            <div className="flex items-center justify-between gap-2">
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCE7A2]">
                <ShieldCheck className="w-4 h-4 text-[#FBBF24]" />
                <span>Sponsor Ad Pass Progress</span>
              </span>
              <span className="font-mono-num text-xs font-black text-amber-300">
                {clampedAds} / {WATCH_PARTY_ENTRY_AD_COUNT}
              </span>
            </div>

            <div className="grid grid-cols-3 gap-2">
              {[1, 2, 3].map((step) => {
                const done = clampedAds >= step;
                return (
                  <div
                    key={step}
                    className={`rounded-xl px-2.5 py-2 border text-center flex items-center justify-center gap-1 text-[11px] font-extrabold transition ${
                      done
                        ? 'bg-emerald-950/75 border-emerald-400/60 text-emerald-200 shadow-[0_0_12px_rgba(16,185,129,0.25)]'
                        : 'bg-black/50 border-white/10 text-zinc-400'
                    }`}
                  >
                    {done ? (
                      <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400 shrink-0" />
                    ) : (
                      <Play className="w-3 h-3 text-amber-400/70 shrink-0" />
                    )}
                    <span>Ad {step}</span>
                  </div>
                );
              })}
            </div>

            <p className="text-[11px] text-zinc-400 leading-relaxed">
              Complete <strong className="text-white">3 Anti-Cheat Sponsor Ads</strong> (20s each) for free entry, or unlock instantly with{' '}
              <strong className="text-[#FCE7A2]">
                {WATCH_PARTY_ENTRY_COIN_COST.toLocaleString()} Coins
              </strong>
              .
            </p>
          </div>

          {/* Action Buttons */}
          <div className="space-y-2.5">
            <button
              type="button"
              disabled={isBusy}
              onClick={onWatchSponsorAd}
              className="w-full min-h-[48px] px-4 rounded-2xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-black inline-flex items-center justify-center gap-2 shadow-[0_10px_28px_rgba(212,175,55,0.45)] hover:brightness-105 active:scale-[0.98] disabled:opacity-50 cursor-pointer transition"
            >
              <Sparkles className="w-4 h-4 shrink-0" />
              <span>
                Watch Anti-Cheat Sponsor Ad ({clampedAds} / {WATCH_PARTY_ENTRY_AD_COUNT})
              </span>
            </button>

            <button
              type="button"
              disabled={!canAfford || isBusy}
              onClick={() => void handlePayClick()}
              className={`w-full min-h-[46px] px-4 rounded-2xl border text-xs sm:text-sm font-extrabold inline-flex items-center justify-between gap-2 transition ${
                canAfford && !isBusy
                  ? 'bg-[#1f190b] hover:bg-[#2a210e] border-[#D4AF37]/70 text-[#FCE7A2] cursor-pointer shadow-[0_0_20px_rgba(212,175,55,0.2)]'
                  : 'bg-white/[0.04] border-white/10 text-zinc-500 cursor-not-allowed'
              }`}
            >
              <span className="inline-flex items-center gap-2">
                <Coins className="w-4 h-4 text-amber-400 shrink-0" />
                <span>
                  {paying
                    ? 'Unlocking Pass...'
                    : `Pay ${WATCH_PARTY_ENTRY_COIN_COST.toLocaleString()} Coins · Enter Now`}
                </span>
              </span>
              <span className="font-mono-num text-[11px] font-bold">
                Bal: {playerTotalCoins.toLocaleString()}
              </span>
            </button>

            {!canAfford && (
              <p className="text-center text-[11px] text-amber-200/75">
                Need {(WATCH_PARTY_ENTRY_COIN_COST - playerTotalCoins).toLocaleString()} more Coins for instant pass — use the 3 free Sponsor Ads above!
              </p>
            )}
          </div>

          <div className="pt-1 flex items-center justify-center gap-1.5 text-[10px] text-zinc-500">
            <Crown className="w-3 h-3 text-[#D4AF37]" />
            <span>VIP Pass unlocks synchronized playback, live chat &amp; 1.5x Coin Pot fills</span>
          </div>
        </div>
      </div>
    </div>
  );
};
