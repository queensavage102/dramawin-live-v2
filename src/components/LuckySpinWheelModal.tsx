import React, { useEffect, useRef, useState } from 'react';
import { Sparkles, X } from 'lucide-react';
import { DailySpinState, MAX_EXTRA_SPINS_PER_DAY } from '../utils/localState';

export type SpinSliceKind = 'coins' | 'oops' | 'respin';

export interface SpinSliceSpec {
  id: string;
  kind: SpinSliceKind;
  coins: number;
  topText: string;
  bottomText: string;
  label: string;
}

export const LUCKY_SPIN_SLICES: readonly SpinSliceSpec[] = [
  { id: 'coins-100', kind: 'coins', coins: 100, topText: '+100', bottomText: 'COINS', label: '+100 Coins' },
  { id: 'oops', kind: 'oops', coins: 0, topText: 'Oops!', bottomText: 'TRY AGAIN', label: 'Oops! Try Again' },
  { id: 'coins-200', kind: 'coins', coins: 200, topText: '+200', bottomText: 'COINS', label: '+200 Coins' },
  { id: 'respin', kind: 'respin', coins: 0, topText: '🔄 Free', bottomText: 'RESPIN', label: '🔄 Free Respin' },
  { id: 'coins-300', kind: 'coins', coins: 300, topText: '+300', bottomText: 'COINS', label: '+300 Coins' },
  { id: 'coins-500', kind: 'coins', coins: 500, topText: '+500', bottomText: 'COINS', label: '+500 Coins' },
  { id: 'coins-750', kind: 'coins', coins: 750, topText: '+750', bottomText: 'COINS', label: '+750 Coins' },
  { id: 'coins-1000', kind: 'coins', coins: 1000, topText: '+1,000', bottomText: 'COINS', label: '+1,000 Coins' },
] as const;

interface LuckySpinWheelModalProps {
  open: boolean;
  spinState: DailySpinState;
  onSpinWin: (slice: SpinSliceSpec, usedExtraSpin: boolean) => Promise<void> | void;
  onUnlockExtraSpin: () => void;
  onClose: () => void;
}

const SLICE_COUNT = LUCKY_SPIN_SLICES.length;
const SLICE_DEG = 360 / SLICE_COUNT;
const WHEEL_SIZE = 300;
const WHEEL_CENTER = WHEEL_SIZE / 2;
const WHEEL_RADIUS = 132;

function polarToCartesian(cx: number, cy: number, r: number, angleDegFromTop: number) {
  const rad = ((angleDegFromTop - 90) * Math.PI) / 180;
  return {
    x: cx + r * Math.cos(rad),
    y: cy + r * Math.sin(rad),
  };
}

function describeSectorPath(cx: number, cy: number, r: number, startDeg: number, endDeg: number) {
  const start = polarToCartesian(cx, cy, r, endDeg);
  const end = polarToCartesian(cx, cy, r, startDeg);
  const largeArc = endDeg - startDeg <= 180 ? '0' : '1';
  return [
    'M',
    cx,
    cy,
    'L',
    start.x.toFixed(2),
    start.y.toFixed(2),
    'A',
    r,
    r,
    0,
    largeArc,
    0,
    end.x.toFixed(2),
    end.y.toFixed(2),
    'Z',
  ].join(' ');
}

export const LuckySpinWheelModal: React.FC<LuckySpinWheelModalProps> = ({
  open,
  spinState,
  onSpinWin,
  onUnlockExtraSpin,
  onClose,
}) => {
  const [rotationDeg, setRotationDeg] = useState(0);
  const [spinning, setSpinning] = useState(false);
  const [lastSpinResult, setLastSpinResult] = useState<SpinSliceSpec | null>(null);
  const spinTimeoutRef = useRef<number | null>(null);

  useEffect(() => {
    if (!open) {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
        spinTimeoutRef.current = null;
      }
      setSpinning(false);
      setLastSpinResult(null);
    }
  }, [open]);

  useEffect(() => {
    return () => {
      if (spinTimeoutRef.current !== null) {
        window.clearTimeout(spinTimeoutRef.current);
      }
    };
  }, []);

  if (!open) return null;

  const freeSpinsLeft = spinState.freeSpinUsed ? 0 : 1;
  const extraSpinsAvailable = Math.max(
    0,
    spinState.extraSpinsUnlocked - spinState.extraSpinsUsed
  );
  const totalSpinsAvailable = freeSpinsLeft + extraSpinsAvailable;
  const canUnlockMoreExtra = spinState.extraSpinsUnlocked < MAX_EXTRA_SPINS_PER_DAY;
  const isOopsHighlight = lastSpinResult?.kind === 'oops' && !spinning;

  const handleSpinNow = () => {
    if (spinning || totalSpinsAvailable <= 0) return;

    const usedExtraSpin = spinState.freeSpinUsed;
    const chosenIdx = Math.floor(Math.random() * SLICE_COUNT);
    const chosenSlice = LUCKY_SPIN_SLICES[chosenIdx];

    const sliceCenterDeg = chosenIdx * SLICE_DEG + SLICE_DEG / 2;
    // Slight natural offset comfortably inside the 45deg wedge
    const jitter = (Math.random() - 0.5) * 18;
    const desiredMod = (360 - sliceCenterDeg + jitter + 360) % 360;
    const currentMod = ((rotationDeg % 360) + 360) % 360;
    const delta = (desiredMod - currentMod + 360) % 360;
    const nextRotation = rotationDeg + 5 * 360 + delta;

    setLastSpinResult(null);
    setSpinning(true);
    setRotationDeg(nextRotation);

    spinTimeoutRef.current = window.setTimeout(() => {
      spinTimeoutRef.current = null;
      setSpinning(false);
      setLastSpinResult(chosenSlice);
      void onSpinWin(chosenSlice, usedExtraSpin);
    }, 4300);
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-label="Daily Lucky Spin Wheel"
      className="fixed inset-0 z-[92] bg-black/85 backdrop-blur-md flex items-center justify-center p-3.5 sm:p-5 overflow-y-auto"
    >
      <div className="relative w-full max-w-md rounded-3xl bg-gradient-to-b from-[#1B150A] via-[#100D08] to-[#08080A] border border-[#D4AF37]/50 shadow-[0_0_80px_rgba(212,175,55,0.3)] ring-1 ring-inset ring-[#FCE7A2]/15 p-5 sm:p-6 text-center space-y-4 my-auto overflow-hidden">
        <div
          aria-hidden="true"
          className="pointer-events-none absolute -top-24 left-1/2 -translate-x-1/2 w-72 h-44 rounded-full bg-[radial-gradient(circle,rgba(252,231,162,0.24),transparent_70%)] blur-2xl"
        />

        {/* Top-right Skip X button */}
        <button
          type="button"
          disabled={spinning}
          onClick={onClose}
          aria-label="Skip Daily Lucky Spin"
          className="absolute top-3.5 right-3.5 z-20 min-h-[36px] px-3 rounded-xl bg-white/[0.06] border border-white/[0.14] text-xs font-bold text-[#C4BDB0] hover:text-white hover:border-[#D4AF37]/50 inline-flex items-center gap-1 transition-colors cursor-pointer disabled:opacity-40 disabled:cursor-not-allowed"
        >
          <span>Skip</span>
          <X className="w-4 h-4" />
        </button>

        {/* Header */}
        <div className="relative pt-1 space-y-1">
          <div className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-widest text-[#E8C96D]">
            <Sparkles className="w-3.5 h-3.5 text-[#FCE7A2]" />
            <span>Daily Bonus Event</span>
          </div>
          <h2 className="text-2xl sm:text-3xl font-display font-extrabold gold-gradient-text">
            Lucky Spin Wheel
          </h2>
          <p className="text-xs text-[#C4BDB0]">
            Win up to <strong className="text-[#FCE7A2]">+1,000 Coins</strong> or a{' '}
            <strong className="text-[#FCE7A2]">Free Respin</strong> every day!
          </p>
        </div>

        {/* Wheel Stage */}
        <div className="relative mx-auto w-[272px] h-[272px] sm:w-[296px] sm:h-[296px] flex items-center justify-center select-none">
          {/* Top Pointer */}
          <div
            aria-hidden="true"
            className="absolute -top-2 left-1/2 -translate-x-1/2 z-20 drop-shadow-[0_4px_10px_rgba(0,0,0,0.9)]"
          >
            <svg width="32" height="34" viewBox="0 0 32 34">
              <defs>
                <linearGradient id="spinPointerGrad" x1="0" y1="0" x2="0" y2="1">
                  <stop offset="0%" stopColor="#FFFDF0" />
                  <stop offset="45%" stopColor="#FCE7A2" />
                  <stop offset="100%" stopColor="#C48F17" />
                </linearGradient>
              </defs>
              <path
                d="M16 32 L4 6 Q16 0 28 6 Z"
                fill="url(#spinPointerGrad)"
                stroke="#181307"
                strokeWidth="2"
              />
            </svg>
          </div>

          {/* Outer Bezel Glow */}
          <div
            aria-hidden="true"
            className="absolute inset-2 rounded-full border-2 border-[#D4AF37]/50 shadow-[0_0_36px_rgba(212,175,55,0.35)] pointer-events-none"
          />

          {/* Rotating Wheel SVG */}
          <div
            style={{
              transform: `rotate(${rotationDeg}deg)`,
              transition: spinning
                ? 'transform 4.2s cubic-bezier(0.16, 1, 0.3, 1)'
                : 'none',
            }}
            className="w-full h-full will-change-transform"
          >
            <svg
              viewBox={`0 0 ${WHEEL_SIZE} ${WHEEL_SIZE}`}
              className="w-full h-full drop-shadow-[0_12px_28px_rgba(0,0,0,0.85)]"
            >
              <defs>
                <linearGradient id="spinGoldSliceA" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#FFF4C4" />
                  <stop offset="45%" stopColor="#E6BC47" />
                  <stop offset="100%" stopColor="#9E7112" />
                </linearGradient>
                <linearGradient id="spinDarkSliceB" x1="0%" y1="0%" x2="100%" y2="100%">
                  <stop offset="0%" stopColor="#262015" />
                  <stop offset="55%" stopColor="#14110B" />
                  <stop offset="100%" stopColor="#090806" />
                </linearGradient>
                <radialGradient id="spinHubGrad" cx="35%" cy="30%" r="70%">
                  <stop offset="0%" stopColor="#FFFDF2" />
                  <stop offset="45%" stopColor="#F5D062" />
                  <stop offset="100%" stopColor="#8F630A" />
                </radialGradient>
              </defs>

              {/* Outer metallic rim */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r={WHEEL_RADIUS + 10}
                fill="#181307"
                stroke="#D4AF37"
                strokeWidth="3.5"
              />

              {/* 16 Outer Gold Studs */}
              {Array.from({ length: 16 }, (_, i) => {
                const pos = polarToCartesian(WHEEL_CENTER, WHEEL_CENTER, WHEEL_RADIUS + 5, i * 22.5);
                return (
                  <circle
                    key={`stud-${i}`}
                    cx={pos.x}
                    cy={pos.y}
                    r={i % 2 === 0 ? 3.1 : 2.1}
                    fill={i % 2 === 0 ? '#FFF4C4' : '#D4AF37'}
                  />
                );
              })}

              {/* 8 Alternating Gold & Black Slices */}
              {LUCKY_SPIN_SLICES.map((slice, idx) => {
                const startDeg = idx * SLICE_DEG;
                const endDeg = startDeg + SLICE_DEG;
                const midDeg = startDeg + SLICE_DEG / 2;
                const isGoldSlice = idx % 2 === 0;
                const labelPos = polarToCartesian(
                  WHEEL_CENTER,
                  WHEEL_CENTER,
                  WHEEL_RADIUS * 0.68,
                  midDeg
                );

                return (
                  <g key={slice.id}>
                    <path
                      d={describeSectorPath(
                        WHEEL_CENTER,
                        WHEEL_CENTER,
                        WHEEL_RADIUS,
                        startDeg,
                        endDeg
                      )}
                      fill={isGoldSlice ? 'url(#spinGoldSliceA)' : 'url(#spinDarkSliceB)'}
                      stroke="#D4AF37"
                      strokeWidth="1.7"
                    />
                    <g
                      transform={`translate(${labelPos.x.toFixed(1)}, ${labelPos.y.toFixed(
                        1
                      )}) rotate(${midDeg})`}
                    >
                      <text
                        x="0"
                        y="-3"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize={slice.kind === 'coins' ? '13.5' : '11.5'}
                        fontWeight="900"
                        fontFamily={
                          slice.kind === 'coins'
                            ? 'ui-monospace, SFMono-Regular, Menlo, monospace'
                            : 'inherit'
                        }
                        fill={
                          isGoldSlice
                            ? '#181307'
                            : slice.kind === 'respin'
                              ? '#FFF4C4'
                              : '#FCE7A2'
                        }
                      >
                        {slice.topText}
                      </text>
                      <text
                        x="0"
                        y="10.5"
                        textAnchor="middle"
                        dominantBaseline="middle"
                        fontSize="7.5"
                        fontWeight="800"
                        letterSpacing="0.7"
                        fill={isGoldSlice ? '#3B2804' : '#D4AF37'}
                      >
                        {slice.bottomText}
                      </text>
                    </g>
                  </g>
                );
              })}

              {/* Center Gold Hub */}
              <circle
                cx={WHEEL_CENTER}
                cy={WHEEL_CENTER}
                r="26"
                fill="url(#spinHubGrad)"
                stroke="#FFF7D6"
                strokeWidth="2.5"
              />
              <text
                x={WHEEL_CENTER}
                y={WHEEL_CENTER + 1}
                textAnchor="middle"
                dominantBaseline="middle"
                fontSize="11"
                fontWeight="900"
                letterSpacing="1"
                fill="#181307"
              >
                SPIN
              </text>
            </svg>
          </div>
        </div>

        {/* Result Status Banner */}
        {lastSpinResult !== null && !spinning && (
          <div
            role="status"
            className={`rounded-2xl px-4 py-2.5 text-center space-y-0.5 border ${
              lastSpinResult.kind === 'oops'
                ? 'bg-[#1D170E] border-[#D4AF37]/45'
                : 'bg-gradient-to-r from-[#FCE7A2]/15 via-[#D4AF37]/20 to-[#FCE7A2]/15 border-[#FCE7A2]/50'
            }`}
          >
            {lastSpinResult.kind === 'respin' ? (
              <>
                <p className="text-sm font-extrabold text-[#FCE7A2]">
                  🎉 Lucky! You won 1 Free Respin!
                </p>
                <p className="text-[11px] text-[#D6CEBF]">
                  +1 Free Spin granted — spin again right away!
                </p>
              </>
            ) : lastSpinResult.kind === 'oops' ? (
              <>
                <p className="text-sm font-extrabold text-[#FCE7A2]">
                  😅 Oops! No coins this time—unlock an extra spin below!
                </p>
                <p className="text-[11px] text-[#B8B0A2]">0 Coins added</p>
              </>
            ) : (
              <>
                <p className="text-sm font-extrabold text-[#FCE7A2]">
                  🎉 You won +{lastSpinResult.coins.toLocaleString()} Coins!
                </p>
                <p className="text-[11px] text-[#D6CEBF]">
                  Added straight to your tournament wallet.
                </p>
              </>
            )}
          </div>
        )}

        {/* Action Controls */}
        <div className="relative space-y-2.5 pt-1">
          {totalSpinsAvailable > 0 && (
            <button
              type="button"
              disabled={spinning}
              onClick={handleSpinNow}
              className="w-full min-h-[52px] px-5 rounded-2xl bg-gradient-to-r from-[#FCE7A2] via-[#E8C96D] to-[#D4AF37] text-[#181307] font-extrabold text-sm sm:text-base shadow-[0_0_28px_rgba(212,175,55,0.5)] hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-65 disabled:cursor-wait"
            >
              <span>
                {spinning
                  ? '🎡 Spinning the Wheel...'
                  : freeSpinsLeft > 0
                    ? '🎡 Spin Free Wheel Now!'
                    : `🎡 Spin Extra Wheel (${extraSpinsAvailable} Left)`}
              </span>
            </button>
          )}

          {(totalSpinsAvailable === 0 || isOopsHighlight) && canUnlockMoreExtra && (
            <button
              type="button"
              disabled={spinning}
              onClick={onUnlockExtraSpin}
              className={`w-full min-h-[52px] px-4 rounded-2xl bg-gradient-to-r from-[#FCE7A2] via-[#E8C96D] to-[#D4AF37] text-[#181307] font-extrabold text-sm hover:brightness-105 active:scale-[0.98] transition-all inline-flex items-center justify-center gap-2 cursor-pointer disabled:opacity-50 ${
                isOopsHighlight
                  ? 'ring-2 ring-[#FFF6D6] shadow-[0_0_40px_rgba(252,231,162,0.9)] animate-pulse'
                  : 'shadow-[0_0_30px_rgba(212,175,55,0.55)]'
              }`}
            >
              <span>🎡 Unlock Extra Spin (Partner Offer)</span>
            </button>
          )}

          {totalSpinsAvailable === 0 && !canUnlockMoreExtra && (
            <div className="rounded-2xl bg-white/[0.04] border border-white/[0.1] px-4 py-3 text-xs font-semibold text-[#C4BDB0]">
              All daily spins claimed (1 Free + 3 Extra)! Come back tomorrow for a fresh Free Spin.
            </div>
          )}

          <p className="text-[11px] font-mono-num text-[#A69F91]">
            Free Spin: {freeSpinsLeft}/1 · Extra Partner Spins Unlocked:{' '}
            {spinState.extraSpinsUnlocked}/{MAX_EXTRA_SPINS_PER_DAY}
          </p>
        </div>
      </div>
    </div>
  );
};
