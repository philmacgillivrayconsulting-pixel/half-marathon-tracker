import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

type Stat = {
  value: number;
  suffix: string;
  prefix?: string;
  label: string;
  delay: number;
};

const STATS: Stat[] = [
  {value: 400, suffix: '+', label: 'IP teams worldwide', delay: 6},
  {value: 6, suffix: '', label: 'Continents', delay: 22},
  {value: 50, suffix: '%+', label: 'Productivity boost', delay: 38},
  {value: 20, suffix: 'h', prefix: '<1h vs ', label: 'Drafting work, in under an hour', delay: 54},
];

const StatCard: React.FC<{stat: Stat}> = ({stat}) => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const enter = spring({
    frame: frame - stat.delay,
    fps,
    config: {damping: 16, stiffness: 110},
  });
  const count = interpolate(
    frame,
    [stat.delay + 6, stat.delay + 36],
    [0, stat.value],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 24}px) scale(${0.92 + enter * 0.08})`,
        background: COLORS.panel,
        border: `1px solid ${COLORS.panelBorder}`,
        borderRadius: 24,
        padding: '40px 36px',
        flex: 1,
        minWidth: 280,
        textAlign: 'center',
      }}
    >
      <div
        style={{
          color: COLORS.accentBright,
          fontSize: 88,
          fontWeight: 800,
          letterSpacing: -2,
          fontVariantNumeric: 'tabular-nums',
        }}
      >
        {stat.prefix ?? ''}
        {Math.floor(count)}
        {stat.suffix}
      </div>
      <div
        style={{
          color: COLORS.textMuted,
          fontSize: 22,
          marginTop: 8,
          letterSpacing: 0.5,
        }}
      >
        {stat.label}
      </div>
    </div>
  );
};

export const StatsScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headerEnter = interpolate(frame, [0, 16], [0, 1], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        padding: '80px 120px',
        flexDirection: 'column',
        justifyContent: 'center',
      }}
    >
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 20}px)`,
          color: COLORS.cyan,
          fontSize: 22,
          letterSpacing: 4,
          fontWeight: 600,
          textTransform: 'uppercase',
          textAlign: 'center',
        }}
      >
        Trusted at scale
      </div>
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 20}px)`,
          color: COLORS.text,
          fontSize: 64,
          fontWeight: 700,
          letterSpacing: -1,
          marginTop: 12,
          textAlign: 'center',
          marginBottom: 56,
        }}
      >
        The IP industry runs on Solve.
      </div>
      <div style={{display: 'flex', gap: 24}}>
        {STATS.map((s) => (
          <StatCard key={s.label} stat={s} />
        ))}
      </div>
    </AbsoluteFill>
  );
};
