import React, { useEffect, useRef, useState } from 'react';
import {
  Coins,
  Gift,
  Shield,
  Volume2,
  VolumeX,
} from 'lucide-react';

interface TopHeaderProps {
  coins: number;
  sundayBonusZar: number;
  muted: boolean;
  onOpenGiftVault: () => void;
  onToggleMute: () => void;
  onOpenAdmin: () => void;
}

export const TopHeader: React.FC<TopHeaderProps> = ({
  coins,
  sundayBonusZar,
  muted,
  onOpenGiftVault,
  onToggleMute,
  onOpenAdmin,
}) => {
  const [displayCoins, setDisplayCoins] = useState(coins);
  const [glowActive, setGlowActive] = useState(false);
  const prevCoinsRef = useRef(coins);
  const displayCoinsRef = useRef(coins);

  useEffect(() => {
    displayCoinsRef.current = displayCoins;
  }, [displayCoins]);

  useEffect(() => {
    const previous = prevCoinsRef.current;
    prevCoinsRef.current = coins;

    if (coins === displayCoinsRef.current) return;

    const delta = coins - previous;
    if (delta > 0) {
      setGlowActive(true);
      const glowTimer = window.setTimeout(() => setGlowActive(false), 900);

      const startVal = displayCoinsRef.current;
      const startTime = performance.now();
      const duration = 560;
      let rafId = 0;

      const step = (now: number) => {
        const t = Math.min(1, (now - startTime) / duration);
        const eased = 1 - Math.pow(1 - t, 3);
        const nextVal = Math.round(startVal + (coins - startVal) * eased);
        setDisplayCoins(nextVal);
        if (t < 1) {
          rafId = requestAnimationFrame(step);
        }
      };
      rafId = requestAnimationFrame(step);

      return () => {
        window.clearTimeout(glowTimer);
        cancelAnimationFrame(rafId);
      };
    }

    setDisplayCoins(coins);
  }, [coins]);

  return (
    <header className="sticky top-0 z-30 h-[56px] bg-[#09090b]/92 backdrop-blur-xl border-b border-white/[0.08]">
      <div className="max-w-6xl mx-auto h-full px-3 sm:px-6 flex items-center justify-between gap-2">
        {/* Top-Left: Coin Balance Pill */}
        <div
          className={`inline-flex items-center gap-1.5 rounded-full bg-white/[0.06] backdrop-blur-md border px-3 py-1.5 min-h-[38px] transition-all duration-300 shrink-0 ${
            glowActive
              ? 'border-amber-300 shadow-[0_0_20px_rgba(251,191,36,0.6)] scale-[1.03]'
              : 'border-amber-400/35'
          }`}
        >
          <span className="w-5 h-5 rounded-full bg-gradient-to-br from-yellow-300 via-amber-400 to-amber-600 flex items-center justify-center text-zinc-950 shrink-0">
            <Coins className="w-3.5 h-3.5 stroke-[2.4]" />
          </span>
          <span className="font-mono-num text-xs sm:text-sm font-extrabold text-amber-200 whitespace-nowrap">
            {displayCoins.toLocaleString()}
          </span>
          <span className="text-[10px] font-semibold uppercase tracking-wider text-amber-400/80 hidden xs:inline">
            Coins
          </span>
        </div>

        {/* Top-Right: Reward/Cash Pool Pill + Standalone Gift Box + Utility Controls */}
        <div className="flex items-center gap-2 shrink-0">
          <div className="inline-flex items-center gap-1.5 rounded-full bg-gradient-to-r from-fuchsia-500/15 via-purple-500/15 to-amber-500/15 backdrop-blur-md border border-fuchsia-400/30 px-2.5 sm:px-3 py-1.5 min-h-[36px] shrink-0">
            <span className="w-2 h-2 rounded-full bg-emerald-400 shrink-0" />
            <span className="font-mono-num text-xs font-bold text-white whitespace-nowrap">
              R{sundayBonusZar}
            </span>
            <span className="text-[10px] font-semibold text-fuchsia-200/85 whitespace-nowrap hidden sm:inline">
              Pool Reward
            </span>
          </div>

          <button
            type="button"
            onClick={onOpenGiftVault}
            aria-label="Open Gift Box Vault"
            title="Secret Mystery Gift Vault"
            className="relative min-w-[44px] min-h-[44px] w-11 h-11 rounded-2xl bg-gradient-to-br from-yellow-400 via-amber-500 to-orange-600 border-2 border-yellow-200 shadow-[0_0_18px_rgba(251,191,36,0.8)] flex items-center justify-center hover:brightness-110 active:scale-95 transition-transform shrink-0 cursor-pointer"
          >
            <Gift className="w-5 h-5 text-zinc-950 stroke-[2.3]" />
            <span
              aria-hidden="true"
              className="absolute -top-1 -right-1.5 px-1.5 py-[1px] rounded-full bg-gradient-to-r from-red-600 via-orange-500 to-amber-400 border border-yellow-200 text-[8px] leading-tight font-black tracking-wider text-white shadow-[0_0_8px_rgba(249,115,22,0.9)]"
            >
              FREE
            </span>
          </button>

          <button
            type="button"
            onClick={onToggleMute}
            aria-pressed={!muted}
            aria-label={muted ? 'Unmute audio' : 'Mute audio'}
            className="min-h-[40px] min-w-[40px] rounded-xl bg-white/[0.05] border border-white/[0.09] flex items-center justify-center text-zinc-300 hover:text-white hover:border-white/20 transition-colors cursor-pointer"
          >
            {muted ? (
              <VolumeX className="w-4 h-4 text-zinc-500" />
            ) : (
              <Volume2 className="w-4 h-4 text-amber-300" />
            )}
          </button>

          <button
            type="button"
            onClick={onOpenAdmin}
            aria-label="Open Admin Board"
            title="Admin Board"
            className="min-h-[40px] px-2.5 rounded-xl bg-white/[0.05] border border-white/[0.09] text-zinc-300 hover:text-amber-300 hover:border-amber-400/40 text-xs font-semibold inline-flex items-center gap-1 transition-colors cursor-pointer"
          >
            <Shield className="w-4 h-4 text-amber-400" />
            <span className="hidden md:inline">Admin</span>
          </button>
        </div>
      </div>
    </header>
  );
};
