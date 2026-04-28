import {AbsoluteFill, interpolate, useCurrentFrame} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

const Pill: React.FC<{label: string; delay: number; strike: boolean}> = ({
  label,
  delay,
  strike,
}) => {
  const frame = useCurrentFrame();
  const enter = interpolate(frame, [delay, delay + 12], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const strikeProgress = interpolate(
    frame,
    [delay + 30, delay + 48],
    [0, 100],
    {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
  );

  return (
    <div
      style={{
        opacity: enter,
        transform: `translateY(${(1 - enter) * 16}px)`,
        position: 'relative',
        padding: '18px 32px',
        borderRadius: 999,
        border: `1px solid ${COLORS.panelBorder}`,
        background: COLORS.panel,
        color: COLORS.textMuted,
        fontSize: 30,
        fontWeight: 500,
        margin: '0 10px',
      }}
    >
      {label}
      {strike && (
        <div
          style={{
            position: 'absolute',
            left: 16,
            right: `calc(100% - 16px - ${strikeProgress}%)`,
            top: '50%',
            height: 3,
            background: COLORS.highlight,
            borderRadius: 2,
            transform: 'translateY(-50%)',
            width: `${strikeProgress}%`,
            maxWidth: 'calc(100% - 32px)',
          }}
        />
      )}
    </div>
  );
};

export const ProblemScene: React.FC = () => {
  const frame = useCurrentFrame();

  const headlineOpacity = interpolate(frame, [0, 18], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const headlineY = interpolate(frame, [0, 18], [20, 0], {
    extrapolateRight: 'clamp',
  });

  return (
    <AbsoluteFill
      style={{
        alignItems: 'center',
        justifyContent: 'center',
        fontFamily: FONT_STACK,
      }}
    >
      <div
        style={{
          opacity: headlineOpacity,
          transform: `translateY(${headlineY}px)`,
          fontSize: 72,
          fontWeight: 700,
          letterSpacing: -1.5,
          color: COLORS.text,
          marginBottom: 56,
          textAlign: 'center',
        }}
      >
        Patent work used to mean{' '}
        <span style={{color: COLORS.highlight}}>endless hours.</span>
      </div>
      <div style={{display: 'flex', flexWrap: 'wrap', justifyContent: 'center'}}>
        <Pill label="Drafting applications" delay={20} strike />
        <Pill label="Office actions" delay={32} strike />
        <Pill label="Claim charts" delay={44} strike />
        <Pill label="Prior-art review" delay={56} strike />
      </div>
    </AbsoluteFill>
  );
};
