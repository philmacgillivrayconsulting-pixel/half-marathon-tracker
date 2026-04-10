'use client';

interface ActionBtnProps {
  type: 'wishlist' | 'signup';
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function ActionBtn({ type, active, onClick }: ActionBtnProps) {
  const isWL = type === 'wishlist';
  const icon = isWL ? '\u2B50' : '\u2705';

  return (
    <button
      onClick={onClick}
      title={isWL ? 'Toggle wishlist' : 'Toggle signup'}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: 16,
        padding: '4px 6px',
        borderRadius: 6,
        opacity: active ? 1 : 0.35,
        filter: active ? 'none' : 'grayscale(80%)',
        transition: 'opacity 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {icon}
    </button>
  );
}
