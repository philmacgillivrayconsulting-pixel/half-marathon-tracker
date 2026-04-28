import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

const CLAIM_ELEMENTS = [
  'a processor configured to receive an input signal',
  'a memory storing instructions for an attention model',
  'output logic generating a labeled response',
];

const EVIDENCE = [
  ['Smith ¶[0023]', 'Chen Fig. 4', 'Liu col. 7 ln. 12'],
  ['Smith ¶[0041]', 'Chen ¶[0019]', '—'],
  ['Smith claim 7', '—', 'Liu Fig. 9'],
];

export const ChartsScene: React.FC = () => {
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
          Feature 03 · Charts
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
          Claim charts, <span style={{color: COLORS.accentBright}}>auto-mapped to evidence.</span>
        </div>
      </div>

      <div
        style={{
          marginTop: 48,
          background: COLORS.panel,
          border: `1px solid ${COLORS.panelBorder}`,
          borderRadius: 20,
          overflow: 'hidden',
          flex: 1,
        }}
      >
        <div
          style={{
            display: 'grid',
            gridTemplateColumns: '2fr 1fr 1fr 1fr',
            background: `${COLORS.accentBright}1A`,
            padding: '20px 28px',
            color: COLORS.text,
            fontSize: 22,
            fontWeight: 600,
            letterSpacing: 1,
            textTransform: 'uppercase',
          }}
        >
          <div>Claim element</div>
          <div>Smith</div>
          <div>Chen</div>
          <div>Liu</div>
        </div>
        {CLAIM_ELEMENTS.map((elem, i) => {
          const rowDelay = 20 + i * 22;
          const rowEnter = interpolate(
            frame,
            [rowDelay, rowDelay + 14],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          return (
            <div
              key={i}
              style={{
                display: 'grid',
                gridTemplateColumns: '2fr 1fr 1fr 1fr',
                padding: '24px 28px',
                color: COLORS.text,
                fontSize: 24,
                borderTop: `1px solid ${COLORS.panelBorder}`,
                opacity: rowEnter,
                transform: `translateY(${(1 - rowEnter) * 16}px)`,
              }}
            >
              <div style={{paddingRight: 24}}>{elem}</div>
              {EVIDENCE[i].map((cell, j) => {
                const cellDelay = rowDelay + 8 + j * 6;
                const cellEnter = interpolate(
                  frame,
                  [cellDelay, cellDelay + 10],
                  [0, 1],
                  {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
                );
                const isHit = cell !== '—';
                return (
                  <div
                    key={j}
                    style={{
                      opacity: cellEnter,
                      color: isHit ? COLORS.success : COLORS.textMuted,
                      fontFamily:
                        '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
                      fontSize: 22,
                    }}
                  >
                    {isHit ? '● ' : '○ '}
                    {cell}
                  </div>
                );
              })}
            </div>
          );
        })}
      </div>

      <div
        style={{
          marginTop: 28,
          display: 'flex',
          gap: 16,
          justifyContent: 'center',
          flexWrap: 'wrap',
        }}
      >
        {[
          'Freedom-to-operate',
          'Infringement & validity',
          'SEP mapping',
          'Litigation support',
        ].map((label, i) => {
          const tagDelay = 100 + i * 6;
          const tagEnter = interpolate(
            frame,
            [tagDelay, tagDelay + 12],
            [0, 1],
            {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
          );
          return (
            <div
              key={label}
              style={{
                opacity: tagEnter,
                transform: `translateY(${(1 - tagEnter) * 12}px)`,
                padding: '12px 24px',
                borderRadius: 999,
                border: `1px solid ${COLORS.cyan}66`,
                background: `${COLORS.cyan}14`,
                color: COLORS.cyan,
                fontSize: 22,
                fontWeight: 500,
              }}
            >
              {label}
            </div>
          );
        })}
      </div>
    </AbsoluteFill>
  );
};
