import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';
import {Logo} from '../Logo';

export const CTAScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoScale = spring({frame, fps, config: {damping: 12, stiffness: 120}});
  const titleEnter = interpolate(frame, [10, 28], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const buttonEnter = interpolate(frame, [26, 44], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const urlEnter = interpolate(frame, [40, 60], [0, 1], {
    extrapolateRight: 'clamp',
  });

  const buttonGlow = (Math.sin(frame / 5) + 1) / 2;

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        alignItems: 'center',
        justifyContent: 'center',
      }}
    >
      <div style={{transform: `scale(${logoScale})`}}>
        <Logo size={150} />
      </div>
      <div
        style={{
          opacity: titleEnter,
          transform: `translateY(${(1 - titleEnter) * 20}px)`,
          color: COLORS.text,
          fontSize: 88,
          fontWeight: 700,
          letterSpacing: -2,
          marginTop: 28,
          textAlign: 'center',
        }}
      >
        Solve <span style={{color: COLORS.accentBright}}>Intelligence</span>
      </div>
      <div
        style={{
          opacity: titleEnter,
          color: COLORS.textMuted,
          fontSize: 32,
          marginTop: 12,
          letterSpacing: 0.5,
          textAlign: 'center',
        }}
      >
        Draft. Prosecute. Chart. Litigate. All in one place.
      </div>

      <div
        style={{
          opacity: buttonEnter,
          transform: `translateY(${(1 - buttonEnter) * 20}px)`,
          marginTop: 56,
          padding: '22px 56px',
          background: `linear-gradient(135deg, ${COLORS.accent}, ${COLORS.highlight})`,
          color: COLORS.text,
          fontSize: 30,
          fontWeight: 600,
          borderRadius: 999,
          letterSpacing: 0.5,
          boxShadow: `0 0 ${20 + buttonGlow * 30}px ${COLORS.accentBright}66`,
        }}
      >
        Try the Patent Copilot →
      </div>

      <div
        style={{
          opacity: urlEnter,
          marginTop: 28,
          color: COLORS.textMuted,
          fontSize: 26,
          letterSpacing: 1,
        }}
      >
        solveintelligence.com
      </div>
    </AbsoluteFill>
  );
};
