import React from 'react';

interface LuckySpinFloatingButtonProps {
  onClick: () => void;
  className?: string;
}

export const LuckySpinFloatingButton: React.FC<LuckySpinFloatingButtonProps> = ({
  onClick,
  className = '',
}) => {
  return (
    <button
      type="button"
      onClick={onClick}
      aria-label="Open Lucky Spin Wheel"
      title="Lucky Spin Wheel"
      className={`pointer-events-auto group relative flex flex-col items-center gap-1 cursor-pointer focus:outline-none ${className}`}
    >
      <span
        aria-hidden="true"
        className="absolute -inset-1.5 rounded-full bg-amber-400/35 blur-md animate-pulse"
      />
      <span className="relative w-12 h-12 rounded-full bg-gradient-to-br from-[#FFF3B0] via-[#FBBF24] to-[#B45309] border-2 border-[#FFF8DC] shadow-[0_0_22px_rgba(251,191,36,0.75)] flex items-center justify-center group-hover:scale-105 active:scale-95 transition-transform">
        <svg
          viewBox="0 0 36 36"
          className="w-8 h-8 drop-shadow-[0_1px_2px_rgba(0,0,0,0.45)]"
          aria-hidden="true"
        >
          <circle cx="18" cy="18" r="16" fill="#181307" stroke="#FFF3B0" strokeWidth="1.5" />
          <path d="M18 18 L18 3 A15 15 0 0 1 31 10.5 Z" fill="#FBBF24" />
          <path d="M18 18 L31 10.5 A15 15 0 0 1 31 25.5 Z" fill="#EC4899" />
          <path d="M18 18 L31 25.5 A15 15 0 0 1 18 33 Z" fill="#F59E0B" />
          <path d="M18 18 L18 33 A15 15 0 0 1 5 25.5 Z" fill="#8B5CF6" />
          <path d="M18 18 L5 25.5 A15 15 0 0 1 5 10.5 Z" fill="#10B981" />
          <path d="M18 18 L5 10.5 A15 15 0 0 1 18 3 Z" fill="#FDE68A" />
          <circle cx="18" cy="18" r="4.5" fill="#FFFDF0" stroke="#181307" strokeWidth="1.5" />
          <polygon points="18,1 15.5,6 20.5,6" fill="#FFFFFF" stroke="#181307" strokeWidth="0.8" />
        </svg>
      </span>
      <span className="relative px-2 py-0.5 rounded-full bg-black/80 border border-amber-400/50 text-[10px] font-extrabold uppercase tracking-wider text-[#FCE7A2] shadow-md">
        SPIN
      </span>
    </button>
  );
};
