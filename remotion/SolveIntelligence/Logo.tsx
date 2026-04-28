import {COLORS} from './config';

export const Logo: React.FC<{size?: number; glow?: boolean}> = ({
  size = 96,
  glow = true,
}) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 100 100"
      style={{
        filter: glow
          ? `drop-shadow(0 0 24px ${COLORS.accentBright}66)`
          : undefined,
      }}
    >
      <defs>
        <linearGradient id="logo-grad" x1="0%" y1="0%" x2="100%" y2="100%">
          <stop offset="0%" stopColor={COLORS.cyan} />
          <stop offset="55%" stopColor={COLORS.accentBright} />
          <stop offset="100%" stopColor={COLORS.highlight} />
        </linearGradient>
      </defs>
      <path
        d="M50 8 L86 28 L86 60 C86 76 70 88 50 92 C30 88 14 76 14 60 L14 28 Z"
        fill="url(#logo-grad)"
        opacity="0.18"
      />
      <path
        d="M50 8 L86 28 L86 60 C86 76 70 88 50 92 C30 88 14 76 14 60 L14 28 Z"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="2.5"
      />
      <path
        d="M62 38 C62 32 56 30 50 30 C42 30 38 34 38 40 C38 52 64 48 64 62 C64 68 58 72 50 72 C42 72 36 68 36 62"
        fill="none"
        stroke="url(#logo-grad)"
        strokeWidth="4"
        strokeLinecap="round"
      />
    </svg>
  );
};
