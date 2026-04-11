'use client';

interface ActionBtnProps {
  type: 'wishlist' | 'signup' | 'cantdo';
  active: boolean;
  onClick: (e: React.MouseEvent) => void;
}

export default function ActionBtn({ type, active, onClick }: ActionBtnProps) {
  const config = {
    wishlist: { icon: '\u2B50', title: 'Toggle wishlist' },
    signup: { icon: '\u2705', title: 'Toggle signup' },
    cantdo: { icon: '\u274C', title: "Can't do this one" },
  }[type];

  return (
    <button
      onClick={onClick}
      title={config.title}
      style={{
        background: 'none',
        border: 'none',
        cursor: 'pointer',
        fontSize: type === 'cantdo' ? 12 : 16,
        padding: '4px 6px',
        borderRadius: 6,
        opacity: active ? 1 : 0.35,
        filter: active ? 'none' : 'grayscale(80%)',
        transition: 'opacity 0.15s, transform 0.15s',
      }}
      onMouseEnter={e => { e.currentTarget.style.transform = 'scale(1.15)'; }}
      onMouseLeave={e => { e.currentTarget.style.transform = 'scale(1)'; }}
    >
      {config.icon}
    </button>
  );
}
