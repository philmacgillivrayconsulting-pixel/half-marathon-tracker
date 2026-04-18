'use client';

import { useEffect, useState } from 'react';
import Link from 'next/link';
import type { Plan, RunnerProfile, Workout } from '@/lib/runna/types';
import { formatTarget } from '@/lib/runna/pace';

export default function Dashboard() {
  const [runnerId, setRunnerId] = useState<string>('');
  const [profile, setProfile] = useState<RunnerProfile | null>(null);
  const [plan, setPlan] = useState<Plan | null>(null);
  const [loading, setLoading] = useState(true);

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

  if (loading) return <div>Loading…</div>;

  if (!runnerId) {
    return (
      <Card>
        <h2 style={{ marginTop: 0 }}>Set your name first</h2>
        <p>
          Open the <Link href="/" style={linkAccent}>races page</Link> and set
          your name, then come back here.
        </p>
      </Card>
    );
  }

  if (!profile) {
    return (
      <Card>
        <h2 style={{ marginTop: 0 }}>Welcome, {runnerId}</h2>
        <p>Build a training plan tailored to your goal, schedule, and current fitness.</p>
        <Link
          href="/training/onboarding"
          style={{ ...primaryBtn, display: 'inline-block' }}
        >
          Start onboarding
        </Link>
      </Card>
    );
  }

  if (!plan) {
    return (
      <Card>
        <h2 style={{ marginTop: 0 }}>Profile saved, no plan yet</h2>
        <p>Generate your first plan from your profile.</p>
        <button
          style={primaryBtn}
          onClick={async () => {
            const r = await fetch('/api/runna/plan', {
              method: 'POST',
              headers: { 'Content-Type': 'application/json' },
              body: JSON.stringify({ runner_id: runnerId }),
            });
            if (r.ok) window.location.reload();
          }}
        >
          Generate plan
        </button>
      </Card>
    );
  }

  const upcoming = nextWorkouts(plan, 5);
  const currentWeek = currentWeekNumber(plan);
  const week = plan.weeks.find((w) => w.week_number === currentWeek) ?? plan.weeks[0];

  return (
    <div style={{ maxWidth: 900, margin: '0 auto' }}>
      <Card>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', flexWrap: 'wrap', gap: 12 }}>
          <div>
            <h2 style={{ margin: 0, fontFamily: 'var(--font-heading)' }}>
              {profile.goal_distance.replace('_', ' ').toUpperCase()} —{' '}
              {profile.goal_type}
            </h2>
            <div style={{ color: '#8b949e', marginTop: 4 }}>
              {plan.plan_length_weeks} weeks · {profile.runs_per_week} runs/week · {plan.style} build · {plan.guidance_mode} guidance
            </div>
            {profile.race_date && (
              <div style={{ color: '#8b949e', marginTop: 2 }}>
                Race: {profile.race_date}
              </div>
            )}
          </div>
          <div style={{ display: 'flex', gap: 8 }}>
            <Link href="/training/plan" style={secondaryBtn}>
              Full plan
            </Link>
            <Link href="/training/onboarding" style={secondaryBtn}>
              Edit
            </Link>
          </div>
        </div>
      </Card>

      <Card>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>
          This week ({week.week_number} / {plan.plan_length_weeks}
          {week.kind !== 'build' ? ` · ${week.kind}` : ''}) — {week.planned_distance_km} km
        </h3>
        <WorkoutList workouts={week.workouts} profile={profile} />
      </Card>

      {upcoming.length > 0 && (
        <Card>
          <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Next up</h3>
          <WorkoutList workouts={upcoming} profile={profile} />
        </Card>
      )}
    </div>
  );
}

function WorkoutList({
  workouts,
  profile,
}: {
  workouts: Workout[];
  profile: RunnerProfile;
}) {
  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: 8 }}>
      {workouts.map((w) => (
        <div
          key={w.id}
          style={{
            display: 'grid',
            gridTemplateColumns: '90px 1fr auto',
            alignItems: 'center',
            gap: 12,
            padding: '8px 12px',
            background: '#0d1117',
            border: '1px solid #21262d',
            borderRadius: 6,
          }}
        >
          <div style={{ fontSize: 12, color: '#8b949e' }}>
            {w.date}
            <div style={{ fontSize: 11 }}>{w.day}</div>
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
            </div>
          </div>
          <div style={{ color: '#8b949e', fontSize: 12 }}>
            {w.target_distance_km} km
          </div>
        </div>
      ))}
    </div>
  );
}

function currentWeekNumber(plan: Plan): number {
  const start = new Date(plan.start_date + 'T00:00:00Z').getTime();
  const now = Date.now();
  const weeks = Math.floor((now - start) / (7 * 24 * 60 * 60 * 1000)) + 1;
  if (weeks < 1) return 1;
  if (weeks > plan.plan_length_weeks) return plan.plan_length_weeks;
  return weeks;
}

function nextWorkouts(plan: Plan, n: number): Workout[] {
  const now = Date.now();
  const all: Workout[] = [];
  for (const week of plan.weeks) {
    for (const w of week.workouts) all.push(w);
  }
  return all
    .filter((w) => new Date(w.date + 'T00:00:00Z').getTime() >= now && w.status !== 'completed')
    .sort((a, b) => a.date.localeCompare(b.date))
    .slice(0, n);
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

const primaryBtn: React.CSSProperties = {
  padding: '10px 16px',
  background: '#238636',
  color: '#fff',
  border: 'none',
  borderRadius: 6,
  fontSize: 14,
  fontWeight: 600,
  cursor: 'pointer',
  textDecoration: 'none',
};

const secondaryBtn: React.CSSProperties = {
  padding: '8px 14px',
  background: 'transparent',
  color: '#58a6ff',
  border: '1px solid #30363d',
  borderRadius: 6,
  fontSize: 14,
  cursor: 'pointer',
  textDecoration: 'none',
};

const linkAccent: React.CSSProperties = {
  color: '#58a6ff',
};
