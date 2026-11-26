import React, { useEffect, useMemo, useState } from 'react';
import { SPLASH_MODERN_POSTERS } from '../utils/modernCatalog';

interface VipSplashScreenProps {
  onComplete: () => void;
}

const SPLASH_DURATION_MS = 2500;

const SplashPosterTile: React.FC<{ coverUrl: string }> = ({ coverUrl }) => (
  <div className="relative w-28 sm:w-32 aspect-[2/3] shrink-0 rounded-xl overflow-hidden border border-cyan-400/30 shadow-[0_12px_32px_rgba(0,0,0,0.8)]">
    <img
      src={coverUrl}
      alt=""
      className="w-full h-full object-cover brightness-125 saturate-125"
    />
  </div>
);

const LuxuryMetallicCrown: React.FC = () => (
  <div className="relative flex items-center justify-center">
    <div
      aria-hidden="true"
      className="pointer-events-none absolute -inset-20 rounded-full bg-[radial-gradient(circle,rgba(0,240,255,0.45)_0%,rgba(99,102,241,0.25)_40%,transparent_72%)] blur-2xl"
    />
    <div
      aria-hidden="true"
      className="vip-crown-halo pointer-events-none absolute -inset-10 rounded-full bg-[radial-gradient(circle,rgba(255,241,176,0.6)_0%,rgba(0,240,255,0.3)_44%,transparent_74%)] blur-xl"
    />
    <svg
      width={96}
      height={96}
      viewBox="0 0 120 120"
      className="relative z-10 w-[88px] h-[88px] sm:w-[104px] sm:h-[104px] drop-shadow-[0_0_32px_rgba(0,240,255,0.95)]"
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

      <path
        d="M24 76 L37 36 L60 58 L83 36 L96 76 Z"
        fill="url(#vipCrownBackGold)"
        stroke="#FCE7A2"
        strokeWidth="1"
        opacity="0.9"
      />
      <path
        d="M18 82 L12 40 L37 60 L60 24 L83 60 L108 40 L102 82 Z"
        fill="url(#vipCrownMainGold)"
        stroke="#FFF6CA"
        strokeWidth="1.8"
        strokeLinejoin="round"
      />
      <path d="M60 26 L49 60 L60 76 L71 60 Z" fill="rgba(255,252,226,0.28)" />
      <path d="M15 43 L24 79 L36 62 Z" fill="rgba(255,250,214,0.2)" />
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
      <circle cx="12" cy="37" r="5" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="37" cy="33" r="4.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="60" cy="20" r="6.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1.1" />
      <circle cx="83" cy="33" r="4.2" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <circle cx="108" cy="37" r="5" fill="url(#vipCrownPearl)" stroke="#8A610C" strokeWidth="1" />
      <polygon
        points="60,55 67,64 60,73 53,64"
        fill="url(#vipCrownRuby)"
        stroke="#FFF5BD"
        strokeWidth="1.2"
      />
      <circle cx="34" cy="85.5" r="2.8" fill="url(#vipCrownPearl)" />
      <circle cx="60" cy="85.5" r="3.4" fill="url(#vipCrownRuby)" stroke="#FFF5BD" strokeWidth="0.9" />
      <circle cx="86" cy="85.5" r="2.8" fill="url(#vipCrownPearl)" />
      <path d="M60 8 L61.8 13 66.8 14.8 61.8 16.6 60 21.6 58.2 16.6 53.2 14.8 58.2 13 Z" fill="#FFFFFF" />
      <path d="M97 22 L98.3 25.5 101.8 26.8 98.3 28.1 97 31.6 95.7 28.1 92.2 26.8 95.7 25.5 Z" fill="#FFFBE0" />
    </svg>
  </div>
);

export const VipSplashScreen: React.FC<VipSplashScreenProps> = ({ onComplete }) => {
  const [progress, setProgress] = useState(0);
  const [fadingOut, setFadingOut] = useState(false);

  const posterRows = useMemo(() => {
    const row1 = SPLASH_MODERN_POSTERS.slice(0, 6);
    const row2 = SPLASH_MODERN_POSTERS.slice(6, 12);
    const row3 = SPLASH_MODERN_POSTERS.slice(12, 18);
    return [row1, row2, row3];
  }, []);

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
        }, 180);
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
      className={`fixed inset-0 z-[100] bg-gradient-to-br from-blue-600 via-indigo-900 to-cyan-500 text-[#F6F2E9] overflow-hidden flex flex-col items-center justify-center px-5 transition-opacity duration-200 ${
        fadingOut ? 'opacity-0 pointer-events-none' : 'opacity-100'
      }`}
    >
      {/* Expanded Tilted (-12deg) Moving Poster Wall (scale-125 edge-to-edge) */}
      <div
        aria-hidden="true"
        className="pointer-events-none absolute inset-[-35%] flex flex-col justify-center gap-4 -rotate-12 scale-125 opacity-100 brightness-125 saturate-125 select-none overflow-hidden"
      >
        {posterRows.map((row, rowIdx) => {
          const doubled = [...row, ...row, ...row];
          return (
            <div
              key={`splash-row-${rowIdx}`}
              className={`flex w-max gap-3.5 ${
                rowIdx % 2 === 0 ? 'splash-marquee-left' : 'splash-marquee-right'
              }`}
            >
              {doubled.map((coverUrl, idx) => (
                <SplashPosterTile key={`tile-${rowIdx}-${idx}`} coverUrl={coverUrl} />
              ))}
            </div>
          );
        })}
      </div>

      {/* Sleek Translucent Frosted Glass Pill Wrapper */}
      <div className="relative z-20 w-full max-w-sm rounded-3xl bg-slate-950/65 backdrop-blur-md border border-cyan-400/50 px-6 py-5 shadow-[0_0_30px_rgba(0,240,255,0.4)] flex flex-col items-center text-center space-y-3.5">
        <LuxuryMetallicCrown />

        <div className="space-y-1.5">
          <h1
            className="font-display text-3xl sm:text-4xl font-extrabold tracking-tight gold-gradient-text leading-tight drop-shadow-[0_2px_12px_rgba(0,240,255,0.6)]"
            style={{ textShadow: '0 2px 10px rgba(0,0,0,0.9)' }}
          >
            DRAMA WIN
          </h1>
          <p className="text-xs sm:text-sm text-[#FFF8E7] font-semibold tracking-wide leading-snug drop-shadow-[0_1px_6px_rgba(0,0,0,0.9)]">
            Binge Horror, Romance &amp; Anime Free
          </p>
        </div>
      </div>

      {/* Thick Neon Progress Bar */}
      <div className="absolute inset-x-0 bottom-[max(2rem,env(safe-area-inset-bottom))] z-20 px-6 sm:px-10 flex justify-center">
        <div
          role="progressbar"
          aria-valuenow={Math.round(progress)}
          aria-valuemin={0}
          aria-valuemax={100}
          aria-label="Loading DRAMA WIN"
          className="h-4 w-full max-w-sm rounded-full border-2 border-white/85 bg-slate-900/60 overflow-hidden shadow-[0_0_20px_rgba(0,240,255,0.5)]"
        >
          <div
            className="h-full rounded-full bg-gradient-to-r from-cyan-400 via-teal-300 to-amber-400 shadow-[0_0_16px_rgba(0,240,255,0.9)] transition-all duration-100"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
};
