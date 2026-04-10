'use client';

interface PBBarProps {
  score: number;
  variant?: 'mini' | 'full';
}

function getColor(score: number) {
  if (score >= 9) return '#6fcf97';
  if (score >= 7) return '#f2c94c';
  return '#eb5757';
}

function getLabel(score: number) {
  if (score >= 9) return 'Elite PB course';
  if (score >= 7) return 'Good & runnable';
  return 'Scenic / tougher';
}

export default function PBBar({ score, variant = 'mini' }: PBBarProps) {
  const color = getColor(score);

  if (variant === 'mini') {
    return (
      <div style={{ display: 'flex', alignItems: 'center', gap: 6, minWidth: 56 }}>
        <div style={{
          width: 32, height: 5, borderRadius: 3,
          background: '#21262d', overflow: 'hidden',
        }}>
          <div style={{
            width: `${score * 10}%`, height: '100%',
            background: color, borderRadius: 3,
          }} />
        </div>
        <span style={{ fontSize: 11, color, fontWeight: 500, fontFamily: 'var(--font-body)' }}>
          {score}
        </span>
      </div>
    );
  }

  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
      <div style={{
        flex: 1, height: 8, borderRadius: 4,
        background: '#21262d', overflow: 'hidden',
      }}>
        <div style={{
          width: `${score * 10}%`, height: '100%',
          background: color, borderRadius: 4,
        }} />
      </div>
      <span style={{ fontSize: 13, color, fontWeight: 500, fontFamily: 'var(--font-body)', whiteSpace: 'nowrap' }}>
        {score}/10 &mdash; {getLabel(score)}
      </span>
    </div>
  );
}
