import {AbsoluteFill, interpolate, spring, useCurrentFrame, useVideoConfig} from 'remotion';
import {COLORS, FONT_STACK} from '../config';

const SPEC_LINES = [
  'A method for [generative claim drafting], comprising:',
  'receiving, at a processor, a disclosure document;',
  'identifying, by an attention model, novel features;',
  'generating multi-jurisdictional claim language;',
  'and outputting a compliant specification.',
];

export const DraftingScene: React.FC = () => {
  const frame = useCurrentFrame();
  const {fps} = useVideoConfig();

  const headerEnter = spring({frame, fps, config: {damping: 18, stiffness: 100}});
  const docEnter = spring({frame: frame - 8, fps, config: {damping: 18, stiffness: 90}});

  const totalChars = SPEC_LINES.join(' ').length;
  const typed = Math.floor(
    interpolate(frame, [24, 130], [0, totalChars], {
      extrapolateLeft: 'clamp',
      extrapolateRight: 'clamp',
    }),
  );

  const renderTyped = () => {
    let remaining = typed;
    return SPEC_LINES.map((line, i) => {
      const visible = line.slice(0, Math.max(0, remaining));
      remaining -= line.length + 1;
      return (
        <div
          key={i}
          style={{
            color: i === 0 ? COLORS.accentBright : COLORS.text,
            fontWeight: i === 0 ? 600 : 400,
            marginBottom: 14,
            minHeight: 40,
          }}
        >
          {visible}
          {visible.length > 0 && visible.length < line.length && (
            <span style={{color: COLORS.cyan}}>▍</span>
          )}
        </div>
      );
    });
  };

  const suggestionOpacity = interpolate(frame, [80, 100], [0, 1], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });
  const suggestionY = interpolate(frame, [80, 100], [16, 0], {
    extrapolateLeft: 'clamp',
    extrapolateRight: 'clamp',
  });

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
          Feature 01 · Patent Drafting Copilot
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
          Draft applications in <span style={{color: COLORS.accentBright}}>minutes</span>, not days.
        </div>
      </div>

      <div
        style={{
          marginTop: 56,
          display: 'flex',
          gap: 32,
          opacity: docEnter,
          transform: `translateY(${(1 - docEnter) * 32}px)`,
          flex: 1,
        }}
      >
        <div
          style={{
            flex: 2,
            background: COLORS.panel,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 20,
            padding: '28px 36px',
            fontSize: 26,
            lineHeight: 1.5,
            fontFamily: '"JetBrains Mono", "SF Mono", ui-monospace, monospace',
            position: 'relative',
            overflow: 'hidden',
          }}
        >
          <div
            style={{
              display: 'flex',
              gap: 8,
              marginBottom: 20,
              paddingBottom: 14,
              borderBottom: `1px solid ${COLORS.panelBorder}`,
              alignItems: 'center',
            }}
          >
            <div style={{width: 12, height: 12, borderRadius: 999, background: '#FF5F57'}} />
            <div style={{width: 12, height: 12, borderRadius: 999, background: '#FEBC2E'}} />
            <div style={{width: 12, height: 12, borderRadius: 999, background: '#28C840'}} />
            <div
              style={{
                marginLeft: 14,
                color: COLORS.textMuted,
                fontSize: 18,
                fontFamily: FONT_STACK,
              }}
            >
              application_specification.docx
            </div>
          </div>
          {renderTyped()}
        </div>

        <div
          style={{
            flex: 1,
            background: COLORS.panel,
            border: `1px solid ${COLORS.panelBorder}`,
            borderRadius: 20,
            padding: 28,
            opacity: suggestionOpacity,
            transform: `translateY(${suggestionY}px)`,
          }}
        >
          <div
            style={{
              color: COLORS.highlight,
              fontSize: 18,
              letterSpacing: 2,
              fontWeight: 600,
              textTransform: 'uppercase',
              marginBottom: 18,
            }}
          >
            ✦ AI Copilot
          </div>
          {[
            {label: 'Multi-jurisdictional', value: 'US · EP · CN · JP'},
            {label: 'Auto-generated figures', value: '4 figures · labeled'},
            {label: 'Prior-art coverage', value: '128 references'},
            {label: 'Template', value: 'Firm style guide'},
          ].map((row, i) => {
            const rowEnter = interpolate(
              frame,
              [100 + i * 6, 116 + i * 6],
              [0, 1],
              {extrapolateLeft: 'clamp', extrapolateRight: 'clamp'},
            );
            return (
              <div
                key={row.label}
                style={{
                  opacity: rowEnter,
                  transform: `translateX(${(1 - rowEnter) * 16}px)`,
                  marginBottom: 18,
                  paddingBottom: 18,
                  borderBottom:
                    i < 3 ? `1px solid ${COLORS.panelBorder}` : 'none',
                }}
              >
                <div style={{color: COLORS.textMuted, fontSize: 18}}>
                  {row.label}
                </div>
                <div style={{color: COLORS.text, fontSize: 24, marginTop: 4, fontWeight: 600}}>
                  {row.value}
                </div>
              </div>
            );
          })}
        </div>
      </div>
    </AbsoluteFill>
  );
};
