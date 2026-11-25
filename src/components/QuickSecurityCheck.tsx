import React, { useEffect, useRef, useState } from 'react';
import { CheckCircle2, ShieldCheck } from 'lucide-react';
import { TOP_SHORTS_FEATURED } from '../utils/externalCatalog';

export const HUMAN_VERIFIED_SESSION_KEY = 'isVerified';

type SecurityIconId = 'ticket' | 'clapperboard' | 'star' | 'popcorn';

interface SecurityIconOption {
  id: SecurityIconId;
  label: string;
  emoji: string;
}

const SECURITY_ICON_OPTIONS: SecurityIconOption[] = [
  { id: 'ticket', label: 'Ticket', emoji: '🎟️' },
  { id: 'clapperboard', label: 'Clapperboard', emoji: '🎬' },
  { id: 'star', label: 'Star', emoji: '⭐' },
  { id: 'popcorn', label: 'Popcorn', emoji: '🍿' },
];

const PREVIEW_BACKDROP_SHOWS = [
  ...TOP_SHORTS_FEATURED,
  ...TOP_SHORTS_FEATURED.slice(0, 4),
];

function shuffleIcons(previousOrder?: SecurityIconOption[]): SecurityIconOption[] {
  const pool = [...SECURITY_ICON_OPTIONS];
  for (let i = pool.length - 1; i > 0; i--) {
    const j = Math.floor(Math.random() * (i + 1));
    [pool[i], pool[j]] = [pool[j], pool[i]];
  }
  if (
    previousOrder &&
    previousOrder.length === pool.length &&
    pool.every((item, idx) => item.id === previousOrder[idx].id)
  ) {
    const first = pool.shift();
    if (first) pool.push(first);
  }
  return pool;
}

interface QuickSecurityCheckProps {
  onVerified: () => void;
}

export const QuickSecurityCheck: React.FC<QuickSecurityCheckProps> = ({ onVerified }) => {
  const [options, setOptions] = useState<SecurityIconOption[]>(() => shuffleIcons());
  const [verified, setVerified] = useState(false);
  const [wrongMessage, setWrongMessage] = useState<string | null>(null);
  const [attemptCount, setAttemptCount] = useState(0);
  const completeTimerRef = useRef<number | null>(null);

  useEffect(() => {
    return () => {
      if (completeTimerRef.current !== null) {
        window.clearTimeout(completeTimerRef.current);
      }
    };
  }, []);

  const handleSelectIcon = (selectedId: SecurityIconId) => {
    if (verified) return;

    if (selectedId === 'clapperboard') {
      setWrongMessage(null);
      setVerified(true);
      try {
        window.sessionStorage.setItem(HUMAN_VERIFIED_SESSION_KEY, 'true');
      } catch {
        // Ignore storage restrictions in private browsing
      }
      completeTimerRef.current = window.setTimeout(() => {
        onVerified();
      }, 620);
      return;
    }

    setAttemptCount((prev) => prev + 1);
    setOptions((prev) => shuffleIcons(prev));
    setWrongMessage('Wrong icon — try again!');
  };

  return (
    <div
      role="dialog"
      aria-modal="true"
      aria-labelledby="quick-security-check-title"
      className="fixed inset-0 z-[100] bg-[#0B0610] text-[#F6F2E9] overflow-hidden flex items-center justify-center px-4 py-6"
    >
      {/* Bright, Colorful Blurred Grid of Drama Show Posters Behind Card (Zero Ads/Scripts) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden select-none"
      >
        <div className="mx-auto max-w-5xl px-3 pt-4 grid grid-cols-3 sm:grid-cols-4 gap-2.5 opacity-70 blur-[6px] scale-105 saturate-150 brightness-110">
          {PREVIEW_BACKDROP_SHOWS.map((drama, idx) => (
            <div
              key={`${drama.id}-${idx}`}
              className="aspect-[3/4] rounded-2xl overflow-hidden border border-amber-300/20 bg-[#1B1024] relative shadow-lg"
            >
              <img
                src={drama.coverImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-black/70 to-transparent" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#120612]/48 via-[#1B0914]/42 to-[#090612]/62 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_48%,rgba(220,38,38,0.22)_0%,rgba(251,191,36,0.14)_34%,transparent_72%)]" />
      </div>

      {/* Compact Floating Glassmorphic Card (w-[90vw] max-w-[320px]) */}
      <div className="relative z-10 w-[90vw] max-w-[320px]">
        {/* Soft Crimson & Gold Outer Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-3 rounded-[32px] blur-2xl transition-all duration-500 ${
            verified
              ? 'bg-[radial-gradient(circle,rgba(52,211,153,0.48)_0%,rgba(16,185,129,0.16)_55%,transparent_80%)]'
              : 'bg-[radial-gradient(circle,rgba(220,38,38,0.42)_0%,rgba(251,191,36,0.24)_45%,transparent_80%)]'
          }`}
        />

        {/* Rich Crimson-and-Gold Cinema Border Frame */}
        <div
          className={`relative p-[1.5px] rounded-[25px] transition-all duration-300 ${
            verified
              ? 'bg-gradient-to-br from-emerald-300 via-emerald-500 to-teal-300 shadow-[0_0_50px_-6px_rgba(16,185,129,0.55),0_22px_48px_rgba(0,0,0,0.85)]'
              : 'bg-gradient-to-br from-[#FFF1B8] via-[#E11D48] via-55% to-[#F59E0B] shadow-[0_0_52px_-6px_rgba(225,29,72,0.48),0_0_32px_-8px_rgba(251,191,36,0.45),0_22px_48px_rgba(0,0,0,0.85)]'
          }`}
        >
          <div className="relative rounded-[23.5px] backdrop-blur-2xl bg-gradient-to-b from-[#260B16]/90 via-[#150C1E]/92 to-[#0D0A17]/95 px-4 py-5 text-center space-y-4 overflow-hidden">
            {/* Glossy Top Specular Hairline */}
            <div
              aria-hidden="true"
              className={`pointer-events-none absolute inset-x-5 top-0 h-px bg-gradient-to-r from-transparent ${
                verified ? 'via-emerald-200/90' : 'via-[#FFF6CA]/90'
              } to-transparent`}
            />

            {/* Compact Header */}
            <div className="space-y-2">
              <div className="relative mx-auto w-11 h-11 flex items-center justify-center">
                {verified && (
                  <span
                    aria-hidden="true"
                    className="security-emerald-burst absolute inset-0 rounded-full bg-emerald-400/45 border border-emerald-300"
                  />
                )}
                <div
                  className={`relative w-11 h-11 rounded-2xl flex items-center justify-center border transition-all duration-300 ${
                    verified
                      ? 'bg-gradient-to-b from-emerald-400/35 to-emerald-600/20 border-emerald-300/80 shadow-[0_0_24px_rgba(52,211,153,0.6)] scale-105'
                      : 'bg-gradient-to-b from-[#FCE7A2]/25 via-[#E11D48]/25 to-[#781227]/30 border-[#FBBF24]/60 shadow-[inset_0_1px_1px_rgba(255,250,224,0.5),0_6px_16px_rgba(225,29,72,0.3)]'
                  }`}
                >
                  {verified ? (
                    <CheckCircle2 className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
                  ) : (
                    <ShieldCheck className="w-6 h-6 text-[#FFE89E] drop-shadow-[0_2px_6px_rgba(251,191,36,0.65)]" />
                  )}
                </div>
              </div>

              <div className="space-y-1">
                <h1
                  id="quick-security-check-title"
                  className="font-display text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#FFF9DB] via-[#FBBF24] to-[#FCE7A2] bg-clip-text text-transparent drop-shadow-[0_2px_10px_rgba(251,191,36,0.45)] leading-tight"
                >
                  Quick Security Check
                </h1>
                <p className="text-[11.5px] text-[#EDE4D3] leading-snug text-balance">
                  Tap the Clapperboard icon below to verify you are human and unlock free streaming.
                </p>
              </div>
            </div>

            {/* Verified Emerald Burst State OR Single-Row 4-Icon Glossy Dark-Indigo Circular Bar */}
            {verified ? (
              <div
                role="status"
                aria-live="polite"
                className="relative rounded-2xl bg-gradient-to-r from-emerald-950/70 via-emerald-900/55 to-emerald-950/70 border border-emerald-400/65 px-4 py-3.5 flex items-center justify-center gap-2.5 shadow-[0_0_28px_rgba(16,185,129,0.35)] memory-card-matched-pop overflow-hidden"
              >
                <span
                  aria-hidden="true"
                  className="security-emerald-burst pointer-events-none absolute w-16 h-16 rounded-full bg-emerald-400/35"
                />
                <CheckCircle2 className="relative z-10 w-6 h-6 text-emerald-300 shrink-0" />
                <div className="relative z-10 text-left leading-tight">
                  <div className="text-sm font-extrabold text-emerald-300">
                    Verified!
                  </div>
                  <div className="text-[10.5px] text-emerald-100/85">
                    Unlocking free streaming...
                  </div>
                </div>
              </div>
            ) : (
              <div className="space-y-2.5">
                <div
                  key={attemptCount}
                  role="group"
                  aria-label="Security verification icons"
                  className={`grid grid-cols-4 gap-2 p-2 rounded-full bg-[#090714]/70 border border-[#FBBF24]/30 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85)] ${
                    attemptCount > 0 ? 'security-wrong-shake' : ''
                  }`}
                >
                  {options.map(({ id, label, emoji }) => (
                    <button
                      key={id}
                      type="button"
                      onClick={() => handleSelectIcon(id)}
                      aria-label={label}
                      className="group relative w-12 h-12 mx-auto rounded-full bg-gradient-to-b from-[#3B3898] via-[#231F63] to-[#110E38] border border-indigo-300/45 hover:border-[#FBBF24] shadow-[inset_0_1.5px_2px_rgba(224,231,255,0.5),inset_0_-3px_6px_rgba(6,5,24,0.85),0_6px_14px_rgba(15,12,48,0.75)] flex items-center justify-center overflow-hidden hover:-translate-y-0.5 active:scale-90 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#FBBF24]"
                    >
                      {/* Glossy 3D Top Glass Reflection */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-x-1.5 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/30 to-transparent"
                      />
                      {/* Hover / Tap Shimmer Sweep */}
                      <span
                        aria-hidden="true"
                        className="pointer-events-none absolute inset-y-0 -left-full w-2/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-white/35 to-transparent group-hover:translate-x-[280%] transition-transform duration-500 ease-out"
                      />
                      <span
                        aria-hidden="true"
                        className="relative z-10 text-2xl leading-none drop-shadow-[0_3px_6px_rgba(0,0,0,0.65)] transition-transform duration-200 group-hover:scale-110 select-none"
                      >
                        {emoji}
                      </span>
                    </button>
                  ))}
                </div>

                {wrongMessage && (
                  <p
                    role="alert"
                    className="text-[11px] font-semibold text-amber-300 leading-tight"
                  >
                    {wrongMessage}
                  </p>
                )}
              </div>
            )}

            <p className="text-[10.5px] font-medium text-[#C5B9A5]">
              100% Free · No sign-in required
            </p>
          </div>
        </div>
      </div>
    </div>
  );
};
