'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';

interface StravaSyncReport {
  imported: number;
  matched: number;
  anchor_direction: 'faster' | 'slower' | 'hold';
  race_pr_detected: Record<string, number>;
  rationale: string;
}

export default function IntegrationsPage() {
  const [runnerId, setRunnerId] = useState('');
  const [syncing, setSyncing] = useState(false);
  const [report, setReport] = useState<StravaSyncReport | null>(null);
  const [err, setErr] = useState<string | null>(null);
  const [params, setParams] = useState<URLSearchParams | null>(null);

  const googleOk = params?.get('google') === 'connected';
  const googleErr = params?.get('google_error');
  const stravaOk = params?.get('strava') === 'connected';
  const stravaErr = params?.get('strava_error');

  useEffect(() => {
    const name = localStorage.getItem('hm_user_name') ?? '';
    setRunnerId(name);
    setParams(new URLSearchParams(window.location.search));
  }, []);

  async function runStravaSync() {
    setErr(null);
    setSyncing(true);
    try {
      const r = await fetch('/api/runna/strava/sync', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_id: runnerId, days: 60 }),
      });
      const data = await r.json();
      if (!r.ok) throw new Error(data.error ?? 'sync failed');
      setReport(data as StravaSyncReport);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'unknown');
    } finally {
      setSyncing(false);
    }
  }

  if (!runnerId) {
    return (
      <div>
        Please set your name on the <Link href="/" style={{ color: '#58a6ff' }}>races page</Link> first.
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <h2 style={{ fontFamily: 'var(--font-heading)', marginTop: 0 }}>Integrations</h2>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Strava</h3>
            <p style={{ color: '#8b949e', marginTop: 4, marginBottom: 0 }}>
              Import recent activities, match them to planned workouts, and nudge pace targets over time.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={`/api/runna/strava/auth?runner_id=${encodeURIComponent(runnerId)}`}
              style={primaryBtn}
            >
              Connect
            </Link>
            <button onClick={runStravaSync} disabled={syncing} style={secondaryBtn}>
              {syncing ? 'Syncing…' : 'Sync now'}
            </button>
          </div>
        </div>
        {stravaOk && <Banner ok>Strava connected.</Banner>}
        {stravaErr && <Banner>Strava error: {stravaErr}</Banner>}
        {report && (
          <div style={reportBox}>
            <div>Imported: <strong>{report.imported}</strong></div>
            <div>Matched to workouts: <strong>{report.matched}</strong></div>
            <div>Anchor update: <strong>{report.anchor_direction}</strong> — {report.rationale}</div>
            {Object.keys(report.race_pr_detected).length > 0 && (
              <div>
                Race PRs detected:{' '}
                {Object.entries(report.race_pr_detected)
                  .map(([k, v]) => `${k}=${Math.round((v as number) / 60)}m`)
                  .join(', ')}
              </div>
            )}
          </div>
        )}
      </Card>

      <Card>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 12, flexWrap: 'wrap' }}>
          <div>
            <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>Google Calendar</h3>
            <p style={{ color: '#8b949e', marginTop: 4, marginBottom: 0 }}>
              Push your plan to a dedicated &ldquo;Training Plan&rdquo; calendar. Events are updated in place when the plan changes.
            </p>
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link
              href={`/api/runna/google/auth?runner_id=${encodeURIComponent(runnerId)}`}
              style={primaryBtn}
            >
              Connect
            </Link>
          </div>
        </div>
        {googleOk && <Banner ok>Google Calendar connected. Use &ldquo;Sync to Google Calendar&rdquo; on the plan page.</Banner>}
        {googleErr && <Banner>Google error: {googleErr}</Banner>}
      </Card>

      {err && <div style={{ color: '#f85149', marginTop: 12 }}>Error: {err}</div>}
    </div>
  );
}

function Card({ children }: { children: React.ReactNode }) {
  return (
    <div
      style={{
        background: '#161b22',
        border: '1px solid #30363d',
        borderRadius: 10,
        padding: 20,
        marginBottom: 16,
      }}
    >
      {children}
    </div>
  );
}

function Banner({ ok, children }: { ok?: boolean; children: React.ReactNode }) {
  return (
    <div
      style={{
        marginTop: 12,
        padding: '8px 12px',
        borderRadius: 6,
        background: ok ? '#0c3b1a' : '#3b1618',
        color: ok ? '#3fb950' : '#f85149',
        fontSize: 13,
      }}
    >
      {children}
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#fc4c02',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  textDecoration: 'none',
  fontWeight: 600,
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};

const reportBox: React.CSSProperties = {
  marginTop: 12,
  padding: '10px 14px',
  background: '#0d1117',
  border: '1px solid #21262d',
  borderRadius: 8,
  fontSize: 13,
  color: '#8b949e',
  display: 'flex',
  flexDirection: 'column',
  gap: 4,
};
