import React, { useId, useState } from 'react';
import { Sparkles, Check, Copy, X, Trophy, PartyPopper, RotateCcw } from 'lucide-react';
import { BRAND_NAME, R3_BOOST_ZAR, R3_MYSTERY_CYCLE_ADS } from '../constants';
import { MysteryWinnerRecord, PlayerPrivate } from '../types';
import { RealisticGoldCoin } from './RealisticGoldCoin';

export interface BoxOutcome {
  boxNumber: number;
  kind: 'airtime' | 'coins' | 'jackpot' | 'oops';
  coins: number;
  voucherCode?: string;
}

export interface MysteryRevealState {
  dateKey: string;
  boxNumber: number;
  kind: 'airtime' | 'coins' | 'jackpot' | 'oops';
  coins?: number;
  winnerRecord?: MysteryWinnerRecord;
  newPoolPrizeZar?: number;
}

interface MysteryVaultCardProps {
  privateState: PlayerPrivate;
  todayKey: string;
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
  highlightVault?: boolean;
  onOpenMysteryBox: (boxNumber: number) => void;
  onDismissVoucherModal: () => void;
}

export const Gold3DGiftIcon: React.FC<{
  unlocked: boolean;
  opened?: boolean;
  className?: string;
}> = ({ unlocked, opened, className = 'w-12 h-12 sm:w-14 sm:h-14' }) => {
  const uid = useId().replace(/:/g, '');
  const active = unlocked || opened;

  return (
    <svg
      viewBox="0 0 64 64"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={`${className} transition-transform duration-300 ${
        active
          ? 'group-hover:scale-110 group-hover:-translate-y-0.5 drop-shadow-[0_8px_18px_rgba(243,211,122,0.55)]'
          : 'drop-shadow-[0_4px_10px_rgba(212,175,55,0.22)]'
      }`}
      aria-hidden="true"
    >
      <defs>
        <linearGradient id={`front-${uid}`} x1="8" y1="26" x2="34" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? '#FFF1B8' : '#C9AC63'} />
          <stop offset="48%" stopColor={active ? '#E2B844' : '#947838'} />
          <stop offset="100%" stopColor={active ? '#9B6F12' : '#57441B'} />
        </linearGradient>
        <linearGradient id={`side-${uid}`} x1="32" y1="26" x2="56" y2="58" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? '#C99825' : '#7D632C'} />
          <stop offset="100%" stopColor={active ? '#644407' : '#3A2C11'} />
        </linearGradient>
        <linearGradient id={`lid-${uid}`} x1="6" y1="14" x2="58" y2="29" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? '#FFF9DC' : '#DFC47B'} />
          <stop offset="50%" stopColor={active ? '#F2CE63' : '#AF8D3E'} />
          <stop offset="100%" stopColor={active ? '#B0821B' : '#6A511D'} />
        </linearGradient>
        <linearGradient id={`ribbon-${uid}`} x1="22" y1="10" x2="42" y2="56" gradientUnits="userSpaceOnUse">
          <stop offset="0%" stopColor={active ? '#FFFFFF' : '#F3DC99'} />
          <stop offset="35%" stopColor={active ? '#FFF0B4' : '#D5B257'} />
          <stop offset="100%" stopColor={active ? '#C6921E' : '#7E6122'} />
        </linearGradient>
      </defs>

      <ellipse cx="32" cy="57.5" rx="21" ry="3.8" fill="black" fillOpacity="0.6" />

      <path
        d="M11 28L32 34.8V56L11 49.2V28Z"
        fill={`url(#front-${uid})`}
        stroke={active ? '#FFF4C8' : '#B89643'}
        strokeOpacity="0.55"
        strokeWidth="1"
      />
      <path
        d="M53 28L32 34.8V56L53 49.2V28Z"
        fill={`url(#side-${uid})`}
        stroke={active ? '#E8C96D' : '#856B2F'}
        strokeOpacity="0.45"
        strokeWidth="1"
      />

      <path d="M18.8 30.5L23.8 32.1V53.3L18.8 51.7V30.5Z" fill={`url(#ribbon-${uid})`} />
      <path d="M45.2 30.5L40.2 32.1V53.3L45.2 51.7V30.5Z" fill={`url(#ribbon-${uid})`} fillOpacity="0.88" />

      <path
        d="M7.5 21.5L32 14L56.5 21.5L32 29.2L7.5 21.5Z"
        fill={`url(#lid-${uid})`}
        stroke={active ? '#FFFBE6' : '#CBB06B'}
        strokeOpacity="0.7"
        strokeWidth="1"
      />
      <path d="M7.5 21.5L32 29.2V35L7.5 27.3V21.5Z" fill={`url(#front-${uid})`} />
      <path d="M56.5 21.5L32 29.2V35L56.5 27.3V21.5Z" fill={`url(#side-${uid})`} />

      <path d="M18 18.2L22.6 16.8L46.2 24.4L41.6 25.8L18 18.2Z" fill={`url(#ribbon-${uid})`} fillOpacity="0.85" />
      <path d="M46 18.2L41.4 16.8L17.8 24.4L22.4 25.8L46 18.2Z" fill={`url(#ribbon-${uid})`} fillOpacity="0.85" />

      <path
        d="M32 18.2C27.2 10.6 17.2 10.2 17.8 16C18.4 20.4 25.8 21 32 18.2Z"
        fill={`url(#ribbon-${uid})`}
        stroke={active ? '#FFFFFF' : '#DFC47B'}
        strokeOpacity="0.65"
        strokeWidth="0.9"
      />
      <path
        d="M32 18.2C36.8 10.6 46.8 10.2 46.2 16C45.6 20.4 38.2 21 32 18.2Z"
        fill={`url(#ribbon-${uid})`}
        stroke={active ? '#FFFFFF' : '#DFC47B'}
        strokeOpacity="0.65"
        strokeWidth="0.9"
      />
      <circle
        cx="32"
        cy="18.2"
        r="3.2"
        fill={active ? '#FFFDF2' : '#E7CA7E'}
        stroke={active ? '#D4AF37' : '#8E6F2B'}
        strokeWidth="0.8"
      />

      {active && (
        <>
          <path
            d="M52 10L53.1 12.9L56 14L53.1 15.1L52 18L50.9 15.1L48 14L50.9 12.9L52 10Z"
            fill="#FFF7D6"
          />
          <circle cx="13" cy="14" r="1.4" fill="#FCE7A2" fillOpacity="0.9" />
        </>
      )}
    </svg>
  );
};

export const MysteryVaultCard: React.FC<MysteryVaultCardProps> = ({
  todayKey,
  privateState,
  openedBoxesOverride,
  mysteryReveal,
  pendingGiftBox = null,
  voucherModal,
  highlightVault = false,
  onOpenMysteryBox,
  onDismissVoucherModal,
}) => {
  const [copied, setCopied] = useState(false);

  const storedOpenedList =
    privateState.openedMysteryBoxesDate === todayKey
      ? privateState.openedMysteryBoxesToday || []
      : [];
  const rawOpenedList = Array.from(
    new Set([...storedOpenedList, ...(openedBoxesOverride || [])])
  );
  const openedTodayList =
    rawOpenedList.length >= R3_MYSTERY_CYCLE_ADS ? [] : rawOpenedList;

  const activeRevealForToday =
    mysteryReveal && mysteryReveal.dateKey === todayKey ? mysteryReveal : null;

  const handleCopyVoucher = async () => {
    if (!voucherModal) return;
    const { winner } = voucherModal;
    const text = `${BRAND_NAME} R${R3_BOOST_ZAR} Progress Bar Boost Winner!\nPlayer: ${winner.username}\nVoucher: ${winner.voucherCode}\nContact: ${winner.contact}`;
    try {
      await navigator.clipboard.writeText(text);
      setCopied(true);
      setTimeout(() => setCopied(false), 2500);
    } catch {
      // Fallback ignored if clipboard blocked
    }
  };

  return (
    <>
      <section
        className={`relative overflow-hidden rounded-2xl p-5 sm:p-7 space-y-5 bg-gradient-to-b from-[#17130A] via-[#0F0D09] to-[#08080A] border transition-all duration-500 ${
          highlightVault
            ? 'border-[#FFF0B8] ring-2 ring-[#FCE7A2]/80 shadow-[0_0_65px_rgba(252,231,162,0.42)]'
            : 'border-[#D4AF37]/35 shadow-[0_0_45px_rgba(212,175,55,0.12)] ring-1 ring-inset ring-[#FCE7A2]/10'
        }`}
      >
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-[85%] h-48 rounded-full bg-[radial-gradient(ellipse_at_center,rgba(243,211,122,0.18),transparent_70%)] blur-xl"
        />

        <div className="relative flex flex-col sm:flex-row sm:items-center justify-between gap-3">
          <div className="space-y-1">
            <div className="flex items-center gap-2">
              <Sparkles className="w-4 h-4 text-[#FCE7A2] drop-shadow-[0_0_8px_rgba(252,231,162,0.75)]" />
              <h2 className="text-lg sm:text-xl font-display font-bold gold-gradient-text">
                Secret Mystery Vault
              </h2>
            </div>
            <p className="text-xs sm:text-sm text-[#BFB7A6]">
              Tap any glowing gift box to watch a 20s sponsor ad and earn bonus coins. Claim {R3_MYSTERY_CYCLE_ADS} ads to unlock the R{R3_BOOST_ZAR} Progress Bar Boost (+1,000 Coins) — then the grid auto-resets to Box #1!
            </p>
          </div>

          <div className="shrink-0">
            {openedTodayList.length === 0 ? (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCE7A2] drop-shadow-[0_0_10px_rgba(252,231,162,0.45)] font-mono-num">
                <RotateCcw className="w-4 h-4 text-[#FCE7A2]" />
                <span>New {R3_MYSTERY_CYCLE_ADS}-Ad Cycle Ready • Box #1+</span>
              </span>
            ) : (
              <span className="inline-flex items-center gap-1.5 text-xs font-bold text-[#FCE7A2] drop-shadow-[0_0_10px_rgba(252,231,162,0.45)] font-mono-num">
                <Sparkles className="w-4 h-4 text-[#FCE7A2]" />
                <span>
                  Ad Cycle: {openedTodayList.length} / {R3_MYSTERY_CYCLE_ADS} • R{R3_BOOST_ZAR} Boost
                </span>
              </span>
            )}
          </div>
        </div>

        {/* Pending 20-Second Sponsor Ad Banner + Progress Bar (Strictly inside Mystery Vault modal/card) */}
        {pendingGiftBox && (
          <div
            role="status"
            className="relative overflow-hidden rounded-xl px-4 py-3 border border-amber-400/65 bg-gradient-to-r from-[#2A200A] via-[#17130A] to-[#2A200A] text-[#FCE7A2] space-y-2.5 text-xs sm:text-sm shadow-[0_0_24px_rgba(251,191,36,0.25)]"
          >
            <div className="flex flex-wrap items-center justify-between gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-2.5 h-2.5 rounded-full bg-amber-400 animate-ping shrink-0" />
                <span className="font-bold">
                  Sponsor Ad Active — Unlocking Gift Box #{pendingGiftBox.boxNumber}...
                </span>
              </div>
              <span className="font-mono-num font-extrabold bg-black/60 text-amber-300 px-3 py-1 rounded-full border border-amber-400/45">
                {pendingGiftBox.secondsLeft}s remaining
              </span>
            </div>
            <div className="w-full h-2 rounded-full bg-black/60 border border-amber-400/30 overflow-hidden">
              <div
                className="h-full bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 shadow-[0_0_12px_rgba(251,191,36,0.9)] transition-[width] duration-75 ease-linear"
                style={{
                  width: `${Math.min(100, Math.max(0, pendingGiftBox.progress ?? 0))}%`,
                }}
              />
            </div>
          </div>
        )}

        {/* Result Banner for latest opened box (Resolved ONLY after 20-second ad timer completes) */}
        {!pendingGiftBox && activeRevealForToday && (
          <div
            role="status"
            className={`relative rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm ${
              activeRevealForToday.kind === 'airtime' || activeRevealForToday.kind === 'jackpot'
                ? 'gold-gradient-bg border-[#FFF2C2] text-[#181307] font-bold shadow-lg shadow-[#D4AF37]/30'
                : activeRevealForToday.kind === 'oops'
                  ? 'bg-[#18141C] border-white/20 text-zinc-200'
                  : 'bg-[#17130A] border-[#D4AF37]/45 text-[#FCE7A2]'
            }`}
          >
            {activeRevealForToday.kind === 'airtime' ? (
              <span>
                🎉 YOU WON CONGRATULATIONS! 🎉 Box #{activeRevealForToday.boxNumber} unlocked an R{R3_BOOST_ZAR} Progress Bar Boost (+1,000 Coins)!
              </span>
            ) : activeRevealForToday.kind === 'jackpot' ? (
              <div className="flex items-center gap-2.5">
                <RealisticGoldCoin sizePx={48} emblem="★" className="shrink-0" />
                <span>
                  🎉 11th Ad Complete! R{R3_BOOST_ZAR} Progress Bar Boost (+1,000 Bonus Coins) Unlocked — Grid Reset to Box #1! Tap any box to repeat!
                </span>
              </div>
            ) : activeRevealForToday.kind === 'oops' ? (
              <div className="flex items-center gap-2.5">
                <span className="text-lg shrink-0">🎁</span>
                <span className="font-semibold">
                  Oops, sorry try next box 🥲 (Box #{activeRevealForToday.boxNumber})
                </span>
              </div>
            ) : (
              <>
                <div className="flex items-center gap-2.5">
                  <RealisticGoldCoin sizePx={48} emblem="$" className="shrink-0" />
                  <span className="font-semibold">
                    🎁 Gift Box #{activeRevealForToday.boxNumber} Unlocked! Keep watching ads ({openedTodayList.length}/{R3_MYSTERY_CYCLE_ADS}) for the R{R3_BOOST_ZAR} Boost!
                  </span>
                </div>
                {activeRevealForToday.coins ? (
                  <span className="font-mono-num font-bold bg-black/50 text-[#FCE7A2] px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35">
                    +{activeRevealForToday.coins} Coins added
                  </span>
                ) : null}
              </>
            )}
          </div>
        )}

        {/* 3x4 Grid of 12 Glowing Black & Gold Mystery Gift Boxes */}
        <div className="relative grid grid-cols-3 sm:grid-cols-4 gap-3 sm:gap-4">
          {Array.from({ length: 12 }, (_, idx) => {
            const boxNumber = idx + 1;
            const isOpenedToday = openedTodayList.includes(boxNumber);
            const isPendingBox = pendingGiftBox?.boxNumber === boxNumber;
            const isLatestPicked = activeRevealForToday?.boxNumber === boxNumber;
            const isWonR3 = isLatestPicked && activeRevealForToday?.kind === 'airtime';
            const isWonJackpot = isLatestPicked && activeRevealForToday?.kind === 'jackpot';
            const isOopsLatest = isLatestPicked && activeRevealForToday?.kind === 'oops';
            const isWinningTile = isWonR3 || isWonJackpot;
            const isInteractive = !pendingGiftBox && !isOpenedToday;
            const shimmerDelay = `${(idx % 4) * 0.45}s`;

            const boxClasses = `group relative min-h-[118px] sm:min-h-[132px] rounded-2xl border p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 overflow-hidden transition-all duration-300 ${
              isPendingBox
                ? 'bg-gradient-to-b from-[#3A2D0E] via-[#1C1608] to-[#08080A] border-amber-300 ring-2 ring-amber-300/70 shadow-[0_0_28px_rgba(251,191,36,0.45)] cursor-wait'
                : isOpenedToday
                  ? isWinningTile
                    ? 'bg-gradient-to-b from-[#45330E] via-[#241A07] to-[#0D0A04] border-[#FFF5C8] shadow-[0_0_34px_rgba(252,231,162,0.55),inset_0_1px_0_rgba(255,250,224,0.7)]'
                    : 'bg-gradient-to-b from-[#1A160D] via-[#100E09] to-[#08080A] border-[#D4AF37]/30 opacity-80 cursor-not-allowed'
                  : isInteractive
                    ? `bg-gradient-to-b from-[#251E0D] via-[#131009] to-[#070708] hover:border-[#FFF0B8] hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${
                        highlightVault
                          ? 'border-[#FFF0B8] ring-2 ring-[#FCE7A2]/85 mystery-vault-highlight'
                          : 'border-[#D4AF37]/65 shadow-[0_0_24px_rgba(212,175,55,0.22),inset_0_1px_0_rgba(252,231,162,0.45)] hover:shadow-[0_0_34px_rgba(252,231,162,0.42),inset_0_1px_0_rgba(255,248,220,0.7)]'
                      }`
                    : 'bg-gradient-to-b from-[#1A160D] via-[#100E09] to-[#08080A] border-[#D4AF37]/30 opacity-65 cursor-not-allowed'
            }`;

            const innerContent = (
              <>
                <span
                  aria-hidden="true"
                  className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(243,211,122,0.3),transparent_68%)] ${
                    isInteractive || isWinningTile ? 'mystery-box-halo' : 'opacity-40'
                  }`}
                />

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#FFF4CE]/75 to-transparent"
                />

                {(isInteractive || isWinningTile) && (
                  <span
                    aria-hidden="true"
                    style={{ animationDelay: shimmerDelay }}
                    className="mystery-box-shimmer pointer-events-none absolute inset-y-0 left-0 w-1/2 bg-gradient-to-r from-transparent via-[#FFF6D4]/25 to-transparent"
                  />
                )}

                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute top-2 left-2 w-2 h-2 border-t border-l border-[#FCE7A2]/45 rounded-tl-[2px]"
                />
                <span
                  aria-hidden="true"
                  className="pointer-events-none absolute bottom-2 right-2 w-2 h-2 border-b border-r border-[#FCE7A2]/45 rounded-br-[2px]"
                />

                {isPendingBox ? (
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 text-center px-1">
                    <div className="animate-pulse">
                      <Gold3DGiftIcon unlocked className="w-10 h-10 sm:w-12 sm:h-12" />
                    </div>
                    <span className="font-mono-num px-2 py-0.5 rounded-full bg-amber-400 text-zinc-950 text-[10px] font-black leading-tight">
                      {pendingGiftBox.secondsLeft}s
                    </span>
                    <span className="font-mono-num text-[11px] font-bold text-[#FCE7A2]">
                      #{boxNumber}
                    </span>
                  </div>
                ) : isOpenedToday ? (
                  <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 text-center px-1">
                    {isWonR3 ? (
                      <>
                        <div className="w-10 h-10 rounded-full gold-gradient-bg text-[#181307] flex items-center justify-center shadow-[0_0_18px_rgba(252,231,162,0.75)]">
                          <Trophy className="w-5 h-5" />
                        </div>
                        <span className="gold-gradient-bg text-[#181307] px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide shadow-md leading-tight">
                          🎉 R{R3_BOOST_ZAR} BOOST!
                        </span>
                      </>
                    ) : isWonJackpot ? (
                      <>
                        <div className="w-10 h-10 rounded-full gold-gradient-bg text-[#181307] flex items-center justify-center shadow-[0_0_18px_rgba(252,231,162,0.75)] text-lg">
                          🎁
                        </div>
                        <span className="gold-gradient-bg text-[#181307] px-2 py-0.5 rounded-full text-[10px] font-extrabold tracking-wide shadow-md leading-tight">
                          +1,000 Coins!
                        </span>
                      </>
                    ) : isOopsLatest ? (
                      <>
                        <div className="w-9 h-9 rounded-full bg-[#241E11] border border-white/15 text-zinc-300 flex items-center justify-center text-base">
                          🥲
                        </div>
                        <span className="text-[10px] font-semibold text-zinc-400 leading-tight">
                          Next Box
                        </span>
                      </>
                    ) : (
                      <>
                        <div className="w-9 h-9 rounded-full bg-[#241E11] border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center text-base">
                          ✓
                        </div>
                        <span className="text-[10px] font-semibold text-[#FCE7A2] leading-tight">
                          Claimed
                        </span>
                      </>
                    )}
                    <span className="font-mono-num text-[11px] font-bold text-[#FCE7A2]">
                      #{boxNumber}
                    </span>
                  </div>
                ) : (
                  <>
                    <div className="relative z-10">
                      <Gold3DGiftIcon unlocked={isInteractive} />
                    </div>

                    <div className="relative z-10 flex items-center gap-1">
                      <span className="font-mono-num text-xs font-bold tracking-wider text-[#FCE7A2]">
                        #{boxNumber}
                      </span>
                    </div>
                  </>
                )}
              </>
            );

            if (isInteractive) {
              return (
                <button
                  key={boxNumber}
                  type="button"
                  onClick={() => onOpenMysteryBox(boxNumber)}
                  aria-label={`Open Mystery Gift Box ${boxNumber}`}
                  className={boxClasses}
                >
                  {innerContent}
                </button>
              );
            }

            return (
              <button
                key={boxNumber}
                type="button"
                disabled
                aria-label={`Mystery Gift Box ${boxNumber}`}
                className={boxClasses}
              >
                {innerContent}
              </button>
            );
          })}
        </div>
      </section>

      {/* Bold Celebration Popup when Winning the R3 Progress Bar Boost */}
      {voucherModal && (
        <div
          role="dialog"
          aria-modal="true"
          aria-label="YOU WON CONGRATULATIONS!"
          className="fixed inset-0 z-[85] bg-black/85 backdrop-blur-md flex items-center justify-center p-4"
        >
          <div className="obsidian-card rounded-2xl max-w-md w-full p-6 space-y-5 border-2 border-[#FCE7A2]/80 shadow-[0_0_80px_rgba(243,211,122,0.4)] text-center relative animate-[pulse_2.2s_ease-in-out_1]">
            <button
              type="button"
              onClick={onDismissVoucherModal}
              aria-label="Close victory modal"
              className="absolute top-4 right-4 min-h-[40px] min-w-[40px] rounded-lg border border-white/10 flex items-center justify-center text-[#A69F91] hover:text-[#F6F2E9]"
            >
              <X className="w-4 h-4" />
            </button>

            <div className="w-16 h-16 rounded-2xl gold-gradient-bg text-[#181307] mx-auto flex items-center justify-center shadow-lg shadow-[#D4AF37]/40 animate-bounce">
              <PartyPopper className="w-8 h-8" />
            </div>

            <div className="space-y-2">
              <p className="text-xs font-semibold tracking-[0.2em] uppercase text-[#E8C96D]">
                R{R3_BOOST_ZAR} Progress Bar Boost Unlocked
              </p>
              <h3 className="text-2xl sm:text-3xl font-display font-bold gold-gradient-text leading-tight">
                YOU WON CONGRATULATIONS! 🎉
              </h3>
              <p className="text-xs sm:text-sm text-[#DDD4C4]">
                Box #{voucherModal.winner.boxNumber} unlocked an R{R3_BOOST_ZAR} Progress Bar Boost (+1,000 Coins) for{' '}
                <strong className="text-[#F6F2E9]">{voucherModal.winner.username}</strong>
                {voucherModal.newPoolPrizeZar
                  ? ` and boosted the Sunday Prize Pool to R${voucherModal.newPoolPrizeZar}!`
                  : '!'}
              </p>
            </div>

            <div className="rounded-xl bg-[#070709] border border-[#D4AF37]/45 p-4 space-y-1">
              <p className="text-[11px] uppercase tracking-widest text-[#8D867A]">
                R{R3_BOOST_ZAR} Boost Winner Voucher Code
              </p>
              <p className="font-mono-num text-xl font-bold gold-gradient-text tracking-wider">
                {voucherModal.winner.voucherCode}
              </p>
              <p className="text-[11px] text-[#A69F91]">
                Delivery contact: {voucherModal.winner.contact}
              </p>
            </div>

            <div className="flex flex-col sm:flex-row gap-2.5">
              <button
                type="button"
                onClick={() => void handleCopyVoucher()}
                className="flex-1 min-h-[46px] px-4 rounded-xl gold-gradient-bg text-[#181307] font-bold text-sm inline-flex items-center justify-center gap-2 hover:brightness-105"
              >
                {copied ? <Check className="w-4 h-4" /> : <Copy className="w-4 h-4" />}
                <span>{copied ? 'Copied Prize Details!' : 'Copy Voucher & Claim'}</span>
              </button>
              <button
                type="button"
                onClick={onDismissVoucherModal}
                className="min-h-[46px] px-4 rounded-xl border border-white/[0.12] text-sm font-medium text-[#C4BDB0] hover:bg-white/[0.04]"
              >
                Done
              </button>
            </div>
          </div>
        </div>
      )}
    </>
  );
};
