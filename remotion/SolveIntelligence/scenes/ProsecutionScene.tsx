import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

type Issue = {
  rejection: string;
  flaw: string;
  delay: number;
};

const ISSUES: Issue[] = [
  {
    rejection: '§102 anticipation by Smith et al.',
    flaw: 'Reference lacks the recited "attention layer".',
    delay: 36,
  },
  {
    rejection: '§103 obviousness over Chen + Liu',
    flaw: 'No teaching, suggestion or motivation to combine.',
    delay: 60,
  },
  {
    rejection: '§112(b) indefiniteness',
    flaw: 'Term has antecedent basis at claim 1 line 6.',
    delay: 84,
  },
];

export const ProsecutionScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headerEnter = spring({frame, fps, config: {damping: 18, stiffness: 100}});

  return (
    <AbsoluteFill
      style={{
        fontFamily: FONT_STACK,
        padding: '80px 120px',
        flexDirection: 'column',
      }}
    >
      <div
        style={{
          opacity: headerEnter,
          transform: `translateY(${(1 - headerEnter) * 24}px)`,
        }}
      >
        <div
          style={{
            color: COLORS.cyan,
            fontSize: 22,
            letterSpacing: 4,
            fontWeight: 600,
            textTransform: 'uppercase',
          }}
        >
          Feature 02 · Prosecution
        </div>
        <div
          style={{
            color: COLORS.text,
            fontSize: 64,
            fontWeight: 700,
            letterSpacing: -1,
            marginTop: 12,
          }}
        >
          Office actions, <span style={{color: COLORS.accentBright}}>answered with confidence.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 56,
          display: 'flex',
          flexDirection: 'column',
          gap: 22,
        }}
      >
        {ISSUES.map((issue, i) => {
          const enter = interpolate(
            frame,
            [issue.delay, issue.delay + 14],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          const flagEnter = interpolate(
            frame,
            [issue.delay + 12, issue.delay + 26],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          return (
            <div
              key={i}
              style={{
                opacity: enter,
                transform: `translateX(${(1 - enter) * -32}px)`,
                background: COLORS.panel,
                border: `1px solid ${COLORS.panelBorder}`,
                borderLeft: `4px solid ${COLORS.highlight}`,
                borderRadius: 16,
                padding: '24px 32px',
                display: 'flex',
                alignItems: 'center',
                gap: 28,
              }}
            >
              <div
                style={{
                  color: COLORS.textMuted,
                  fontSize: 22,
                  fontWeight: 600,
                  letterSpacing: 2,
                  width: 64,
                }}
              >
                {String(i + 1).padStart(2, '0')}
              </div>
              <div style={{flex: 1}}>
                <div style={{color: COLORS.text, fontSize: 30, fontWeight: 600}}>
                  {issue.rejection}
                </div>
                <div
                  style={{
                    color: COLORS.textMuted,
                    fontSize: 22,
                    marginTop: 6,
                    opacity: flagEnter,
                  }}
                >
                  Flaw detected: {issue.flaw}
                </div>
              </div>
              <div
                style={{
                  opacity: flagEnter,
                  transform: `scale(${0.6 + flagEnter * 0.4})`,
                  background: `${COLORS.highlight}26`,
                  color: COLORS.highlight,
                  border: `1px solid ${COLORS.highlight}`,
                  fontSize: 20,
                  fontWeight: 600,
                  padding: '10px 20px',
                  borderRadius: 999,
                  letterSpacing: 1,
                }}
              >
                FLAGGED
              </div>
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 'auto',
          opacity: interpolate(frame, [110, 130], [0, 1], {
            extrapolateLeft: 'clamp',
            extrapolateRight: 'clamp',
          }),
          color: COLORS.textMuted,
          fontSize: 26,
          textAlign: 'center',
          letterSpacing: 0.5,
        }}
      >
        Semantic claim analysis. Proposed response strategies. Built-in.
      </div>
    </AbsoluteFill>
  );
};
