'use client';

interface NamePillProps {
  name: string;
  type: 'wishlist' | 'signup';
  isCurrentUser: boolean;
}

export default function NamePill({ name, type, isCurrentUser }: NamePillProps) {
  const styles: React.CSSProperties = {
    display: 'inline-block',
    fontSize: 10,
    padding: '2px 6px',
    borderRadius: 10,
    fontFamily: 'var(--font-body)',
    fontWeight: 500,
    whiteSpace: 'nowrap',
    lineHeight: '16px',
  };

  if (type === 'wishlist') {
    styles.color = isCurrentUser ? '#1a1a0a' : '#d4c48a';
    styles.background = isCurrentUser ? '#f2c94c' : '#2a2414';
  } else {
    styles.color = isCurrentUser ? '#0d1a0d' : '#8ad4a0';
    styles.background = isCurrentUser ? '#6fcf97' : '#1a2e1e';
  }

  return <span style={styles}>{name}</span>;
}
