import React, { useId } from 'react';
import { Sparkles } from 'lucide-react';
import { MYSTERY_CYCLE_BOXES } from '../constants';
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
  cycleReset?: boolean;
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
  voucherModal?: {
    winner: MysteryWinnerRecord;
    newPoolPrizeZar?: number;
  } | null;
  highlightVault?: boolean;
  onOpenMysteryBox: (boxNumber: number) => void;
  onDismissVoucherModal?: () => void;
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
  highlightVault = false,
  onOpenMysteryBox,
}) => {
  const storedOpenedList =
    privateState.openedMysteryBoxesDate === todayKey
      ? privateState.openedMysteryBoxesToday || []
      : [];
  const rawOpenedList = Array.from(
    new Set([...storedOpenedList, ...(openedBoxesOverride || [])])
  );
  const openedTodayList =
    rawOpenedList.length >= MYSTERY_CYCLE_BOXES ? [] : rawOpenedList;

  const activeRevealForToday =
    mysteryReveal && mysteryReveal.dateKey === todayKey ? mysteryReveal : null;

  return (
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
        <div className="flex items-center gap-2">
          <Sparkles className="w-4 h-4 text-[#FCE7A2] drop-shadow-[0_0_8px_rgba(252,231,162,0.75)]" />
          <h2 className="text-lg sm:text-xl font-display font-bold gold-gradient-text">
            Secret Mystery Vault
          </h2>
        </div>

        <div className="shrink-0">
          <span className="inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full bg-[#15120A] border border-[#D4AF37]/40 text-xs font-bold text-[#FCE7A2] shadow-[0_0_14px_rgba(252,231,162,0.2)] font-mono-num">
            <Sparkles className="w-3.5 h-3.5 text-[#FCE7A2]" />
            <span>
              Mystery Cycle: {openedTodayList.length} / {MYSTERY_CYCLE_BOXES} Boxes Opened
            </span>
          </span>
        </div>
      </div>

      {/* Reveal Banner when opening Box #11 (+1,000 Coins Jackpot) or Boxes #1-#10 / #12 (Oops 0 Coins) */}
      {activeRevealForToday && (
        <div
          role="status"
          className={`relative rounded-xl px-4 py-3 border flex flex-wrap items-center justify-between gap-2 text-xs sm:text-sm ${
            activeRevealForToday.kind === 'jackpot'
              ? 'gold-gradient-bg border-[#FFF2C2] text-[#181307] font-bold shadow-lg shadow-[#D4AF37]/30'
              : 'bg-[#17130A] border-[#D4AF37]/45 text-[#FCE7A2]'
          }`}
        >
          {activeRevealForToday.kind === 'jackpot' ? (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <RealisticGoldCoin sizePx={48} emblem="★" className="shrink-0" />
                <div>
                  <p className="text-sm sm:text-base font-extrabold leading-tight">
                    🎉 Jackpot! You found the hidden +1,000 Coins gift!
                  </p>
                  <p className="text-xs font-semibold opacity-90">
                    {activeRevealForToday.cycleReset
                      ? 'All 12 mystery boxes opened — the grid has reset back to Box #1!'
                      : `Box #${activeRevealForToday.boxNumber} Claimed · ${openedTodayList.length}/${MYSTERY_CYCLE_BOXES} Boxes Opened`}
                  </p>
                </div>
              </div>
              <span className="font-mono-num font-black bg-[#181307] text-[#FCE7A2] px-3 py-1 rounded-full text-xs">
                +1,000 Coins!
              </span>
            </div>
          ) : activeRevealForToday.kind === 'oops' || (activeRevealForToday.coins ?? 0) === 0 ? (
            <div className="flex items-center justify-between w-full flex-wrap gap-2">
              <div className="flex items-center gap-2.5">
                <span className="w-9 h-9 rounded-full bg-[#241E11] border border-[#D4AF37]/45 flex items-center justify-center text-lg shrink-0">
                  🥲
                </span>
                <div>
                  <p className="text-sm font-bold text-[#FCE7A2] leading-tight">
                    Oops, sorry! Try the next box 🥲
                  </p>
                  <p className="text-[11px] text-[#BFB7A6]">
                    {activeRevealForToday.cycleReset
                      ? `Box #${activeRevealForToday.boxNumber} Claimed (${MYSTERY_CYCLE_BOXES}/${MYSTERY_CYCLE_BOXES}) — grid reset back to Box #1!`
                      : `Box #${activeRevealForToday.boxNumber} Claimed · ${openedTodayList.length}/${MYSTERY_CYCLE_BOXES} Boxes Opened`}
                  </p>
                </div>
              </div>
              <span className="font-mono-num font-bold bg-black/50 text-[#C4BDB0] px-2.5 py-0.5 rounded-md border border-[#D4AF37]/30">
                0 Coins added
              </span>
            </div>
          ) : (
            <>
              <div className="flex items-center gap-2.5">
                <RealisticGoldCoin sizePx={44} emblem="$" className="shrink-0" />
                <span className="font-semibold">
                  🎁 Gift Box #{activeRevealForToday.boxNumber} Opened! ({openedTodayList.length}/
                  {MYSTERY_CYCLE_BOXES} Boxes Opened)
                </span>
              </div>
              <span className="font-mono-num font-bold bg-black/50 text-[#FCE7A2] px-2.5 py-0.5 rounded-md border border-[#D4AF37]/35">
                +{activeRevealForToday.coins ?? 0} Coins added
              </span>
            </>
          )}
        </div>
      )}

      {/* 3-Column Grid of 12 Glowing Black & Gold Mystery Gift Boxes (#1 through #12) */}
      <div className="relative grid grid-cols-3 gap-3 sm:gap-4">
        {Array.from({ length: MYSTERY_CYCLE_BOXES }, (_, idx) => {
          const boxNumber = idx + 1;
          const isOpenedToday = openedTodayList.includes(boxNumber);
          const isInteractive = !isOpenedToday;
          const shimmerDelay = `${(idx % 4) * 0.45}s`;

          const boxClasses = `group relative min-h-[118px] sm:min-h-[132px] rounded-2xl border p-2.5 sm:p-3 flex flex-col items-center justify-center gap-1.5 overflow-hidden transition-all duration-300 ${
            isOpenedToday
              ? 'bg-gradient-to-b from-[#1A160D] via-[#100E09] to-[#08080A] border-[#D4AF37]/30 opacity-80 cursor-not-allowed'
              : `bg-gradient-to-b from-[#251E0D] via-[#131009] to-[#070708] hover:border-[#FFF0B8] hover:-translate-y-0.5 hover:scale-[1.03] active:scale-[0.97] cursor-pointer ${
                  highlightVault
                    ? 'border-[#FFF0B8] ring-2 ring-[#FCE7A2]/85 mystery-vault-highlight'
                    : 'border-[#D4AF37]/65 shadow-[0_0_24px_rgba(212,175,55,0.22),inset_0_1px_0_rgba(252,231,162,0.45)] hover:shadow-[0_0_34px_rgba(252,231,162,0.42),inset_0_1px_0_rgba(255,248,220,0.7)]'
                }`
          }`;

          const innerContent = (
            <>
              <span
                aria-hidden="true"
                className={`pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_42%,rgba(243,211,122,0.3),transparent_68%)] ${
                  isInteractive ? 'mystery-box-halo' : 'opacity-40'
                }`}
              />

              <span
                aria-hidden="true"
                className="pointer-events-none absolute inset-x-3 top-0 h-px bg-gradient-to-r from-transparent via-[#FFF4CE]/75 to-transparent"
              />

              {isInteractive && (
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

              {isOpenedToday ? (
                <div className="relative z-10 flex flex-col items-center justify-center gap-1.5 text-center px-1">
                  <div className="w-9 h-9 rounded-full bg-[#241E11] border border-[#D4AF37]/40 text-[#FCE7A2] flex items-center justify-center text-base">
                    ✓
                  </div>
                  <span className="text-[10px] font-semibold text-[#FCE7A2] leading-tight">
                    Claimed
                  </span>
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
  );
};
