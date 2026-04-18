'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Plan, RunnerProfile, Workout } from '@/lib/runna/types';
import { formatTarget } from '@/lib/runna/pace';

export default function PlanPage() {
  const [runnerId, setRunnerId] = useState('');
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);
  const [err, setErr] = useState<string | null>(null);

  useEffect(() => {
    const name = localStorage.getItem('hm_user_name') ?? '';
    if (!name) {
      setLoading(false);
      return;
    }
    setRunnerId(name);
    Promise.all([
      fetch(`/api/runna/profile?runner_id=${encodeURIComponent(name)}`).then((r) => r.json()),
      fetch(`/api/runna/plan?runner_id=${encodeURIComponent(name)}`).then((r) => r.json()),
    ]).then(([p, pl]) => {
      setProfile(p.profile);
      setPlan(pl.plan);
      setLoading(false);
    });
  }, []);

  async function regenerate() {
    setErr(null);
    const r = await fetch('/api/runna/plan', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runner_id: runnerId }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? 'regenerate failed');
      return;
    }
    setPlan(data.plan);
  }

  async function syncCalendar() {
    setErr(null);
    const tz = Intl.DateTimeFormat().resolvedOptions().timeZone;
    const r = await fetch('/api/runna/google/sync', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ runner_id: runnerId, timezone: tz }),
    });
    const data = await r.json();
    if (!r.ok) {
      setErr(data.error ?? 'sync failed');
      return;
    }
    alert(`Calendar: ${data.created} created, ${data.updated} updated`);
  }

  if (loading) return <div>Loading…</div>;
  if (!plan || !profile) {
    return (
      <div>
        No active plan.{' '}
        <Link href="/training/onboarding" style={{ color: '#58a6ff' }}>
          Start onboarding
        </Link>
        .
      </div>
    );
  }

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <div
        style={{
          display: 'flex',
          justifyContent: 'space-between',
          alignItems: 'center',
          gap: 12,
          flexWrap: 'wrap',
          marginBottom: 16,
        }}
      >
        <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
          Full plan — {plan.plan_length_weeks} weeks
        </h2>
        <div style={{ display: 'flex', gap: 8 }}>
          <button onClick={regenerate} style={secondaryBtn}>
            Regenerate
          </button>
          <button onClick={syncCalendar} style={primaryBtn}>
            Sync to Google Calendar
          </button>
        </div>
      </div>

      {err && (
        <div style={{ color: '#f85149', marginBottom: 12 }}>Error: {err}</div>
      )}

      {plan.baseline_explanation && (
        <div
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            padding: '10px 14px',
            borderRadius: 8,
            color: '#8b949e',
            fontSize: 13,
            marginBottom: 16,
          }}
        >
          Baseline: {plan.baseline_explanation}
        </div>
      )}

      {plan.weeks.map((week) => (
        <div
          key={week.week_number}
          style={{
            background: '#161b22',
            border: '1px solid #30363d',
            borderRadius: 10,
            padding: 16,
            marginBottom: 12,
          }}
        >
          <h3 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
            Week {week.week_number}
            {week.kind !== 'build' && (
              <span style={{ color: '#8b949e', marginLeft: 8 }}>· {week.kind}</span>
            )}
            <span style={{ color: '#8b949e', float: 'right' }}>
              {week.planned_distance_km} km
            </span>
          </h3>
          <div style={{ marginTop: 12, display: 'flex', flexDirection: 'column', gap: 6 }}>
            {[...week.workouts]
              .sort((a, b) => a.date.localeCompare(b.date))
              .map((w) => (
                <WorkoutRow key={w.id} w={w} profile={profile} />
              ))}
          </div>
        </div>
      ))}
    </div>
  );
}

function WorkoutRow({ w, profile }: { w: Workout; profile: RunnerProfile }) {
  return (
    <div
      style={{
        display: 'grid',
        gridTemplateColumns: '100px 1fr auto',
        alignItems: 'center',
        gap: 10,
        padding: '6px 10px',
        background: '#0d1117',
        borderRadius: 6,
      }}
    >
      <div style={{ fontSize: 12, color: '#8b949e' }}>
        {w.date} {w.day}
      </div>
      <div>
        <div style={{ fontWeight: 500 }}>
          {w.title}
          {w.status === 'completed' && (
            <span style={{ color: '#3fb950', marginLeft: 8 }}>✓</span>
          )}
        </div>
        <div style={{ fontSize: 12, color: '#8b949e' }}>
          {formatTarget(w.target, profile.units)} · ~{w.estimated_duration_min} min
          {w.structure.main_text ? ` · ${w.structure.main_text}` : ''}
        </div>
      </div>
      <div style={{ color: '#8b949e', fontSize: 13 }}>{w.target_distance_km} km</div>
    </div>
  );
}

const primaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: '#238636',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: '#58a6ff',
  border: '1px solid #30363d',
  borderRadius: 6,
  fontSize: 13,
  cursor: 'pointer',
};
