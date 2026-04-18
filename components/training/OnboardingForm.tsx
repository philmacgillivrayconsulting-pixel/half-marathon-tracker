'use client';

import { useMemo, useState } from 'react';
import type {
  Difficulty,
  GoalDistance,
  GoalType,
  GuidanceMode,
  RunnerLevel,
  RunnerProfile,
  RunningAbility,
  TrainingVolume,
  Weekday,
} from '@/lib/runna/types';

type Props = {
  runnerId: string;
  initial?: RunnerProfile | null;
  onSaved: (profile: RunnerProfile) => void;
};

const ALL_DAYS: Weekday[] = ['Mon', 'Tue', 'Wed', 'Thu', 'Fri', 'Sat', 'Sun'];

const panel: React.CSSProperties = {
  background: '#161b22',
  border: '1px solid #30363d',
  borderRadius: 10,
  padding: 20,
  marginBottom: 16,
};

const label: React.CSSProperties = {
  display: 'block',
  fontSize: 12,
  letterSpacing: '0.05em',
  textTransform: 'uppercase',
  color: '#8b949e',
  marginBottom: 6,
};

const input: React.CSSProperties = {
  width: '100%',
  background: '#0d1117',
  color: '#e6edf3',
  border: '1px solid #30363d',
  borderRadius: 6,
  padding: '8px 10px',
  fontSize: 14,
};

const row: React.CSSProperties = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 12,
};

export default function OnboardingForm({ runnerId, initial, onSaved }: Props) {
  const [level, setLevel] = useState<RunnerLevel>(initial?.level ?? 'intermediate');
  const [ability, setAbility] = useState<RunningAbility>(
    initial?.running_ability ?? 'intermediate',
  );
  const [goalType, setGoalType] = useState<GoalType>(initial?.goal_type ?? 'finish');
  const [goalDistance, setGoalDistance] = useState<GoalDistance>(
    initial?.goal_distance ?? 'half_marathon',
  );
  const [raceDate, setRaceDate] = useState<string>(initial?.race_date ?? '');
  const [goalTimeMin, setGoalTimeMin] = useState<string>(
    initial?.goal_time_seconds ? String(Math.round(initial.goal_time_seconds / 60)) : '',
  );
  const [weeklyKm, setWeeklyKm] = useState<string>(
    String(initial?.current_weekly_distance_km ?? 20),
  );
  const [longestKm, setLongestKm] = useState<string>(
    String(initial?.longest_recent_run_km ?? 10),
  );
  const [fiveK, setFiveK] = useState<string>(
    initial?.recent_race_times?.fiveK_seconds
      ? secToMinSec(initial.recent_race_times.fiveK_seconds)
      : '',
  );
  const [tenK, setTenK] = useState<string>(
    initial?.recent_race_times?.tenK_seconds
      ? secToMinSec(initial.recent_race_times.tenK_seconds)
      : '',
  );
  const [availableDays, setAvailableDays] = useState<Weekday[]>(
    initial?.available_days ?? ['Tue', 'Thu', 'Sun'],
  );
  const [longDay, setLongDay] = useState<Weekday>(
    initial?.preferred_long_run_day ?? 'Sun',
  );
  const [runsPerWeek, setRunsPerWeek] = useState<number>(initial?.runs_per_week ?? 3);
  const [volume, setVolume] = useState<TrainingVolume>(
    initial?.training_volume ?? 'steady',
  );
  const [difficulty, setDifficulty] = useState<Difficulty>(
    initial?.difficulty ?? 'balanced',
  );
  const [guidance, setGuidance] = useState<GuidanceMode>(
    initial?.guidance_mode ?? 'effort',
  );
  const [saving, setSaving] = useState(false);
  const [err, setErr] = useState<string | null>(null);

  const goalTimeSeconds = useMemo(() => {
    const n = parseInt(goalTimeMin, 10);
    return isFinite(n) && n > 0 ? n * 60 : undefined;
  }, [goalTimeMin]);

  function toggleDay(d: Weekday) {
    setAvailableDays((prev) =>
      prev.includes(d) ? prev.filter((x) => x !== d) : [...prev, d],
    );
  }

  async function submit() {
    setErr(null);
    const profile: RunnerProfile = {
      id: runnerId,
      name: runnerId,
      level,
      running_ability: ability,
      goal_type: goalType,
      goal_distance: goalDistance,
      race_date: raceDate || undefined,
      goal_time_seconds: goalTimeSeconds,
      current_weekly_distance_km: Number(weeklyKm) || 0,
      longest_recent_run_km: Number(longestKm) || 0,
      recent_race_times: {
        fiveK_seconds: parseMinSec(fiveK),
        tenK_seconds: parseMinSec(tenK),
      },
      available_days: availableDays.length ? availableDays : ['Tue', 'Thu', 'Sun'],
      preferred_long_run_day: longDay,
      runs_per_week: runsPerWeek as RunnerProfile['runs_per_week'],
      training_volume: volume,
      difficulty,
      guidance_mode: guidance,
      units: 'km',
    };
    setSaving(true);
    try {
      const saveRes = await fetch('/api/runna/profile', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ profile }),
      });
      if (!saveRes.ok) throw new Error((await saveRes.json()).error ?? 'save failed');
      const planRes = await fetch('/api/runna/plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ runner_id: runnerId }),
      });
      if (!planRes.ok) throw new Error((await planRes.json()).error ?? 'plan failed');
      onSaved(profile);
    } catch (e) {
      setErr(e instanceof Error ? e.message : 'failed');
    } finally {
      setSaving(false);
    }
  }

  return (
    <div style={{ maxWidth: 760, margin: '0 auto' }}>
      <div style={panel}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>About you</h3>
        <div style={row}>
          <div>
            <label style={label}>Level</label>
            <select style={input} value={level} onChange={(e) => setLevel(e.target.value as RunnerLevel)}>
              <option value="beginner">Beginner</option>
              <option value="returning_runner">Returning runner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
            </select>
          </div>
          <div>
            <label style={label}>Ability band</label>
            <select
              style={input}
              value={ability}
              onChange={(e) => setAbility(e.target.value as RunningAbility)}
            >
              <option value="beginner">Beginner</option>
              <option value="intermediate">Intermediate</option>
              <option value="advanced">Advanced</option>
              <option value="elite">Elite</option>
              <option value="elite_plus">Elite+</option>
            </select>
          </div>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Goal</h3>
        <div style={row}>
          <div>
            <label style={label}>Goal distance</label>
            <select
              style={input}
              value={goalDistance}
              onChange={(e) => setGoalDistance(e.target.value as GoalDistance)}
            >
              <option value="habit">Habit (no race)</option>
              <option value="5k">5K</option>
              <option value="10k">10K</option>
              <option value="half_marathon">Half marathon</option>
              <option value="marathon">Marathon</option>
            </select>
          </div>
          <div>
            <label style={label}>Goal type</label>
            <select
              style={input}
              value={goalType}
              onChange={(e) => setGoalType(e.target.value as GoalType)}
            >
              <option value="habit">Build a habit</option>
              <option value="finish">Finish</option>
              <option value="improve">Improve</option>
              <option value="time">Target time</option>
            </select>
          </div>
          <div>
            <label style={label}>Race date</label>
            <input
              type="date"
              style={input}
              value={raceDate}
              onChange={(e) => setRaceDate(e.target.value)}
            />
          </div>
          <div>
            <label style={label}>Goal time (min)</label>
            <input
              type="number"
              style={input}
              value={goalTimeMin}
              onChange={(e) => setGoalTimeMin(e.target.value)}
              placeholder="e.g. 110 for 1:50 HM"
            />
          </div>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Current fitness</h3>
        <div style={row}>
          <div>
            <label style={label}>Weekly distance (km)</label>
            <input
              type="number"
              style={input}
              value={weeklyKm}
              onChange={(e) => setWeeklyKm(e.target.value)}
            />
          </div>
          <div>
            <label style={label}>Longest recent run (km)</label>
            <input
              type="number"
              style={input}
              value={longestKm}
              onChange={(e) => setLongestKm(e.target.value)}
            />
          </div>
          <div>
            <label style={label}>Recent 5K (mm:ss)</label>
            <input
              style={input}
              value={fiveK}
              onChange={(e) => setFiveK(e.target.value)}
              placeholder="25:30"
            />
          </div>
          <div>
            <label style={label}>Recent 10K (mm:ss)</label>
            <input
              style={input}
              value={tenK}
              onChange={(e) => setTenK(e.target.value)}
              placeholder="54:00"
            />
          </div>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Schedule</h3>
        <div style={{ marginBottom: 12 }}>
          <label style={label}>Available days</label>
          <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
            {ALL_DAYS.map((d) => {
              const active = availableDays.includes(d);
              return (
                <button
                  key={d}
                  type="button"
                  onClick={() => toggleDay(d)}
                  style={{
                    padding: '6px 12px',
                    borderRadius: 6,
                    border: '1px solid ' + (active ? '#58a6ff' : '#30363d'),
                    background: active ? '#1f3b63' : 'transparent',
                    color: '#e6edf3',
                    cursor: 'pointer',
                  }}
                >
                  {d}
                </button>
              );
            })}
          </div>
        </div>
        <div style={row}>
          <div>
            <label style={label}>Runs per week</label>
            <select
              style={input}
              value={runsPerWeek}
              onChange={(e) => setRunsPerWeek(Number(e.target.value))}
            >
              {[2, 3, 4, 5, 6].map((n) => (
                <option key={n} value={n}>
                  {n}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label style={label}>Long-run day</label>
            <select
              style={input}
              value={longDay}
              onChange={(e) => setLongDay(e.target.value as Weekday)}
            >
              {ALL_DAYS.map((d) => (
                <option key={d} value={d}>
                  {d}
                </option>
              ))}
            </select>
          </div>
        </div>
      </div>

      <div style={panel}>
        <h3 style={{ marginTop: 0, fontFamily: 'var(--font-heading)' }}>Style</h3>
        <div style={row}>
          <div>
            <label style={label}>Training volume</label>
            <select
              style={input}
              value={volume}
              onChange={(e) => setVolume(e.target.value as TrainingVolume)}
            >
              <option value="gradual">Gradual (light)</option>
              <option value="steady">Steady (standard)</option>
              <option value="progressive">Progressive (aggressive)</option>
            </select>
          </div>
          <div>
            <label style={label}>Difficulty</label>
            <select
              style={input}
              value={difficulty}
              onChange={(e) => setDifficulty(e.target.value as Difficulty)}
            >
              <option value="comfortable">Comfortable</option>
              <option value="balanced">Balanced</option>
              <option value="challenging">Challenging</option>
            </select>
          </div>
          <div>
            <label style={label}>Guidance</label>
            <select
              style={input}
              value={guidance}
              onChange={(e) => setGuidance(e.target.value as GuidanceMode)}
            >
              <option value="effort">Effort (RPE)</option>
              <option value="pace">Pace bands</option>
            </select>
          </div>
        </div>
      </div>

      {err && (
        <div style={{ color: '#f85149', marginBottom: 12 }}>Error: {err}</div>
      )}

      <button
        onClick={submit}
        disabled={saving}
        style={{
          padding: '12px 20px',
          background: '#238636',
          color: '#fff',
          border: 'none',
          borderRadius: 8,
          fontSize: 14,
          fontWeight: 600,
          cursor: saving ? 'wait' : 'pointer',
          width: '100%',
        }}
      >
        {saving ? 'Saving…' : 'Save and generate plan'}
      </button>
    </div>
  );
}

function parseMinSec(s: string): number | undefined {
  if (!s) return undefined;
  const m = s.match(/^(\d+):(\d{1,2})$/);
  if (!m) return undefined;
  return parseInt(m[1], 10) * 60 + parseInt(m[2], 10);
}

function secToMinSec(sec: number): string {
  const m = Math.floor(sec / 60);
  const r = sec % 60;
  return `${m}:${r.toString().padStart(2, '0')}`;
}

