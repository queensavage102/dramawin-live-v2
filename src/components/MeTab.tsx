import React, { useEffect, useState } from 'react';
import {
  Bookmark,
  Check,
  Coins,
  Copy,
  ExternalLink,
  FileText,
  Film,
  Fingerprint,
  Flame,
  Loader2,
  MessageCircle,
  Send,
  Share2,
  ShieldCheck,
  Trophy,
  UserPlus,
  Users,
  X,
} from 'lucide-react';
import {
  BRAND_NAME,
  REFERRAL_REWARD_COINS,
  buildPersonalInviteLink,
  getEpisodeSeriesId,
} from '../constants';
import { DramaEpisode, LeaderboardPlayer, PlayerPrivate } from '../types';
import { BoostTrackerState } from '../utils/localState';

const TIKTOK_PROFILE_URL = 'https://tiktok.com/@faceless_creator_sa';
const SERIES_REQUEST_WEB3FORMS_ENDPOINT = 'https://api.web3forms.com/submit';
const SERIES_REQUEST_ACCESS_KEY = '1cf6a6bd-bbe1-44ae-94ca-5ee93136033e';

interface MeTabProps {
  player: LeaderboardPlayer;
  privateState: PlayerPrivate;
  trackingId: string;
  referralUserId: string;
  referralsJoinedCount: number;
  boostState: BoostTrackerState;
  episodes: DramaEpisode[];
  myListSeriesIds: string[];
  qualificationThreshold: number;
  poolPrizeZar: number;
  onUpdatePlayerName: (newName: string) => Promise<void>;
  onToggleMyList: (seriesId: string, seriesName: string) => void;
  onGoToHome: () => void;
  onNotifyInviteLinkCopied: (url: string) => void;
  onNotifyWhatsappShared: () => void;
  onMarkTiktokVisited: () => void;
  onClaimTiktokBoost: () => Promise<void>;
  onSeriesRequestReward: () => Promise<boolean>;
}

type LegalModalType = 'privacy' | 'terms' | null;

const TARGET_TOURNAMENT_COINS = 500000;

export const MeTab: React.FC<MeTabProps> = ({
  player,
  privateState,
  trackingId,
  referralUserId,
  referralsJoinedCount,
  boostState,
  episodes,
  myListSeriesIds,
  qualificationThreshold,
  poolPrizeZar,
  onUpdatePlayerName,
  onToggleMyList,
  onGoToHome,
  onNotifyInviteLinkCopied,
  onNotifyWhatsappShared,
  onMarkTiktokVisited,
  onClaimTiktokBoost,
  onSeriesRequestReward,
}) => {
  const [nameInput, setNameInput] = useState(player.username);
  const [savingName, setSavingName] = useState(false);
  const [nameError, setNameError] = useState<string | null>(null);
  const [nameSavedFlash, setNameSavedFlash] = useState(false);
  const [copiedId, setCopiedId] = useState(false);
  const [copiedInvite, setCopiedInvite] = useState(false);
  const [claimingTiktok, setClaimingTiktok] = useState(false);
  const [requestTitle, setRequestTitle] = useState('');
  const [submittingRequest, setSubmittingRequest] = useState(false);
  const [requestError, setRequestError] = useState<string | null>(null);
  const [requestStatusMsg, setRequestStatusMsg] = useState<string | null>(null);
  const [legalModal, setLegalModal] = useState<LegalModalType>(null);

  useEffect(() => {
    setNameInput(player.username);
  }, [player.username]);

  const personalInviteLink = buildPersonalInviteLink(referralUserId);
  const whatsappShareHref = `https://wa.me/?text=${encodeURIComponent(
    `🔥 Watch free short dramas & win virtual Coins on DramaWin! Join using my invite link: ${personalInviteLink}`
  )}`;

  const copyTextToClipboard = async (value: string) => {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(value);
      return;
    }
    const el = document.createElement('textarea');
    el.value = value;
    el.setAttribute('readonly', '');
    el.className = 'sr-only';
    document.body.appendChild(el);
    el.select();
    document.execCommand('copy');
    document.body.removeChild(el);
  };

  const handleCopyTrackingId = async () => {
    if (!trackingId) return;
    try {
      await copyTextToClipboard(trackingId);
      setCopiedId(true);
      window.setTimeout(() => setCopiedId(false), 2200);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleCopyInviteLink = async () => {
    try {
      await copyTextToClipboard(personalInviteLink);
      setCopiedInvite(true);
      window.setTimeout(() => setCopiedInvite(false), 2200);
      onNotifyInviteLinkCopied(personalInviteLink);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  const handleClaimTiktok = async () => {
    if (boostState.tiktokClaimed || claimingTiktok) return;
    setClaimingTiktok(true);
    try {
      await onClaimTiktokBoost();
    } finally {
      setClaimingTiktok(false);
    }
  };

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

  const handleSubmitSeriesRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    setRequestError(null);
    setRequestStatusMsg(null);
    const cleanedTitle = requestTitle.trim();
    if (cleanedTitle.length < 2) {
      setRequestError('Please type a drama, anime, or series title.');
      return;
    }

    setSubmittingRequest(true);
    try {
      const response = await fetch(SERIES_REQUEST_WEB3FORMS_ENDPOINT, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          Accept: 'application/json',
        },
        body: JSON.stringify({
          access_key: SERIES_REQUEST_ACCESS_KEY,
          subject: 'New DramaWin Series Request',
          from_name: 'DramaWin App',
          message: [
            `Requested Series / Movie Title: ${cleanedTitle}`,
            `Player Tracking ID: ${trackingId}`,
            `Player Name: ${player.username || 'Player'}`,
          ].join('\n'),
        }),
      });

      const payload = (await response.json().catch(() => null)) as {
        success?: boolean;
        message?: string;
      } | null;

      if (!response.ok || (payload && payload.success === false)) {
        throw new Error(payload?.message || `HTTP ${response.status}`);
      }

      setRequestTitle('');
      const awarded = await onSeriesRequestReward();
      setRequestStatusMsg(
        awarded
          ? 'Request sent! +250 Coins added to your wallet.'
          : 'Request sent! Thanks for another suggestion.'
      );
      window.setTimeout(() => setRequestStatusMsg(null), 4000);
    } catch {
      setRequestError('Could not send your request right now. Please try again.');
    } finally {
      setSubmittingRequest(false);
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
    <div className="space-y-5">
      {/* Unified Invite & Social Section (Share on WhatsApp, Copy Personal Link, Follow TikTok) */}
      <section
        id="invite-social-section"
        aria-labelledby="invite-social-heading"
        className="obsidian-card rounded-2xl p-4 sm:p-5 border border-[#D4AF37]/45 bg-gradient-to-br from-[#161209] via-[#100F14] to-[#0A0A0E] shadow-[0_10px_32px_-16px_rgba(212,175,55,0.38)] space-y-3.5 scroll-mt-24"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0">
              <Users className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="invite-social-heading"
                className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]"
              >
                Invite &amp; Social
              </h2>
              <p className="text-[11px] sm:text-xs text-[#A69F91]">
                Earn <strong className="text-[#FCE7A2]">+{REFERRAL_REWARD_COINS.toLocaleString()} Coins</strong> only when a new friend visits your personal link
              </p>
            </div>
          </div>

          <span className="font-mono-num text-xs font-bold text-[#FCE7A2] whitespace-nowrap">
            Friends Joined: {referralsJoinedCount}
          </span>
        </div>

        {/* Personal Referral Link Display */}
        <div className="rounded-xl bg-[#070709] border border-[#D4AF37]/30 px-3 py-2 flex items-center justify-between gap-2">
          <code className="font-mono-num text-[11px] sm:text-xs text-[#FCE7A2] truncate select-all">
            {personalInviteLink}
          </code>
          <span className="text-[10px] font-semibold text-[#8D867A] whitespace-nowrap shrink-0">
            Personal Link
          </span>
        </div>

        {/* Share on WhatsApp + Copy Personal Link (No instant coins on click) */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2.5">
          <a
            href={whatsappShareHref}
            target="_blank"
            rel="noopener noreferrer"
            onClick={onNotifyWhatsappShared}
            className="min-h-[44px] px-4 rounded-xl bg-gradient-to-r from-emerald-500 to-green-600 hover:brightness-110 text-white text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-md shadow-emerald-600/20 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            <MessageCircle className="w-4 h-4 shrink-0" />
            <span>Share on WhatsApp</span>
          </a>

          <button
            type="button"
            onClick={() => void handleCopyInviteLink()}
            className="min-h-[44px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-2 shadow-md shadow-[#D4AF37]/25 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer whitespace-nowrap"
          >
            {copiedInvite ? (
              <>
                <Check className="w-4 h-4 shrink-0" />
                <span>Personal Link Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4 shrink-0" />
                <span>Copy Personal Link</span>
              </>
            )}
          </button>
        </div>

        {/* Follow @faceless_creator_sa on TikTok Row */}
        <div className="pt-2.5 border-t border-white/[0.08] flex flex-wrap items-center justify-between gap-2.5">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-lg bg-amber-500/15 border border-[#D4AF37]/35 flex items-center justify-center text-[#FCE7A2] shrink-0">
              <Share2 className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <div className="text-xs sm:text-sm font-bold text-[#F6F2E9] truncate">
                Follow @faceless_creator_sa on TikTok
              </div>
              <div className="text-[11px] text-[#8D867A] font-mono-num">
                +500 Coins · One-time social bonus
              </div>
            </div>
          </div>

          {boostState.tiktokClaimed ? (
            <span className="min-h-[38px] px-3.5 rounded-full bg-emerald-950/40 border border-emerald-500/40 text-emerald-300 text-xs font-bold inline-flex items-center gap-1.5 shrink-0">
              <Check className="w-3.5 h-3.5" />
              <span>Claimed (+500)</span>
            </span>
          ) : boostState.tiktokVisited ? (
            <button
              type="button"
              disabled={claimingTiktok}
              onClick={() => void handleClaimTiktok()}
              className="min-h-[38px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 hover:brightness-105 cursor-pointer disabled:opacity-60"
            >
              <Coins className="w-3.5 h-3.5" />
              <span>{claimingTiktok ? 'Claiming...' : 'Claim +500 Coins'}</span>
            </button>
          ) : (
            <a
              href={TIKTOK_PROFILE_URL}
              target="_blank"
              rel="noopener noreferrer"
              onClick={onMarkTiktokVisited}
              className="min-h-[38px] px-4 rounded-full gold-gradient-bg text-[#181307] text-xs font-extrabold inline-flex items-center gap-1.5 shrink-0 hover:brightness-105 cursor-pointer"
            >
              <span>Follow TikTok</span>
              <ExternalLink className="w-3.5 h-3.5" />
            </a>
          )}
        </div>
      </section>

      {/* Compact "🎬 Request a Series / Movie" Suggestion Box */}
      <section
        aria-labelledby="request-series-heading"
        className="obsidian-card rounded-2xl p-4 sm:p-5 border border-[#D4AF37]/40 bg-gradient-to-br from-[#141008] via-[#100F14] to-[#0A0A0E] space-y-3"
      >
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5 min-w-0">
            <div className="w-8 h-8 rounded-xl bg-amber-500/15 border border-[#D4AF37]/45 text-[#FCE7A2] flex items-center justify-center shrink-0">
              <Film className="w-4 h-4" />
            </div>
            <div className="min-w-0">
              <h2
                id="request-series-heading"
                className="text-sm sm:text-base font-display font-bold text-[#F6F2E9] leading-tight"
              >
                🎬 Request a Series / Movie
              </h2>
              <p className="text-[11px] text-[#A69F91]">
                Tell us what show to add next
              </p>
            </div>
          </div>

          {boostState.seriesRequestBonusClaimed ? (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono-num font-bold text-emerald-300 bg-emerald-950/40 border border-emerald-500/40 px-2.5 py-0.5 rounded-full whitespace-nowrap">
              <Check className="w-3 h-3" />
              <span>+250 Claimed</span>
            </span>
          ) : (
            <span className="inline-flex items-center gap-1 text-[11px] font-mono-num font-extrabold text-[#181307] gold-gradient-bg px-2.5 py-0.5 rounded-full whitespace-nowrap">
              +250 Coins · 1st Request
            </span>
          )}
        </div>

        <form onSubmit={(e) => void handleSubmitSeriesRequest(e)} className="flex flex-col sm:flex-row gap-2">
          <input
            type="text"
            value={requestTitle}
            onChange={(e) => setRequestTitle(e.target.value)}
            maxLength={120}
            placeholder="Type a drama, anime, or series title you want us to add..."
            aria-label="Series or movie title request"
            className="flex-1 min-h-[42px] px-3.5 py-2 rounded-xl bg-[#070709] border border-[#D4AF37]/30 focus:border-[#D4AF37] text-xs sm:text-sm text-[#F6F2E9] placeholder:text-[#7A746A] focus:outline-none"
          />
          <button
            type="submit"
            disabled={submittingRequest}
            className="min-h-[42px] px-4 rounded-xl gold-gradient-bg text-[#181307] text-xs sm:text-sm font-extrabold inline-flex items-center justify-center gap-1.5 shadow-sm shadow-[#D4AF37]/25 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer disabled:opacity-60 whitespace-nowrap shrink-0"
          >
            {submittingRequest ? (
              <>
                <Loader2 className="w-3.5 h-3.5 animate-spin" />
                <span>Sending...</span>
              </>
            ) : (
              <>
                <Send className="w-3.5 h-3.5" />
                <span>Submit Request</span>
              </>
            )}
          </button>
        </form>

        {requestError && (
          <p className="text-[11px] text-rose-400 font-medium">{requestError}</p>
        )}
        {requestStatusMsg && (
          <p className="text-[11px] text-emerald-300 font-medium">{requestStatusMsg}</p>
        )}
      </section>

      {/* Player Tracking ID Card (Offerwall & Support Tracking) */}
      <section className="obsidian-card rounded-2xl p-5 sm:p-6 border border-[#D4AF37]/45 bg-gradient-to-br from-[#14110A] via-[#0D0D12] to-[#0A0A0E] shadow-[0_12px_36px_-18px_rgba(212,175,55,0.4)] space-y-3.5">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2.5">
            <div className="w-9 h-9 rounded-xl gold-gradient-bg text-[#181307] flex items-center justify-center shrink-0">
              <Fingerprint className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-base sm:text-lg font-display font-bold text-[#F6F2E9] leading-tight">
                Player Tracking ID
              </h1>
              <p className="text-[11px] sm:text-xs text-[#A69F91]">
                Permanent Offerwall &amp; VIP Support account identifier
              </p>
            </div>
          </div>
          <span className="text-[11px] font-semibold uppercase tracking-wider text-[#E8C96D] bg-[#D4AF37]/10 border border-[#D4AF37]/30 px-2.5 py-1 rounded-lg">
            Verified Sync
          </span>
        </div>

        <div className="flex flex-col sm:flex-row items-stretch sm:items-center gap-2.5">
          <div className="flex-1 min-h-[46px] px-3.5 py-2.5 rounded-xl bg-[#070709] border border-[#D4AF37]/30 flex items-center justify-between gap-2 overflow-hidden">
            <span className="text-[11px] uppercase tracking-wider text-[#8D867A] shrink-0">
              ID
            </span>
            <code className="font-mono-num text-sm sm:text-base font-bold tracking-wide text-[#FCE7A2] truncate select-all">
              {trackingId}
            </code>
          </div>
          <button
            type="button"
            onClick={() => void handleCopyTrackingId()}
            className="min-h-[46px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-bold text-xs sm:text-sm inline-flex items-center justify-center gap-2 whitespace-nowrap shrink-0 hover:brightness-105 active:scale-[0.98] transition-all cursor-pointer"
          >
            {copiedId ? (
              <>
                <Check className="w-4 h-4" />
                <span>Copied!</span>
              </>
            ) : (
              <>
                <Copy className="w-4 h-4" />
                <span>Copy ID</span>
              </>
            )}
          </button>
        </div>

        <p className="text-[11px] text-[#8D867A] leading-relaxed">
          Keep this ID handy when completing partner offerwall quests or contacting VIP Support so your virtual Coins credit accurately.
        </p>
      </section>

      {/* Player Name Registration Card */}
      <section className="obsidian-card rounded-2xl p-5 sm:p-6 space-y-4 border border-[#D4AF37]/35">
        <div className="flex flex-wrap items-center justify-between gap-2">
          <div className="flex items-center gap-2">
            <UserPlus className="w-5 h-5 text-[#D4AF37]" />
            <h2 className="text-lg sm:text-xl font-display font-bold text-[#F6F2E9]">
              Player Name Registration
            </h2>
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
          <p className="text-xs text-[#8D867A]">Virtual in-app coins</p>
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
            Sunday Coin Pool: {(poolPrizeZar >= 1000 ? poolPrizeZar : poolPrizeZar * 1000).toLocaleString()} Coins (Top 3)
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

      {/* Legal & Offerwall Compliance Links */}
      <section className="obsidian-card rounded-2xl p-4 sm:p-5 border border-[#D4AF37]/20 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3">
        <div className="space-y-0.5">
          <p className="text-xs font-semibold text-[#E8C96D]">
            Legal &amp; Virtual Coins Policy
          </p>
          <p className="text-[11px] text-[#8D867A]">
            Coins are virtual in-app entertainment points with zero real-money cash value.
          </p>
        </div>
        <div className="flex flex-wrap items-center gap-2.5 shrink-0">
          <button
            type="button"
            onClick={() => setLegalModal('privacy')}
            className="min-h-[38px] px-3.5 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 text-xs font-semibold text-[#FCE7A2] hover:border-[#D4AF37] hover:bg-[#14120B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <ShieldCheck className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Privacy Policy</span>
          </button>
          <button
            type="button"
            onClick={() => setLegalModal('terms')}
            className="min-h-[38px] px-3.5 rounded-xl bg-[#09090D] border border-[#D4AF37]/30 text-xs font-semibold text-[#FCE7A2] hover:border-[#D4AF37] hover:bg-[#14120B] inline-flex items-center gap-1.5 transition-colors cursor-pointer"
          >
            <FileText className="w-3.5 h-3.5 text-[#D4AF37]" />
            <span>Terms of Service</span>
          </button>
        </div>
      </section>

      {/* Privacy Policy & Terms of Service Modal */}
      {legalModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-labelledby="legal-modal-title"
          className="fixed inset-0 z-50 bg-black/80 backdrop-blur-sm flex items-center justify-center p-4"
        >
          <div className="w-full max-w-2xl max-h-[85vh] rounded-2xl bg-[#0D0D12] border border-[#D4AF37]/45 shadow-2xl flex flex-col overflow-hidden">
            {/* Modal Header */}
            <div className="px-5 py-4 border-b border-[#D4AF37]/25 bg-gradient-to-r from-[#17130A] via-[#101016] to-[#0D0D12] flex items-center justify-between gap-3 shrink-0">
              <div className="flex items-center gap-2.5">
                {legalModal === 'privacy' ? (
                  <ShieldCheck className="w-5 h-5 text-[#D4AF37]" />
                ) : (
                  <FileText className="w-5 h-5 text-[#D4AF37]" />
                )}
                <div>
                  <h3
                    id="legal-modal-title"
                    className="text-base sm:text-lg font-display font-bold text-[#F6F2E9]"
                  >
                    {legalModal === 'privacy'
                      ? `${BRAND_NAME} — Privacy Policy`
                      : `${BRAND_NAME} — Terms of Service`}
                  </h3>
                  <p className="text-[11px] text-[#A69F91]">
                    Effective Date: November 2026 · Virtual Entertainment Platform
                  </p>
                </div>
              </div>
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                aria-label="Close legal modal"
                className="w-9 h-9 rounded-xl bg-white/[0.06] hover:bg-white/[0.12] border border-white/[0.1] flex items-center justify-center text-[#E8C96D] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            {/* Scrollable Legal Body */}
            <div className="p-5 sm:p-6 overflow-y-auto space-y-4 text-xs sm:text-sm text-[#D6D0C4] leading-relaxed">
              {legalModal === 'privacy' ? (
                <>
                  <p>
                    Welcome to <strong className="text-[#FCE7A2]">{BRAND_NAME}</strong>. Your privacy matters to us. This Privacy Policy explains what information we collect, how we store your Player Tracking ID and virtual Coin progress, and how third-party advertising and offerwall partners operate within the app.
                  </p>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      1. Player Tracking ID &amp; Account Information
                    </h4>
                    <p>
                      To save your progress and credit virtual Coins accurately, {BRAND_NAME} automatically assigns a permanent <strong className="text-white">Player Tracking ID</strong> (formatted as <code className="text-[#FCE7A2]">DW-XXXXXXXX</code> or your Firebase Authentication UID if signed in). We store your chosen player display name, virtual Coin balance, episode watch progress, check-in streaks, and optional support contact details (such as an email address or WhatsApp handle you voluntarily provide in VIP Support) in browser local storage (<code className="text-[#FCE7A2]">localStorage</code>) and Google Firebase Firestore.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      2. Virtual Coins &amp; Zero Real-Money Cash Value
                    </h4>
                    <p>
                      All Coins earned or tracked on {BRAND_NAME} are strictly <strong className="text-white">virtual in-app entertainment points with zero real-money cash value</strong>. Coins are used solely within the app to unlock drama episodes, climb weekly tournament leaderboards, open Mystery Vaults, spin the Daily Lucky Wheel, and enjoy in-app entertainment features.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      3. Third-Party Ads, Offerwalls &amp; Cookies
                    </h4>
                    <p>
                      {BRAND_NAME} partners with third-party advertising networks and offerwall providers (such as Monetag and verified CPA/offerwall partners) to sponsor free access to short-drama episodes and virtual Coin bonuses. When you visit a partner offer or complete an offerwall quest, your <strong className="text-white">Player Tracking ID</strong> (<code className="text-[#FCE7A2]">subid</code>) and technical signals (such as browser cookies, device/IP metadata, and completion timestamps) may be processed by those partners to attribute your virtual Coin reward and prevent duplicate or fraudulent completions. Third-party partner sites operate under their own privacy policies and cookie practices.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      4. Local Storage, Cookies &amp; Telemetry
                    </h4>
                    <p>
                      We use essential browser storage (<code className="text-[#FCE7A2]">localStorage</code>) and session cookies to remember your Player Tracking ID, saved series (&ldquo;My List&rdquo;), daily spin status, and check-in streak without requiring mandatory registration. Clearing your browser data may reset local-only preferences unless synced to a signed-in Firebase account.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      5. Data Retention &amp; Contact
                    </h4>
                    <p>
                      You may request account review, tracking ID assistance, or deletion of voluntarily submitted support records at any time through the in-app <strong className="text-white">DramaWin VIP Support</strong> chat or by emailing <span className="text-[#FCE7A2]">gerinaicker04@gmail.com</span> with your Player Tracking ID (<code className="text-[#FCE7A2]">{trackingId}</code>).
                    </p>
                  </div>
                </>
              ) : (
                <>
                  <p>
                    By accessing or using <strong className="text-[#FCE7A2]">{BRAND_NAME}</strong>, you agree to be bound by these Terms of Service. Please read them carefully before watching episodes, participating in weekly tournaments, or interacting with partner offers.
                  </p>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      1. Virtual Coins Only — Zero Real-Money Cash Value
                    </h4>
                    <p>
                      {BRAND_NAME} is a free-to-play short-drama streaming and entertainment tournament experience. <strong className="text-white">Coins are virtual in-app entertainment points with zero real-money cash value.</strong> Coins cannot be redeemed, cashed out, sold, transferred, or exchanged for fiat currency, bank transfers, gift cards, or monetary equivalents. Coins exist solely to unlock episodes, reflect weekly leaderboard standings, and access in-app features such as Mystery Vault boxes and the Daily Lucky Spin Wheel.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      2. Eligibility &amp; Fair Play Rules
                    </h4>
                    <p>
                      You must be at least 18 years old (or the age of majority in your jurisdiction) to use third-party offerwalls and partner links. Each user is assigned a unique <strong className="text-white">Player Tracking ID</strong>. Automated bots, scripts, VPN/proxy abuse, emulator farming, falsified offerwall completions, or exploiting timer mechanics are strictly prohibited and may result in Coin adjustments or disqualification from weekly tournament rankings.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      3. Partner Offers, Ads &amp; Offerwalls
                    </h4>
                    <p>
                      Featured Partner Offers and Offerwall quests are operated by independent third-party advertisers. {BRAND_NAME} credits virtual Coins based on verified offerwall postbacks or completed active partner view timers tied to your Player Tracking ID. We are not responsible for the content, availability, or external terms of third-party advertiser websites.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      4. Content &amp; Service Availability
                    </h4>
                    <p>
                      All video streams, episode catalogs, tournament schedules, and virtual Coin reward values may be updated, rotated, or discontinued at any time without prior notice. Weekly tournament rankings reset according to the scheduled tournament cycle.
                    </p>
                  </div>

                  <div className="space-y-1.5">
                    <h4 className="font-display font-bold text-[#E8C96D]">
                      5. Disclaimer &amp; Support
                    </h4>
                    <p>
                      {BRAND_NAME} is provided on an &ldquo;as-is&rdquo; and &ldquo;as-available&rdquo; basis. If you have questions regarding your Player Tracking ID (<code className="text-[#FCE7A2]">{trackingId}</code>), virtual Coin credits, or these Terms, please contact us via the in-app <strong className="text-white">DramaWin VIP Support</strong> chat or email <span className="text-[#FCE7A2]">gerinaicker04@gmail.com</span>.
                    </p>
                  </div>
                </>
              )}
            </div>

            {/* Modal Footer */}
            <div className="px-5 py-3.5 border-t border-white/[0.08] bg-[#09090D] flex items-center justify-end gap-2 shrink-0">
              <button
                type="button"
                onClick={() => setLegalModal(null)}
                className="min-h-[40px] px-5 rounded-xl gold-gradient-bg text-[#181307] font-bold text-xs sm:text-sm hover:brightness-105 cursor-pointer"
              >
                Close
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};
