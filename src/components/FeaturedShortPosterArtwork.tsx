import React from 'react';
import { FeaturedShortDrama } from '../utils/externalCatalog';

interface FeaturedShortPosterArtworkProps {
  item: FeaturedShortDrama;
  showCenterTitle?: boolean;
  variant?: 'card' | 'stage';
}

const DramaMotifSvg: React.FC<{ id: string }> = ({ id }) => {
  switch (id) {
    case 'top-short-tainted-desire':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-90 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="td-glow" cx="55%" cy="32%" r="55%">
              <stop offset="0%" stopColor="#E11D48" stopOpacity="0.52" />
              <stop offset="55%" stopColor="#881337" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#09070B" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="td-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" />
              <stop offset="50%" stopColor="#F43F5E" />
              <stop offset="100%" stopColor="#D4AF37" />
            </linearGradient>
          </defs>
          <rect width="240" height="360" fill="url(#td-glow)" />
          <path
            d="M35 60 L125 140 L95 190 L165 250 M185 45 L125 140 L195 155"
            stroke="rgba(255,255,255,0.14)"
            strokeWidth="1.2"
            fill="none"
          />
          <circle cx="122" cy="128" r="56" fill="none" stroke="url(#td-gold)" strokeWidth="1.4" strokeOpacity="0.55" />
          <path
            d="M122 174 C92 152 78 128 84 106 C89 89 109 86 122 102 C135 86 155 89 160 106 C166 128 152 152 122 174 Z"
            fill="rgba(225,29,72,0.28)"
            stroke="url(#td-gold)"
            strokeWidth="2"
          />
          <path
            d="M122 86 L116 116 L130 132 L117 154 L125 184"
            stroke="#FDE68A"
            strokeWidth="1.8"
            strokeLinecap="round"
            fill="none"
            opacity="0.85"
          />
          <path
            d="M104 195 Q122 225 122 280 M122 224 Q142 214 150 202 M122 246 Q102 238 94 226"
            stroke="#FDA4AF"
            strokeWidth="1.5"
            strokeOpacity="0.5"
            fill="none"
          />
        </svg>
      );

    case 'top-short-american-tenant':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="at-moon" cx="72%" cy="24%" r="48%">
              <stop offset="0%" stopColor="#FBBF24" stopOpacity="0.45" />
              <stop offset="45%" stopColor="#1D4ED8" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#080A12" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="at-steel" x1="0%" y1="0%" x2="0%" y2="100%">
              <stop offset="0%" stopColor="#FDE68A" stopOpacity="0.65" />
              <stop offset="100%" stopColor="#1E293B" stopOpacity="0.25" />
            </linearGradient>
          </defs>
          <rect width="240" height="360" fill="url(#at-moon)" />
          <circle cx="174" cy="84" r="34" fill="#FBBF24" fillOpacity="0.16" stroke="#FDE68A" strokeWidth="1" strokeOpacity="0.45" />
          {/* Skyline Towers */}
          <rect x="18" y="138" width="38" height="222" fill="#0B1220" stroke="#D4AF37" strokeOpacity="0.25" />
          <rect x="64" y="88" width="52" height="272" fill="#0F172A" stroke="#FBBF24" strokeOpacity="0.4" />
          <polygon points="90,54 64,88 116,88" fill="#1E293B" stroke="#FDE68A" strokeOpacity="0.45" />
          <rect x="124" y="114" width="44" height="246" fill="#0B1324" stroke="#60A5FA" strokeOpacity="0.3" />
          <rect x="176" y="150" width="46" height="210" fill="#080D1A" stroke="#D4AF37" strokeOpacity="0.25" />
          {/* Illuminated Penthouse Windows */}
          <g fill="#FDE68A" fillOpacity="0.7">
            <rect x="74" y="102" width="8" height="12" rx="1" />
            <rect x="86" y="102" width="8" height="12" rx="1" />
            <rect x="98" y="102" width="8" height="12" rx="1" />
            <rect x="74" y="122" width="8" height="12" rx="1" fillOpacity="0.35" />
            <rect x="98" y="122" width="8" height="12" rx="1" />
            <rect x="134" y="130" width="8" height="10" rx="1" fillOpacity="0.55" />
            <rect x="148" y="130" width="8" height="10" rx="1" fillOpacity="0.8" />
          </g>
          {/* Art Deco Key Emblem */}
          <circle cx="120" cy="146" r="14" fill="none" stroke="url(#at-steel)" strokeWidth="2.2" />
          <path d="M120 160 L120 202 M120 184 L130 184 M120 194 L128 194" stroke="#FDE68A" strokeWidth="2.2" strokeLinecap="round" />
        </svg>
      );

    case 'top-short-dragon-ear':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="de-aura" cx="50%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#A855F7" stopOpacity="0.55" />
              <stop offset="50%" stopColor="#6D28D9" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#08070D" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="de-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF08A" />
              <stop offset="55%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#C084FC" />
            </linearGradient>
          </defs>
          <rect width="240" height="360" fill="url(#de-aura)" />
          <circle cx="120" cy="136" r="68" fill="none" stroke="url(#de-gold)" strokeWidth="1.2" strokeDasharray="4 4" opacity="0.65" />
          <circle cx="120" cy="136" r="52" fill="none" stroke="#E9D5FF" strokeWidth="1" opacity="0.35" />
          {/* Stylized Dragon Horn & Scale Spiral */}
          <path
            d="M72 175 C54 130 78 76 126 70 C166 65 190 98 178 134 C168 162 136 170 116 156 C98 144 102 118 122 112 C138 108 148 120 142 134"
            fill="none"
            stroke="url(#de-gold)"
            strokeWidth="3.2"
            strokeLinecap="round"
          />
          <path
            d="M84 96 L64 68 L96 80 M156 76 L186 58 L170 92"
            fill="rgba(251,191,36,0.28)"
            stroke="#FDE68A"
            strokeWidth="1.6"
          />
          <g fill="#FEF08A" opacity="0.75">
            <circle cx="62" cy="112" r="2" />
            <circle cx="188" cy="118" r="2.5" />
            <circle cx="144" cy="54" r="1.8" />
            <circle cx="88" cy="198" r="2.2" />
          </g>
        </svg>
      );

    case 'top-short-forbidden-vampire':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="fv-moon" cx="50%" cy="32%" r="52%">
              <stop offset="0%" stopColor="#DC2626" stopOpacity="0.68" />
              <stop offset="50%" stopColor="#7F1D1D" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#090609" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="240" height="360" fill="url(#fv-moon)" />
          {/* Blood Moon & Eclipse */}
          <circle cx="120" cy="116" r="56" fill="#991B1B" fillOpacity="0.55" stroke="#FCA5A5" strokeWidth="1.5" strokeOpacity="0.65" />
          <circle cx="136" cy="108" r="46" fill="#12070B" fillOpacity="0.72" />
          {/* Gothic Manor Spires */}
          <path
            d="M15 270 L15 190 L35 148 L55 190 L55 270 M88 270 L88 175 L120 112 L152 175 L152 270 M185 270 L185 190 L205 148 L225 190 L225 270"
            fill="#0C0609"
            stroke="#EF4444"
            strokeWidth="1.2"
            strokeOpacity="0.45"
          />
          {/* Crimson Fangs / Chalice Crest */}
          <path
            d="M96 154 L104 186 L112 154 M128 154 L136 186 L144 154"
            fill="#FDE68A"
            fillOpacity="0.88"
            stroke="#EF4444"
            strokeWidth="1"
          />
          <circle cx="104" cy="196" r="3" fill="#EF4444" />
          <circle cx="136" cy="204" r="2.2" fill="#EF4444" opacity="0.8" />
        </svg>
      );

    case 'top-short-wrong-crown':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="wc-glow" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#F59E0B" stopOpacity="0.52" />
              <stop offset="55%" stopColor="#78350F" stopOpacity="0.22" />
              <stop offset="100%" stopColor="#09080A" stopOpacity="0" />
            </radialGradient>
            <linearGradient id="wc-gold" x1="0%" y1="0%" x2="100%" y2="100%">
              <stop offset="0%" stopColor="#FEF3C7" />
              <stop offset="48%" stopColor="#F59E0B" />
              <stop offset="100%" stopColor="#92400E" />
            </linearGradient>
          </defs>
          <rect width="240" height="360" fill="url(#wc-glow)" />
          {/* Royal Light Rays */}
          <polygon points="120,0 45,250 195,250" fill="#FBBF24" fillOpacity="0.06" />
          {/* Tilted Sovereign Crown */}
          <g transform="translate(120 128) rotate(-8)">
            <path
              d="M-58 26 L-68 -26 L-32 4 L0 -40 L32 4 L68 -26 L58 26 Z"
              fill="url(#wc-gold)"
              fillOpacity="0.32"
              stroke="url(#wc-gold)"
              strokeWidth="2.8"
              strokeLinejoin="round"
            />
            <rect x="-58" y="28" width="116" height="12" rx="3" fill="url(#wc-gold)" fillOpacity="0.55" />
            <circle cx="0" cy="-42" r="5" fill="#FEF3C7" />
            <circle cx="-68" cy="-28" r="4" fill="#FBBF24" />
            <circle cx="68" cy="-28" r="4" fill="#FBBF24" />
            <polygon points="0,-6 8,6 0,18 -8,6" fill="#EF4444" stroke="#FEF3C7" strokeWidth="1" />
          </g>
        </svg>
      );

    case 'top-short-chained-satan':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="cs-fire" cx="50%" cy="38%" r="55%">
              <stop offset="0%" stopColor="#EA580C" stopOpacity="0.52" />
              <stop offset="50%" stopColor="#991B1B" stopOpacity="0.28" />
              <stop offset="100%" stopColor="#090608" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="240" height="360" fill="url(#cs-fire)" />
          {/* Obsidian Sigil Ring */}
          <circle cx="120" cy="134" r="56" fill="none" stroke="#FB923C" strokeWidth="1.5" strokeOpacity="0.5" />
          <polygon points="120,78 168,164 72,164" fill="none" stroke="#F87171" strokeWidth="1.4" strokeOpacity="0.45" />
          {/* Horned Emblem */}
          <path
            d="M84 114 C68 88 76 62 96 58 C88 78 94 98 106 108 M156 114 C172 88 164 62 144 58 C152 78 146 98 134 108"
            fill="rgba(249,115,22,0.3)"
            stroke="#FDBA74"
            strokeWidth="2"
          />
          {/* Heavy Crossing Chain Links */}
          <g stroke="#FBBF24" strokeWidth="2.4" fill="none" opacity="0.72">
            <rect x="44" y="102" width="24" height="10" rx="5" transform="rotate(24 56 107)" />
            <rect x="68" y="112" width="24" height="10" rx="5" transform="rotate(24 80 117)" />
            <rect x="92" y="122" width="24" height="10" rx="5" transform="rotate(24 104 127)" />
            <rect x="116" y="132" width="24" height="10" rx="5" transform="rotate(24 128 137)" />
            <rect x="140" y="142" width="24" height="10" rx="5" transform="rotate(24 152 147)" />
            <rect x="164" y="152" width="24" height="10" rx="5" transform="rotate(24 176 157)" />
            <rect x="46" y="154" width="24" height="10" rx="5" transform="rotate(-24 58 159)" />
            <rect x="72" y="142" width="24" height="10" rx="5" transform="rotate(-24 84 147)" />
            <rect x="144" y="110" width="24" height="10" rx="5" transform="rotate(-24 156 115)" />
            <rect x="170" y="98" width="24" height="10" rx="5" transform="rotate(-24 182 103)" />
          </g>
        </svg>
      );

    case 'top-short-alpha-virgin':
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="av-moon" cx="50%" cy="30%" r="52%">
              <stop offset="0%" stopColor="#F472B6" stopOpacity="0.48" />
              <stop offset="50%" stopColor="#701A75" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#08070C" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="240" height="360" fill="url(#av-moon)" />
          {/* Silver-Rose Full Moon */}
          <circle cx="120" cy="108" r="54" fill="#FCE7F3" fillOpacity="0.16" stroke="#F9A8D4" strokeWidth="1.6" strokeOpacity="0.6" />
          <circle cx="120" cy="108" r="68" fill="none" stroke="#F472B6" strokeWidth="0.9" strokeOpacity="0.3" />
          {/* Misty Pine Ridge & Wolf Crest Silhouette */}
          <path
            d="M0 240 L30 198 L52 222 L80 185 L106 218 L120 156 L136 184 L152 178 L166 215 L196 188 L240 236 L240 360 L0 360 Z"
            fill="#0D0711"
            stroke="#F472B6"
            strokeWidth="1.2"
            strokeOpacity="0.4"
          />
          <path
            d="M106 168 L114 134 L126 118 L136 126 L132 140 L144 150 L134 166"
            fill="#FBCFE8"
            fillOpacity="0.35"
            stroke="#FCE7F3"
            strokeWidth="1.6"
          />
        </svg>
      );

    case 'top-short-four-wild-husbands':
    default:
      return (
        <svg
          viewBox="0 0 240 360"
          className="absolute inset-0 w-full h-full opacity-95 pointer-events-none"
          preserveAspectRatio="xMidYMid slice"
          aria-hidden="true"
        >
          <defs>
            <radialGradient id="fh-warm" cx="50%" cy="35%" r="55%">
              <stop offset="0%" stopColor="#FB7185" stopOpacity="0.48" />
              <stop offset="50%" stopColor="#9A3412" stopOpacity="0.25" />
              <stop offset="100%" stopColor="#08070B" stopOpacity="0" />
            </radialGradient>
          </defs>
          <rect width="240" height="360" fill="url(#fh-warm)" />
          {/* Chandelier Spotlight */}
          <polygon points="120,0 24,250 216,250" fill="#FDE68A" fillOpacity="0.06" />
          {/* Four Interlocking Gold Rings */}
          <g fill="none" stroke="#FBBF24" strokeWidth="2.4" opacity="0.78">
            <circle cx="88" cy="116" r="24" />
            <circle cx="152" cy="116" r="24" stroke="#FDA4AF" />
            <circle cx="102" cy="148" r="24" stroke="#FDE68A" />
            <circle cx="138" cy="148" r="24" />
          </g>
          {/* Central Crowned Diamond */}
          <polygon
            points="120,104 134,130 120,156 106,130"
            fill="rgba(251,191,36,0.35)"
            stroke="#FEF3C7"
            strokeWidth="1.8"
          />
        </svg>
      );
  }
};

export const FeaturedShortPosterArtwork: React.FC<FeaturedShortPosterArtworkProps> = ({
  item,
  showCenterTitle = true,
  variant = 'card',
}) => {
  const [imgFailed, setImgFailed] = React.useState(false);

  return (
    <div
      className={`absolute inset-0 bg-gradient-to-br ${item.accentGradient} overflow-hidden select-none`}
    >
      {/* Fallback Stylized Vector Layer (shown only if cover photo fails) */}
      {(!item.coverImage || imgFailed) && (
        <>
          <div className="pointer-events-none absolute -top-12 -right-10 w-40 h-40 rounded-full bg-[#D4AF37]/15 blur-2xl" />
          <div className="pointer-events-none absolute -bottom-12 -left-10 w-44 h-44 rounded-full bg-rose-500/12 blur-2xl" />
          <DramaMotifSvg id={item.id} />
        </>
      )}

      {/* High-Resolution Moody Dark-Cinematic Portrait Photography (100% Full Brightness & Contrast) */}
      {item.coverImage && !imgFailed && (
        <img
          src={item.coverImage}
          alt={item.title}
          onError={() => setImgFailed(true)}
          className="w-full h-full object-cover object-[center_22%] opacity-100 brightness-100 contrast-100 transition-transform duration-700 ease-out group-hover:scale-[1.05]"
        />
      )}

      {/* Bottom-only vignette (from transparent at 60% height to dark black at bottom) */}
      {showCenterTitle && (
        <div className="pointer-events-none absolute inset-x-0 bottom-0 h-[45%] bg-gradient-to-t from-black via-black/75 to-transparent" />
      )}

      {/* Subtle Poster Frame Hairline */}
      <div className="pointer-events-none absolute inset-2 rounded-xl border border-white/[0.08]" />

      {/* Optional Bold Poster Typography Layer */}
      {showCenterTitle && (
        <div
          className={`pointer-events-none absolute inset-x-0 flex flex-col items-center text-center px-3 ${
            variant === 'stage'
              ? 'top-1/2 -translate-y-1/2 gap-3 max-w-md mx-auto'
              : 'top-[38%] -translate-y-1/4 gap-1'
          }`}
        >
          <span
            className={`font-mono-num uppercase tracking-[0.2em] text-[#FDE68A]/90 drop-shadow-[0_2px_6px_rgba(0,0,0,0.95)] ${
              variant === 'stage' ? 'text-[11px] font-bold' : 'text-[8px] font-bold'
            }`}
          >
            {item.tagline}
          </span>
          <div
            className={`font-display font-black uppercase tracking-tight leading-[1.04] bg-gradient-to-b from-[#FFFDF7] via-[#FDE68A] to-[#D4AF37] bg-clip-text text-transparent drop-shadow-[0_4px_12px_rgba(0,0,0,0.95)] text-balance ${
              variant === 'stage'
                ? 'text-3xl sm:text-4xl'
                : 'text-[15px] sm:text-[17px] line-clamp-3'
            }`}
          >
            {item.title}
          </div>
          <div className="w-10 h-0.5 rounded-full bg-gradient-to-r from-transparent via-[#FBBF24]/80 to-transparent" />
        </div>
      )}
    </div>
  );
};
