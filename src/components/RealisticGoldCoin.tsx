import React, { useId } from 'react';

interface RealisticGoldCoinProps {
  sizePx?: number;
  emblem?: '$' | '★';
  className?: string;
}

export const RealisticGoldCoin: React.FC<RealisticGoldCoinProps> = ({
  sizePx = 56,
  emblem = '$',
  className = '',
}) => {
  const uid = useId().replace(/:/g, '');

  return (
    <svg
      width={sizePx}
      height={sizePx}
      viewBox="0 0 64 64"
      className={`drop-shadow-[0_6px_12px_rgba(0,0,0,0.72)] drop-shadow-[0_0_16px_rgba(243,211,122,0.58)] ${className}`}
      aria-hidden="true"
    >
      <defs>
        {/* 3D Milled Side Edge Gradient */}
        <linearGradient id={`coinEdge-${uid}`} x1="0%" y1="0%" x2="100%" y2="0%">
          <stop offset="0%" stopColor="#4F3403" />
          <stop offset="18%" stopColor="#B68214" />
          <stop offset="38%" stopColor="#FCE79C" />
          <stop offset="55%" stopColor="#8C5F08" />
          <stop offset="78%" stopColor="#E6B93D" />
          <stop offset="100%" stopColor="#472E02" />
        </linearGradient>

        {/* Outer Chamfer Bevel Ring */}
        <linearGradient id={`coinBevel-${uid}`} x1="12%" y1="8%" x2="88%" y2="92%">
          <stop offset="0%" stopColor="#FFFDF2" />
          <stop offset="28%" stopColor="#F9DA74" />
          <stop offset="58%" stopColor="#C48F17" />
          <stop offset="84%" stopColor="#FFE999" />
          <stop offset="100%" stopColor="#6D4804" />
        </linearGradient>

        {/* Brushed 24k Gold Face */}
        <radialGradient id={`coinFace-${uid}`} cx="34%" cy="28%" r="74%">
          <stop offset="0%" stopColor="#FFFDF0" />
          <stop offset="22%" stopColor="#FFE484" />
          <stop offset="54%" stopColor="#DFA827" />
          <stop offset="82%" stopColor="#A9740B" />
          <stop offset="100%" stopColor="#6B4503" />
        </radialGradient>

        {/* Inner Recessed Minted Well */}
        <radialGradient id={`coinWell-${uid}`} cx="62%" cy="66%" r="76%">
          <stop offset="0%" stopColor="#F8D261" />
          <stop offset="45%" stopColor="#CE971E" />
          <stop offset="82%" stopColor="#946407" />
          <stop offset="100%" stopColor="#5D3B02" />
        </radialGradient>

        {/* Specular Light Sheen */}
        <linearGradient id={`coinSheen-${uid}`} x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor="rgba(255,255,255,0.82)" />
          <stop offset="35%" stopColor="rgba(255,252,224,0.28)" />
          <stop offset="68%" stopColor="rgba(255,255,255,0)" />
        </linearGradient>

        {/* Embossed Relief Face */}
        <linearGradient id={`coinRelief-${uid}`} x1="15%" y1="10%" x2="85%" y2="90%">
          <stop offset="0%" stopColor="#FFFDF2" />
          <stop offset="45%" stopColor="#FCE07A" />
          <stop offset="100%" stopColor="#BA8312" />
        </linearGradient>
      </defs>

      {/* Extruded 3D Cylindrical Thickness Rim */}
      <ellipse cx="32" cy="34.5" rx="25" ry="24.2" fill={`url(#coinEdge-${uid})`} />

      {/* Milled / Ridged Coin Edge Fluting */}
      <ellipse
        cx="32"
        cy="34.2"
        rx="24.6"
        ry="23.8"
        fill="none"
        stroke="#3A2401"
        strokeWidth="2.4"
        strokeDasharray="1.5 2.1"
        opacity="0.72"
      />
      <ellipse
        cx="32"
        cy="33.5"
        rx="24.6"
        ry="23.8"
        fill="none"
        stroke="#FFF2B8"
        strokeWidth="1"
        strokeDasharray="1.5 2.1"
        opacity="0.45"
      />

      {/* Primary Raised Bevel Coin Face */}
      <circle
        cx="32"
        cy="29.5"
        r="24.8"
        fill={`url(#coinFace-${uid})`}
        stroke={`url(#coinBevel-${uid})`}
        strokeWidth="2.4"
      />

      {/* Brushed Metallic Concentric Ring Grooves */}
      <circle
        cx="32"
        cy="29.5"
        r="20.4"
        fill={`url(#coinWell-${uid})`}
        stroke="#704904"
        strokeWidth="1.2"
      />
      <circle
        cx="32"
        cy="29.5"
        r="19.2"
        fill="none"
        stroke="#FCE89D"
        strokeWidth="0.9"
        opacity="0.55"
      />

      {/* Fine Milled Inner Coin Rim */}
      <circle
        cx="32"
        cy="29.5"
        r="17.2"
        fill="none"
        stroke="#FFE793"
        strokeWidth="1.4"
        strokeDasharray="1.7 2.2"
        opacity="0.78"
      />

      {/* Glossy Specular Sheen Across Upper Left */}
      <path
        d="M11.5 22 A22 22 0 0 1 48 13 L21.5 47 A22 22 0 0 1 11.5 22 Z"
        fill={`url(#coinSheen-${uid})`}
      />

      {/* Crisp Embossed Currency ($) or Star (★) Relief */}
      {emblem === '$' ? (
        <g>
          {/* Dark under-shadow relief */}
          <text
            x="33.1"
            y="38.2"
            textAnchor="middle"
            fontSize="24"
            fontWeight="900"
            fontFamily="Georgia, serif"
            fill="#4A2F02"
            opacity="0.82"
          >
            $
          </text>
          {/* Top-left bright bevel */}
          <text
            x="31.5"
            y="36.6"
            textAnchor="middle"
            fontSize="24"
            fontWeight="900"
            fontFamily="Georgia, serif"
            fill="#FFFDF0"
            opacity="0.9"
          >
            $
          </text>
          {/* Main minted gold relief */}
          <text
            x="32"
            y="37.2"
            textAnchor="middle"
            fontSize="24"
            fontWeight="900"
            fontFamily="Georgia, serif"
            fill={`url(#coinRelief-${uid})`}
          >
            $
          </text>
        </g>
      ) : (
        <g>
          {/* Dark under-shadow relief */}
          <path
            d="M33 17.8l3.1 7.2 7.8.6-5.9 5.1 1.8 7.6-6.8-4.1-6.8 4.1 1.8-7.6-5.9-5.1 7.8-.6z"
            fill="#4A2F02"
            opacity="0.82"
          />
          {/* Top-left highlight bevel */}
          <path
            d="M31.4 16.2l3.1 7.2 7.8.6-5.9 5.1 1.8 7.6-6.8-4.1-6.8 4.1 1.8-7.6-5.9-5.1 7.8-.6z"
            fill="#FFFDF0"
            opacity="0.9"
          />
          {/* Main minted star relief */}
          <path
            d="M32 16.8l3.1 7.2 7.8.6-5.9 5.1 1.8 7.6-6.8-4.1-6.8 4.1 1.8-7.6-5.9-5.1 7.8-.6z"
            fill={`url(#coinRelief-${uid})`}
          />
        </g>
      )}

      {/* Subtle Crisp Starburst Sparkle on Upper Right Chamfer */}
      <path
        d="M47.5 11.5l1 2.4 2.4 1-2.4 1-1 2.4-1-2.4-2.4-1 2.4-1z"
        fill="#FFFFFF"
        opacity="0.92"
      />
    </svg>
  );
};
