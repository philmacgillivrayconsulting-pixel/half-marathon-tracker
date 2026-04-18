import Link from 'next/link';

export default function TrainingLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const linkStyle: React.CSSProperties = {
    color: '#8b949e',
    textDecoration: 'none',
    padding: '6px 12px',
    borderRadius: 6,
    fontSize: 14,
  };

  return (
    <div style={{ minHeight: '100vh' }}>
      <header
        style={{
          borderBottom: '1px solid #30363d',
          padding: '12px 24px',
          display: 'flex',
          alignItems: 'center',
          gap: 16,
          flexWrap: 'wrap',
        }}
      >
        <Link
          href="/training"
          style={{
            color: '#e6edf3',
            textDecoration: 'none',
            fontFamily: 'var(--font-heading)',
            fontSize: 22,
            letterSpacing: '0.05em',
          }}
        >
          TRAINING
        </Link>
        <nav style={{ display: 'flex', gap: 4 }}>
          <Link href="/training" style={linkStyle}>
            Dashboard
          </Link>
          <Link href="/training/plan" style={linkStyle}>
            Plan
          </Link>
          <Link href="/training/integrations" style={linkStyle}>
            Integrations
          </Link>
          <Link href="/training/onboarding" style={linkStyle}>
            Onboarding
          </Link>
          <Link href="/" style={linkStyle}>
            ← Races
          </Link>
        </nav>
      </header>
      <main style={{ padding: 24 }}>{children}</main>
    </div>
  );
}
