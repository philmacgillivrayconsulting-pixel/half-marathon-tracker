import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';
import {Logo} from '../Logo';

export const IntroScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const logoScale = spring({frame, fps, config: {damping: 14, stiffness: 110}});
  const titleOpacity = interpolate(frame, [18, 36], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const titleY = interpolate(frame, [18, 36], [30, 0], {
    extrapolateRight: 'clamp',
  });
  const tagOpacity = interpolate(frame, [38, 58], [0, 1], {
    extrapolateRight: 'clamp',
  });
  const tagY = interpolate(frame, [38, 58], [20, 0], {
    extrapolateRight: 'clamp',
  });
  const lineWidth = interpolate(frame, [56, 80], [0, 240], {
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
      <div style={{transform: `scale(${logoScale})`}}>
        <Logo size={180} />
      </div>
      <div
        style={{
          opacity: titleOpacity,
          transform: `translateY(${titleY}px)`,
          marginTop: 40,
          fontSize: 96,
          fontWeight: 700,
          letterSpacing: -2,
          color: COLORS.text,
        }}
      >
        Solve <span style={{color: COLORS.accentBright}}>Intelligence</span>
      </div>
      <div
        style={{
          width: lineWidth,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${COLORS.accentBright}, transparent)`,
          marginTop: 24,
        }}
      />
      <div
        style={{
          opacity: tagOpacity,
          transform: `translateY(${tagY}px)`,
          marginTop: 24,
          fontSize: 36,
          fontWeight: 400,
          letterSpacing: 0.5,
          color: COLORS.textMuted,
        }}
      >
        The AI Copilot for IP Law
      </div>
    </AbsoluteFill>
  );
};
