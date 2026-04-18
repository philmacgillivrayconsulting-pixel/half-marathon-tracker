// Adaptation engine.
//
// Matches Strava activities to planned workouts and, where signals are
// trustworthy, nudges the runner's estimated current race time. Per the
// blueprint: treat imported runs as evidence, not authority — so updates
// are small and only react to reliable signals (races, structured tempo,
// repeated overperformance across benchmark sessions).

import { paceEngine } from './pace.ts';
import type {
  Plan,
  RunnerProfile,
  Workout,
  WorkoutType,
} from './types.ts';
import type { StoredActivity } from './storage.ts';

export interface MatchResult {
  workout: Workout;
  activity: StoredActivity;
  /** Positive when the activity ran faster than target. */
  pace_delta_sec_per_km: number;
  /** Signal strength, 0–1. Races and structured quality sessions score high. */
  reliability: number;
}

const ONE_DAY_MS = 24 * 60 * 60 * 1000;
const DISTANCE_TOLERANCE = 0.3;

export function matchActivitiesToPlan(
  plan: Plan,
  activities: StoredActivity[],
  profile: RunnerProfile,
): MatchResult[] {
  const matches: MatchResult[] = [];
  const usedActivityIds = new Set<string>();

  // Index activities by date for cheap lookups.
  const byDate = new Map<string, StoredActivity[]>();
  for (const a of activities) {
    if (a.activity_type && a.activity_type !== 'Run') continue;
    const d = a.start_date.slice(0, 10);
    const arr = byDate.get(d) ?? [];
    arr.push(a);
    byDate.set(d, arr);
  }

  for (const week of plan.weeks) {
    for (const workout of week.workouts) {
      if (workout.type === 'rest') continue;
      if (workout.status === 'completed' && workout.strava_activity_id) {
        continue;
      }

      const candidate = pickCandidate(workout, byDate, usedActivityIds);
      if (!candidate) continue;

      const activityPace =
        candidate.avg_pace_sec_per_km ??
        (candidate.moving_time_sec / (candidate.distance_m / 1000));
      const target = paceEngine(profile, workout.type, repLenFor(workout));
      const targetCenter =
        target.mode === 'pace'
          ? (target.pace_low_sec_per_km + target.pace_high_sec_per_km) / 2
          : null;

      usedActivityIds.add(candidate.id);
      matches.push({
        workout,
        activity: candidate,
        pace_delta_sec_per_km:
          targetCenter == null ? 0 : targetCenter - activityPace,
        reliability: reliabilityFor(workout.type),
      });
    }
  }

  return matches;
}

function pickCandidate(
  workout: Workout,
  byDate: Map<string, StoredActivity[]>,
  used: Set<string>,
): StoredActivity | null {
  const wd = new Date(workout.date + 'T00:00:00Z').getTime();
  // Same day, then ±1 day.
  for (const offset of [0, -1, 1]) {
    const key = new Date(wd + offset * ONE_DAY_MS)
      .toISOString()
      .slice(0, 10);
    const arr = byDate.get(key) ?? [];
    for (const a of arr) {
      if (used.has(a.id)) continue;
      if (!distanceCompatible(workout, a)) continue;
      return a;
    }
  }
  return null;
}

function distanceCompatible(workout: Workout, a: StoredActivity): boolean {
  const planned = workout.target_distance_km * 1000;
  const actual = a.distance_m;
  if (planned === 0) return actual > 0;
  const ratio = Math.abs(actual - planned) / planned;
  return ratio <= DISTANCE_TOLERANCE;
}

function reliabilityFor(type: WorkoutType): number {
  switch (type) {
    case 'race_pace':
    case 'tempo':
      return 0.9;
    case 'intervals':
      // Intervals have lots of recoveries so average pace is noisier than
      // a sustained tempo. Still useful.
      return 0.6;
    case 'long_run':
      return 0.4;
    case 'strides':
      return 0.3;
    case 'easy':
    case 'recovery':
      return 0.1;
    case 'rest':
      return 0;
  }
}

function repLenFor(w: Workout): number | null {
  const m = w.subtype?.match(/x\s*(\d+)m/i);
  return m ? parseInt(m[1], 10) : null;
}

/**
 * Apply matches back onto the plan in-place: mark workouts completed and
 * attach activity ids. Returns the mutated plan for convenience.
 */
export function applyMatchesToPlan(
  plan: Plan,
  matches: MatchResult[],
): Plan {
  const index = new Map<string, MatchResult>();
  for (const m of matches) index.set(m.workout.id, m);
  for (const week of plan.weeks) {
    for (const w of week.workouts) {
      const m = index.get(w.id);
      if (!m) continue;
      w.status = 'completed';
      w.strava_activity_id = m.activity.id;
    }
  }
  return plan;
}

/**
 * Suggest a fitness-anchor update based on reliable matches.
 *
 * Only reacts to 3+ matches with reliability ≥ 0.6 trending the same way.
 * Nudges the anchor by at most ±1.5% per call — small steps, as the
 * blueprint advises.
 */
export interface AnchorSuggestion {
  direction: 'faster' | 'slower' | 'hold';
  adjust_fraction: number;
  rationale: string;
  samples: number;
}

export function suggestAnchorUpdate(
  matches: MatchResult[],
): AnchorSuggestion {
  const reliable = matches.filter(
    (m) => m.reliability >= 0.6 && m.pace_delta_sec_per_km !== 0,
  );
  if (reliable.length < 3) {
    return {
      direction: 'hold',
      adjust_fraction: 0,
      samples: reliable.length,
      rationale: 'not enough reliable signals yet',
    };
  }

  const avgDelta =
    reliable.reduce((s, m) => s + m.pace_delta_sec_per_km, 0) /
    reliable.length;

  // Require the signal to be meaningfully above noise (>8 s/km).
  if (Math.abs(avgDelta) < 8) {
    return {
      direction: 'hold',
      adjust_fraction: 0,
      samples: reliable.length,
      rationale: `average delta ${avgDelta.toFixed(1)} s/km within noise band`,
    };
  }

  const direction: AnchorSuggestion['direction'] =
    avgDelta > 0 ? 'faster' : 'slower';
  // Cap change at 1.5% of anchor time per call.
  const magnitude = Math.min(0.015, Math.abs(avgDelta) / 400);
  return {
    direction,
    adjust_fraction: magnitude,
    samples: reliable.length,
    rationale: `avg ${avgDelta.toFixed(1)} s/km across ${reliable.length} reliable sessions`,
  };
}

/**
 * Apply an anchor suggestion to the profile's recent_race_times. Returns
 * a new profile object; the caller decides whether to persist.
 */
export function applyAnchorSuggestion(
  profile: RunnerProfile,
  suggestion: AnchorSuggestion,
): RunnerProfile {
  if (suggestion.direction === 'hold') return profile;
  const rt = { ...(profile.recent_race_times ?? {}) };
  const factor =
    suggestion.direction === 'faster'
      ? 1 - suggestion.adjust_fraction
      : 1 + suggestion.adjust_fraction;
  const keys: Array<keyof typeof rt> = [
    'fiveK_seconds',
    'tenK_seconds',
    'halfMarathon_seconds',
    'marathon_seconds',
  ];
  for (const k of keys) {
    const v = rt[k];
    if (typeof v === 'number' && v > 0) rt[k] = Math.round(v * factor);
  }
  return { ...profile, recent_race_times: rt };
}
