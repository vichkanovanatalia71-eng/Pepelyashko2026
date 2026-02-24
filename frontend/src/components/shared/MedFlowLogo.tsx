interface MedFlowLogoProps {
  size?: number;
  className?: string;
}

/**
 * MedFlow logo — pill/capsule shape divided into 4 quadrants:
 * top-left: $ (dollar), top-right: + (medical cross),
 * bottom quadrants: decorative arcs.
 * Orange (#f97316) on transparent background.
 */
export default function MedFlowLogo({ size = 24, className }: MedFlowLogoProps) {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 72"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={className}
      aria-hidden="true"
    >
      {/* Top-left quadrant */}
      <path
        d="M4 16C4 7.16 11.16 0 20 0H30V33H4V16Z"
        fill="currentColor"
      />
      {/* Top-right quadrant */}
      <path
        d="M34 0H44C52.84 0 60 7.16 60 16V33H34V0Z"
        fill="currentColor"
      />
      {/* Bottom-left quadrant */}
      <path
        d="M4 37H30V72H20C11.16 72 4 64.84 4 56V37Z"
        fill="currentColor"
      />
      {/* Bottom-right quadrant */}
      <path
        d="M34 37H60V56C60 64.84 52.84 72 44 72H34V37Z"
        fill="currentColor"
      />

      {/* Corner arcs (decorative depth lines) */}
      {/* Top-left inner arc */}
      <path
        d="M8 22C8 13 13 8 22 8"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Top-right inner arc */}
      <path
        d="M56 22C56 13 51 8 42 8"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bottom-left inner arc */}
      <path
        d="M8 50C8 59 13 64 22 64"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />
      {/* Bottom-right inner arc */}
      <path
        d="M56 50C56 59 51 64 42 64"
        stroke="rgba(0,0,0,0.35)"
        strokeWidth="2.5"
        strokeLinecap="round"
        fill="none"
      />

      {/* Dollar sign ($) — top-left quadrant */}
      <text
        x="17"
        y="25"
        textAnchor="middle"
        dominantBaseline="central"
        fill="rgba(0,0,0,0.7)"
        fontSize="22"
        fontWeight="800"
        fontFamily="system-ui, -apple-system, sans-serif"
      >
        $
      </text>

      {/* Medical cross (+) — top-right quadrant */}
      {/* Vertical bar */}
      <rect x="44" y="9" width="6" height="20" rx="2" fill="rgba(0,0,0,0.7)" />
      {/* Horizontal bar */}
      <rect x="38" y="16" width="18" height="6" rx="2" fill="rgba(0,0,0,0.7)" />
    </svg>
  );
}
