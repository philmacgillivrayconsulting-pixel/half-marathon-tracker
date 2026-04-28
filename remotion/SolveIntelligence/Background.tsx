import {AbsoluteFill, useCurrentFrame} from 'remotion';
import {COLORS} from './config';

export const Background: React.FC = () => {
  const frame = useCurrentFrame();
  const drift = (frame / 30) * 8;

  return (
    <AbsoluteFill
      style={{
        background: `radial-gradient(circle at 20% 20%, ${COLORS.bgLight} 0%, ${COLORS.bgMid} 35%, ${COLORS.bgDeep} 75%)`,
      }}
    >
      <AbsoluteFill
        style={{
          backgroundImage: `linear-gradient(${COLORS.panelBorder} 1px, transparent 1px), linear-gradient(90deg, ${COLORS.panelBorder} 1px, transparent 1px)`,
          backgroundSize: '80px 80px',
          backgroundPosition: `${drift}px ${drift}px`,
          opacity: 0.18,
          maskImage:
            'radial-gradient(circle at 50% 50%, black 0%, transparent 80%)',
          WebkitMaskImage:
            'radial-gradient(circle at 50% 50%, black 0%, transparent 80%)',
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 80% 90%, ${COLORS.highlight}22 0%, transparent 45%)`,
        }}
      />
      <AbsoluteFill
        style={{
          background: `radial-gradient(circle at 10% 80%, ${COLORS.cyan}1A 0%, transparent 40%)`,
        }}
      />
    </AbsoluteFill>
  );
};
