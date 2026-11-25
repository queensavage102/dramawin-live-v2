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
      className="fixed inset-0 z-[100] bg-[#040814] text-[#F0F7FF] overflow-hidden flex items-center justify-center px-4 py-6"
    >
      {/* Colorful Blurred Collage of Drama Show Posters Behind Card (Zero Ads/Scripts) */}
      <div
        aria-hidden="true"
        className="pointer-events-none fixed inset-0 overflow-hidden select-none"
      >
        <div className="mx-auto max-w-5xl px-3 pt-4 grid grid-cols-3 sm:grid-cols-4 gap-2.5 opacity-70 blur-[6px] scale-105 saturate-150 brightness-110">
          {PREVIEW_BACKDROP_SHOWS.map((drama, idx) => (
            <div
              key={`${drama.id}-${idx}`}
              className="aspect-[3/4] rounded-2xl overflow-hidden border border-[#00E5FF]/20 bg-[#0A1633] relative shadow-lg"
            >
              <img
                src={drama.coverImage}
                alt=""
                referrerPolicy="no-referrer"
                className="w-full h-full object-cover"
              />
              <div className="absolute inset-x-0 bottom-0 h-1/3 bg-gradient-to-t from-[#040814]/80 to-transparent" />
            </div>
          ))}
        </div>
        <div className="absolute inset-0 bg-gradient-to-b from-[#040A1C]/55 via-[#06122E]/48 to-[#030714]/70 backdrop-blur-[2px]" />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_46%,rgba(0,229,255,0.22)_0%,rgba(37,99,235,0.18)_36%,transparent_72%)]" />
      </div>

      {/* Compact Floating Gojo Six Eyes Glass Card (w-[90vw] max-w-[320px]) */}
      <div className="relative z-10 w-[90vw] max-w-[320px]">
        {/* Electric Cyan & Sapphire Outer Halo Glow */}
        <div
          aria-hidden="true"
          className={`pointer-events-none absolute -inset-3.5 rounded-[34px] blur-2xl transition-all duration-500 ${
            verified
              ? 'bg-[radial-gradient(circle,rgba(52,211,153,0.52)_0%,rgba(16,185,129,0.18)_55%,transparent_80%)]'
              : 'bg-[radial-gradient(circle,rgba(0,229,255,0.44)_0%,rgba(37,99,235,0.32)_46%,transparent_80%)]'
          }`}
        />

        {/* Luminous Electric Ice-Blue (#00E5FF) Border & Deep Midnight-Navy Frosted Card (#050B1A/85) */}
        <div
          className={`relative rounded-[24px] backdrop-blur-2xl bg-[#050B1A]/85 border-[1.5px] px-4 py-5 text-center space-y-4 overflow-hidden transition-all duration-300 ${
            verified
              ? 'border-emerald-400 shadow-[0_0_48px_-4px_rgba(16,185,129,0.58),0_22px_48px_rgba(0,0,0,0.88)]'
              : 'border-[#00E5FF] shadow-[0_0_42px_-4px_rgba(0,229,255,0.48),inset_0_0_24px_rgba(0,229,255,0.12),0_22px_48px_rgba(0,0,0,0.88)]'
          }`}
        >
          {/* Specular Top Icy-Cyan Rim Highlight */}
          <div
            aria-hidden="true"
            className={`pointer-events-none absolute inset-x-6 top-0 h-px bg-gradient-to-r from-transparent ${
              verified ? 'via-emerald-200' : 'via-[#E0F7FF]'
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
                    ? 'bg-gradient-to-b from-emerald-400/35 to-emerald-600/20 border-emerald-300/80 shadow-[0_0_24px_rgba(52,211,153,0.65)] scale-105'
                    : 'bg-gradient-to-b from-[#00E5FF]/25 via-[#2563EB]/25 to-[#050B1A]/60 border-[#00E5FF]/70 shadow-[inset_0_1px_1px_rgba(224,247,255,0.5),0_0_20px_rgba(0,229,255,0.4)]'
                }`}
              >
                {verified ? (
                  <CheckCircle2 className="w-6 h-6 text-emerald-300 drop-shadow-[0_0_10px_rgba(52,211,153,0.85)]" />
                ) : (
                  <ShieldCheck className="w-6 h-6 text-[#99F6FF] drop-shadow-[0_0_10px_rgba(0,229,255,0.85)]" />
                )}
              </div>
            </div>

            <div className="space-y-1">
              <h1
                id="quick-security-check-title"
                className="font-display text-lg font-extrabold tracking-tight bg-gradient-to-r from-[#F8FAFC] via-[#BAE6FD] to-[#00E5FF] bg-clip-text text-transparent drop-shadow-[0_0_14px_rgba(0,229,255,0.6)] leading-tight"
              >
                Quick Security Check
              </h1>
              <p className="text-[11.5px] text-[#DCEBFF] leading-snug text-balance">
                Tap the Clapperboard icon below to verify you are human and unlock free streaming.
              </p>
            </div>
          </div>

          {/* Verified Emerald Burst State OR Single-Row 4 Glossy Cobalt-Blue Circular Buttons */}
          {verified ? (
            <div
              role="status"
              aria-live="polite"
              className="relative rounded-2xl bg-gradient-to-r from-emerald-950/75 via-emerald-900/55 to-emerald-950/75 border border-emerald-400/70 px-4 py-3.5 flex items-center justify-center gap-2.5 shadow-[0_0_28px_rgba(16,185,129,0.4)] memory-card-matched-pop overflow-hidden"
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
                className={`grid grid-cols-4 gap-2 p-2 rounded-full bg-[#030712]/80 border border-[#00E5FF]/35 shadow-[inset_0_2px_10px_rgba(0,0,0,0.85),0_0_18px_rgba(0,229,255,0.14)] ${
                  attemptCount > 0 ? 'security-wrong-shake' : ''
                }`}
              >
                {options.map(({ id, label, emoji }) => (
                  <button
                    key={id}
                    type="button"
                    onClick={() => handleSelectIcon(id)}
                    aria-label={label}
                    className="group relative w-12 h-12 mx-auto rounded-full bg-gradient-to-b from-[#3B82F6] via-[#1D4ED8] to-[#0F2A6B] border border-[#67E8F9]/60 hover:border-[#00E5FF] shadow-[inset_0_1.5px_2px_rgba(224,247,255,0.6),inset_0_-3px_6px_rgba(4,10,28,0.88),0_5px_15px_rgba(0,229,255,0.28)] flex items-center justify-center overflow-hidden hover:-translate-y-0.5 active:scale-90 transition-all duration-200 cursor-pointer focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-[#00E5FF]"
                  >
                    {/* Glossy 3D Top Glass Reflection */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-x-1.5 top-0.5 h-1/2 rounded-full bg-gradient-to-b from-white/35 to-transparent"
                    />
                    {/* Hover / Tap Shimmer Sweep */}
                    <span
                      aria-hidden="true"
                      className="pointer-events-none absolute inset-y-0 -left-full w-2/3 skew-x-[-20deg] bg-gradient-to-r from-transparent via-[#E0F7FF]/45 to-transparent group-hover:translate-x-[280%] transition-transform duration-500 ease-out"
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
                  className="text-[11px] font-semibold text-[#67E8F9] leading-tight"
                >
                  {wrongMessage}
                </p>
              )}
            </div>
          )}

          <p className="text-[10.5px] font-medium text-[#93C5FD]/80">
            100% Free · No sign-in required
          </p>
        </div>
      </div>
    </div>
  );
};
