import React, { useEffect, useState } from 'react';
import { BRAND_NAME } from '../constants';
import { RealisticGoldCoin } from './RealisticGoldCoin';

interface VipSplashScreenProps {
  onComplete: () => void;
}

const SPLASH_DURATION_MS = 2500;

interface FloatingCoinSpec {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  emblem: '$' | '★';
}

// Positioned strictly along outer edges (48px-64px) so no coin ever crosses the center text layer
const FLOATING_COINS: FloatingCoinSpec[] = [
  { id: 1, leftPct: 2, topPct: 80, sizePx: 64, delayMs: 0, durationMs: 3400, emblem: '$' },
  { id: 2, leftPct: 6, topPct: 54, sizePx: 52, delayMs: 420, durationMs: 3600, emblem: '★' },
  { id: 3, leftPct: 3, topPct: 26, sizePx: 56, delayMs: 800, durationMs: 3200, emblem: '$' },
  { id: 4, leftPct: 10, topPct: 10, sizePx: 48, delayMs: 250, durationMs: 3500, emblem: '★' },
  { id: 5, leftPct: 82, topPct: 12, sizePx: 48, delayMs: 620, durationMs: 3350, emblem: '$' },
  { id: 6, leftPct: 86, topPct: 30, sizePx: 58, delayMs: 180, durationMs: 3250, emblem: '★' },
  { id: 7, leftPct: 84, topPct: 58, sizePx: 54, delayMs: 520, durationMs: 3550, emblem: '$' },
  { id: 8, leftPct: 86, topPct: 82, sizePx: 64, delayMs: 90, durationMs: 3300, emblem: '★' },
  { id: 9, leftPct: 16, topPct: 88, sizePx: 50, delayMs: 340, durationMs: 3150, emblem: '★' },
  { id: 10, leftPct: 72, topPct: 88, sizePx: 52, delayMs: 710, durationMs: 3250, emblem: '$' },
];

const LuxuryMetallicCrown: React.FC = () => (
  <div className="relative flex items-center justify-center">
    {/* Soft pulsing radial golden light behind the crown */}
    <div
      aria-hidden="true"
      className="vip-crown-halo pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(255,236,158,0.48)_0%,rgba(212,175,55,0.22)_42%,transparent_72%)] blur-xl"
    />
    <svg
      width={110}
      height={110}
      viewBox="0 0 120 120"
      className="relative z-10 w-[110px] h-[110px] drop-shadow-[0_0_28px_rgba(252,231,162,0.85)]"
      aria-hidden="true"
    >
      <defs>
        <linearGradient id="vipCrownMainGold" x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFDF0" />
          <stop offset="28%" stopColor="#FCE7A2" />
          <stop offset="58%" stopColor="#D4AF37" />
          <stop offset="85%" stopColor="#A67814" />
          <stop offset="100%" stopColor="#6D4B06" />
        </linearGradient>
        <linearGradient id="vipCrownBackGold" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="#D4AF37" />
          <stop offset="55%" stopColor="#8F650D" />
          <stop offset="100%" stopColor="#523603" />
        </linearGradient>
        <linearGradient id="vipCrownBandGold" x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#8E640C" />
          <stop offset="25%" stopColor="#FCE7A2" />
          <stop offset="50%" stopColor="#FFFBE2" />
          <stop offset="75%" stopColor="#E0B642" />
          <stop offset="100%" stopColor="#7C5508" />
        </linearGradient>
        <radialGradient id="vipCrownRuby" cx="35%" cy="30%" r="65%">
          <stop offset="0%" stopColor="#FFE5A8" />
          <stop offset="45%" stopColor="#F59E0B" />
          <stop offset="100%" stopColor="#8A2C06" />
        </radialGradient>
        <radialGradient id="vipCrownPearl" cx="35%" cy="30%" r="70%">
          <stop offset="0%" stopColor="#FFFFFF" />
          <stop offset="55%" stopColor="#FCE7A2" />
          <stop offset="100%" stopColor="#C4931E" />
        </radialGradient>
      </defs>

      {/* Recessed inner crown peaks for 3D depth */}
      <path
        d="M24 76 L37 36 L60 58 L83 36 L96 76 Z"
        fill="url(#vipCrownBackGold)"
        stroke="#FCE7A2"
        strokeWidth="1"
        opacity="0.9"
      />

      {/* Primary sculpted 5-point royal metallic crown body */}
      <path
        d="M18 82 L12 40 L37 60 L60 24 L83 60 L108 40 L102 82 Z"
        fill="url(#vipCrownMainGold)"
        stroke="#FFF6CA"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />

      {/* Specular highlight facets along the front crown ridges */}
      <path
        d="M60 26 L49 60 L60 76 L71 60 Z"
        fill="rgba(255,252,226,0.28)"
      />
      <path
        d="M15 43 L24 79 L36 62 Z"
        fill="rgba(255,250,214,0.2)"
      />

      {/* Ornate metallic base collar & velvet shadow groove */}
      <rect
        x="17"
        y="79"
        width="86"
        height="13"
        rx="6"
        fill="url(#vipCrownBandGold)"
        stroke="#FFF5BD"
        strokeWidth="1.4"
      />
      <rect
        x="21"
        y="83"
        width="78"
        height="4.5"
        rx="2.2"
        fill="rgba(90,56,4,0.38)"
      />
      <rect
        x="15"
        y="92"
        width="90"
        height="7"
        rx="3.5"
        fill="url(#vipCrownBandGold)"
        stroke="#704D06"
        strokeWidth="1.2"
      />

      {/* Crown tip orbs / pearls */}
      <circle cx="12" cy="37" r="5" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="37" cy="33" r="4.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="60" cy="20" r="6.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1.1" />
      <circle cx="83" cy="33" r="4.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="108" cy="37" r="5" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />

      {/* Center royal jewel + side gems on band */}
      <polygon
        points="60,55 67,64 60,73 53,64"
        fill="url(#vipCrownRuby)"
        stroke="#FFF5BD"
        strokeWidth="1.2"
      />
      <circle cx="34" cy="85.5" r="2.8" fill="url(#vipCrownPearl)" />
      <circle cx="60" cy="85.5" r="3.4" fill="url(#vipCrownRuby)" stroke="#FFF5BD" strokeWidth="0.9" />
      <circle cx="86" cy="85.5" r="2.8" fill="url(#vipCrownPearl)" />

      {/* Crisp starlight glints */}
      <path d="M60 8 L61.8 13 66.8 14.8 61.8 16.6 60 21.6 58.2 16.6 53.2 14.8 58.2 13 Z" fill="#FFFFFF" />
      <path d="M97 22 L98.3 25.5 101.8 26.8 98.3 28.1 97 31.6 95.7 28.1 92.2 26.8 95.7 25.5 Z" fill="#FFFBE0" />
    </svg>
  </div>
);

export const VipSplashScreen: React.FC<VipSplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  useEffect(() => {
    const startTime = performance.now();
    let rafId = 0;
    let finishTimer: number | undefined;

    const tick = (now: number) => {
      const elapsed = now - startTime;
      const pct = Math.min(100, (elapsed / SPLASH_DURATION_MS) * 100);
      setProgress(pct);

      if (elapsed < SPLASH_DURATION_MS) {
        rafId = requestAnimationFrame(tick);
      } else {
        setFadingOut(true);
        finishTimer = window.setTimeout(() => {
          onComplete();
        }, 220);
      }
    };

    rafId = requestAnimationFrame(tick);

    return () => {
      cancelAnimationFrame(rafId);
      if (finishTimer !== undefined) {
        window.clearTimeout(finishTimer);
      }
    };
  }, [onComplete]);

  return (
    <div
      role="status"
      aria-live="polite"
      aria-label={`Loading ${BRAND_NAME}`}
      className={`fixed inset-0 z-[100] bg-[#070709] text-[#F6F2E9] overflow-hidden flex flex-col items-center justify-center px-6 transition-opacity duration-200 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Subtle radial gold spotlight */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_40%,rgba(212,175,55,0.24)_0%,rgba(212,175,55,0.06)_44%,transparent_74%)]"
      />

      {/* Rich 3D Photorealistic Gold Coins strictly on z-0 outer-edge background layer */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 overflow-hidden z-0 blur-[0.4px] opacity-80"
      >
        {FLOATING_COINS.map((coin) => (
          <div
            key={coin.id}
            className="vip-floating-coin absolute"
            style={{
              left: `${coin.leftPct}%`,
              top: `${coin.topPct}%`,
              animationDelay: `${coin.delayMs}ms`,
              animationDuration: `${coin.durationMs}ms`,
            }}
          >
            <RealisticGoldCoin sizePx={coin.sizePx} emblem={coin.emblem} />
          </div>
        ))}
      </div>

      {/* Center Foreground Layer (z-20): 110px Glowing Crown + Unobstructed Title & Loading Bar */}
      <div className="relative z-20 w-full max-w-md flex flex-col items-center text-center space-y-6">
        <LuxuryMetallicCrown />

        {/* Title & Welcoming Tagline */}
        <div className="space-y-3">
          <p className="text-xs font-semibold uppercase tracking-[0.26em] text-[#D4AF37]">
            VIP Access
          </p>
          <h1 className="font-display text-3xl sm:text-4xl font-bold tracking-tight gold-gradient-text leading-tight drop-shadow-[0_2px_18px_rgba(0,0,0,0.9)]">
            {BRAND_NAME}
          </h1>
          <p className="text-xs sm:text-sm text-[#EDE6D6] font-medium leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]">
            Watch Dramas • Fill Your Coin Pot • Win Sunday Prizes
          </p>
        </div>

        {/* 2.5s Smooth Animated Golden "Loading..." Bar */}
        <div className="w-full max-w-xs sm:max-w-sm space-y-2 pt-2">
          <div className="flex items-center justify-between text-xs">
            <span className="font-semibold text-[#FCE7A2] tracking-wide">
              Loading...
            </span>
            <span className="font-mono-num text-[#E8C96D] font-bold">
              {Math.round(progress)}%
            </span>
          </div>

          <div
            role="progressbar"
            aria-valuenow={Math.round(progress)}
            aria-valuemin={0}
            aria-valuemax={100}
            aria-label="Loading DRAMA WIN TORNEMENT"
            className="h-2.5 w-full rounded-full bg-[#13131A] border border-[#D4AF37]/30 overflow-hidden shadow-inner"
          >
            <div
              className="h-full gold-gradient-bg rounded-full shadow-[0_0_16px_rgba(243,211,122,0.65)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>
      </div>
    </div>
  );
};
