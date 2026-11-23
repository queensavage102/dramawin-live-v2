import React, { useEffect, useState } from 'react';

interface VipSplashScreenProps {
  onComplete: () => void;
}

const SPLASH_DURATION_MS = 2500;

interface GoldDustSpec {
  id: number;
  leftPct: number;
  topPct: number;
  sizePx: number;
  delayMs: number;
  durationMs: number;
  isStar?: boolean;
}

// Subtle ambient floating gold dust & cinema sparkle specks (container at opacity: 0.3)
const GOLD_DUST_PARTICLES: GoldDustSpec[] = [
  { id: 1, leftPct: 14, topPct: 24, sizePx: 3, delayMs: 0, durationMs: 4200 },
  { id: 2, leftPct: 26, topPct: 18, sizePx: 6, delayMs: 450, durationMs: 4600, isStar: true },
  { id: 3, leftPct: 38, topPct: 32, sizePx: 2.5, delayMs: 900, durationMs: 3900 },
  { id: 4, leftPct: 51, topPct: 15, sizePx: 3.5, delayMs: 250, durationMs: 4400 },
  { id: 5, leftPct: 64, topPct: 28, sizePx: 6, delayMs: 700, durationMs: 4700, isStar: true },
  { id: 6, leftPct: 78, topPct: 20, sizePx: 3, delayMs: 180, durationMs: 4100 },
  { id: 7, leftPct: 86, topPct: 36, sizePx: 2.5, delayMs: 1100, durationMs: 4500 },
  { id: 8, leftPct: 19, topPct: 48, sizePx: 2.5, delayMs: 600, durationMs: 4300 },
  { id: 9, leftPct: 82, topPct: 52, sizePx: 3, delayMs: 320, durationMs: 4000 },
  { id: 10, leftPct: 12, topPct: 72, sizePx: 6, delayMs: 820, durationMs: 4600, isStar: true },
  { id: 11, leftPct: 29, topPct: 84, sizePx: 3, delayMs: 140, durationMs: 4100 },
  { id: 12, leftPct: 46, topPct: 78, sizePx: 2.5, delayMs: 960, durationMs: 4300 },
  { id: 13, leftPct: 68, topPct: 82, sizePx: 3.5, delayMs: 520, durationMs: 4500 },
  { id: 14, leftPct: 85, topPct: 74, sizePx: 6, delayMs: 260, durationMs: 4400, isStar: true },
  { id: 15, leftPct: 34, topPct: 60, sizePx: 2, delayMs: 760, durationMs: 3900 },
  { id: 16, leftPct: 62, topPct: 62, sizePx: 2.5, delayMs: 410, durationMs: 4200 },
];

const SPLASH_REWARDS_BOXES = [
  {
    title: '🎬 HD Dramas',
    subtitle: 'Watch & Earn',
  },
  {
    title: '🎡 Daily Spin',
    subtitle: 'Win 1,000 Coins',
  },
  {
    title: '🏆 Sunday Pool',
    subtitle: 'Top 3 Win Big',
  },
] as const;

const LuxuryMetallicCrown: React.FC = () => (
  <div className="relative flex items-center justify-center">
    {/* Soft radial golden cinema spotlight aura behind the crown */}
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-24 rounded-full bg-[radial-gradient(circle,rgba(252,231,162,0.28)_0%,rgba(212,175,55,0.12)_38%,transparent_72%)] blur-2xl"
    />
    <div
      aria-hidden="true"
      className="vip-crown-halo pointer-events-none absolute -inset-12 rounded-full bg-[radial-gradient(circle,rgba(255,241,176,0.52)_0%,rgba(212,175,55,0.24)_42%,transparent_74%)] blur-xl"
    />
    <svg
      width={110}
      height={110}
      viewBox="0 0 120 120"
      className="relative z-10 w-[102px] h-[102px] sm:w-[112px] sm:h-[112px] drop-shadow-[0_0_30px_rgba(252,231,162,0.88)]"
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
      <path d="M60 26 L49 60 L60 76 L71 60 Z" fill="rgba(255,252,226,0.28)" />
      <path d="M15 43 L24 79 L36 62 Z" fill="rgba(255,250,214,0.2)" />

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
      <rect x="21" y="83" width="78" height="4.5" rx="2.2" fill="rgba(90,56,4,0.38)" />
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
      aria-label="Loading DRAMA WIN"
      className={`fixed inset-0 z-[100] bg-[#060608] text-[#F6F2E9] overflow-hidden flex flex-col items-center justify-center px-5 transition-opacity duration-200 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Luxury VIP Cinema Theatrical Radial Golden Spotlight Aura */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(ellipse_at_50%_34%,rgba(243,211,122,0.22)_0%,rgba(212,175,55,0.09)_32%,rgba(120,88,18,0.03)_56%,transparent_78%)]"
      />
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,transparent_48%,rgba(0,0,0,0.78)_100%)]"
      />

      {/* Subtle Floating Gold Dust / Sparkle Particles (opacity: 0.3) */}
      <div
        aria-hidden="true"
        style={{ opacity: 0.3 }}
        className="pointer-events-none absolute inset-0 overflow-hidden z-0"
      >
        {GOLD_DUST_PARTICLES.map((dust) => (
          <div
            key={dust.id}
            className="vip-dust-particle absolute"
            style={{
              left: `${dust.leftPct}%`,
              top: `${dust.topPct}%`,
              animationDelay: `${dust.delayMs}ms`,
              animationDuration: `${dust.durationMs}ms`,
            }}
          >
            {dust.isStar ? (
              <svg
                width={dust.sizePx * 2}
                height={dust.sizePx * 2}
                viewBox="0 0 16 16"
                className="drop-shadow-[0_0_6px_rgba(252,231,162,0.9)]"
              >
                <path
                  d="M8 0 L9.6 6.4 L16 8 L9.6 9.6 L8 16 L6.4 9.6 L0 8 L6.4 6.4 Z"
                  fill="#FCE7A2"
                />
              </svg>
            ) : (
              <span
                className="block rounded-full bg-[#FCE7A2] shadow-[0_0_8px_rgba(243,211,122,0.95)]"
                style={{
                  width: `${dust.sizePx}px`,
                  height: `${dust.sizePx}px`,
                }}
              />
            )}
          </div>
        ))}
      </div>

      {/* Center Foreground Layer (z-20): Crown + VIP Access Hairline Framing + Title + Loading Bar + Rewards Row */}
      <div className="relative z-20 w-full max-w-md flex flex-col items-center text-center space-y-5 px-2">
        <LuxuryMetallicCrown />

        {/* Title & Welcoming Tagline */}
        <div className="w-full space-y-3">
          {/* Delicate Gold Horizontal Divider Lines */}
          <div className="flex flex-col items-center gap-1.5">
            <div
              aria-hidden="true"
              className="h-px w-44 sm:w-56 bg-gradient-to-r from-transparent via-[#D4AF37]/80 to-transparent"
            />
            <p className="text-[11px] sm:text-xs font-semibold uppercase tracking-[0.22em] text-[#FCE7A2]">
              100% FREE STREAMING · DRAMA WIN
            </p>
            <div
              aria-hidden="true"
              className="h-px w-44 sm:w-56 bg-gradient-to-r from-transparent via-[#D4AF37]/80 to-transparent"
            />
          </div>

          <h1 className="font-display text-2xl sm:text-4xl font-bold tracking-tight gold-gradient-text leading-tight drop-shadow-[0_2px_20px_rgba(0,0,0,0.95)]">
            DRAMA WIN
          </h1>
          <p className="text-xs sm:text-sm text-[#EDE6D6] font-medium leading-relaxed drop-shadow-[0_1px_10px_rgba(0,0,0,0.9)]">
            Watch Free Short Dramas · Earn Free Bonus Coins · No Subscription Required
          </p>
        </div>

        {/* 2.5s Smooth Animated Golden "Loading..." Bar */}
        <div className="w-full max-w-xs sm:max-w-sm space-y-2 pt-1">
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
            aria-label="Loading DRAMA WIN"
            className="h-2.5 w-full rounded-full bg-[#13131A] border border-[#D4AF37]/30 overflow-hidden shadow-inner"
          >
            <div
              className="h-full gold-gradient-bg rounded-full shadow-[0_0_16px_rgba(243,211,122,0.65)]"
              style={{ width: `${progress}%` }}
            />
          </div>
        </div>

        {/* 3 Clean Dark-and-Gold Rewards Boxes Directly Under Loading Bar */}
        <div className="w-full grid grid-cols-3 gap-2 sm:gap-3 pt-1">
          {SPLASH_REWARDS_BOXES.map((box) => (
            <div
              key={box.title}
              className="rounded-xl bg-gradient-to-b from-[#16130C]/95 to-[#0B0B10]/95 border border-[#D4AF37]/40 px-2 py-2.5 sm:px-3 sm:py-3 shadow-[0_8px_22px_rgba(0,0,0,0.65)] flex flex-col items-center justify-center text-center gap-0.5"
            >
              <span className="text-[11px] sm:text-xs font-bold text-[#FCE7A2] leading-tight whitespace-nowrap">
                {box.title}
              </span>
              <span className="text-[10px] sm:text-[11px] font-medium text-[#C8C0B0] leading-tight whitespace-nowrap">
                {box.subtitle}
              </span>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
};
