import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

const Shield: React.FC<{progress: number}> = ({progress}) => {
  return (
    <svg width={260} height={260} viewBox="0 0 100 100">
      <defs>
        <linearGradient id="shield-grad" x1="0%" y1="0%" x2="0%" y2="100%">
          <stop offset="0%" stopColor={COLORS.cyan} />
          <stop offset="100%" stopColor={COLORS.accentBright} />
        </linearGradient>
      </defs>
      <path
        d="M50 10 L82 24 L82 52 C82 70 68 84 50 90 C32 84 18 70 18 52 L18 24 Z"
        fill={`url(#shield-grad)`}
        opacity={0.18}
      />
      <path
        d="M50 10 L82 24 L82 52 C82 70 68 84 50 90 C32 84 18 70 18 52 L18 24 Z"
        fill="none"
        stroke="url(#shield-grad)"
        strokeWidth="2.5"
        strokeDasharray="240"
        strokeDashoffset={240 - progress * 240}
      />
      <path
        d="M36 52 L46 62 L66 42"
        fill="none"
        stroke={COLORS.cyan}
        strokeWidth="4"
        strokeLinecap="round"
        strokeLinejoin="round"
        strokeDasharray="60"
        strokeDashoffset={60 - Math.max(0, progress - 0.5) * 2 * 60}
      />
    </svg>
  );
};

export const TrustScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headerEnter = spring({frame, fps, config: {damping: 18, stiffness: 100}});
  const shieldProgress = interpolate(frame, [10, 70], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

  const points = [
    'Sandboxed to your team — never shared.',
    'Your data is never used to train any model.',
    'No human at Solve, or any third-party, monitors it.',
  ];

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        padding: '80px 120px',
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 24}px)`,
          color: COLORS.cyan,
          fontSize: 22,
          letterSpacing: 4,
          fontWeight: 600,
          textTransform: 'uppercase',
        }}
      >
        Built for confidential work
      </div>
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 24}px)`,
          color: COLORS.text,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -1.5,
          marginTop: 16,
          textAlign: 'center',
          maxWidth: 1100,
        }}
      >
        Your data <span style={{color: COLORS.accentBright}}>stays yours.</span>
      </div>

      <div style={{marginTop: 36}}>
        <Shield progress={shieldProgress} />
      </div>

      <div style={{marginTop: 24, display: 'flex', flexDirection: 'column', gap: 14}}>
        {points.map((p, i) => {
          const delay = 30 + i * 16;
          const e = interpolate(frame, [delay, delay + 14], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          });
          return (
            <div
              key={p}
              style={{
                opacity: e,
                transform: `translateY(${(1 - e) * 12}px)`,
                color: COLORS.text,
                fontSize: 28,
                textAlign: 'center',
              }}
            >
              {p}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
