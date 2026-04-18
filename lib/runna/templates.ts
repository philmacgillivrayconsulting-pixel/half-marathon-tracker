// Workout templates and scheduling.
//
// Given a week's planned distance and the runner profile, this module:
//   1. chooses a mix of workout types for the week
//   2. assigns each workout to a weekday that respects the runner's
//      availability and long-run preference
//   3. allocates distance across the workouts, honoring the long-run
//      ceiling and pushing remaining volume into easy/recovery runs

import type {
  GoalDistance,
  PlanWeek,
  RunnerProfile,
  Weekday,
  WorkoutType,
} from './types.ts';
import { WEEKDAYS } from './types.ts';

export interface PlannedSession {
  type: WorkoutType;
  /** Sub-type label used for titles and interval structures. */
  subtype?: string;
  /** Rep length in meters when relevant; used by the pace engine. */
  subtype_length_m?: number;
  distance_km: number;
  duration_min: number;
  day: Weekday;
}

/**
 * Choose the ordered workout types for a week, long run last.
 *
 * Ordering here is "importance first" (quality before fillers); days are
 * assigned in a separate pass so the hard session lands early-mid week and
 * the long run lands on the runner's preferred day.
 */
export function chooseWorkoutMix(
  profile: RunnerProfile,
  week: { kind: PlanWeek['kind']; week_number: number },
  total_weeks: number,
): Array<{
  type: WorkoutType;
  subtype?: string;
  subtype_length_m?: number;
}> {
  const runs = profile.runs_per_week;
  const isBeginnerOrReturning =
    profile.level === 'beginner' || profile.level === 'returning_runner';

  if (week.kind === 'race') {
    // Shake-out + race. We represent the race itself as a race_pace workout
    // on the planned race day so the calendar picks it up.
    return [
      { type: 'easy', subtype: 'shake-out' },
      { type: 'race_pace', subtype: 'race' },
    ];
  }

  const qualityType = pickQualityType(profile, week, total_weeks);
  const qualitySubtype = pickQualitySubtype(qualityType, profile, week);

  // Deload weeks drop intensity but keep shape. When we downgrade the
  // quality slot to easy, drop the subtype too so titles don't show
  // "Easy — tempo".
  const qualityInDeload: WorkoutType =
    week.kind === 'deload' ? 'easy' : qualityType;
  const deloadSubtype: { subtype?: string; subtype_length_m?: number } =
    week.kind === 'deload' ? {} : qualitySubtype;

  let mix: Array<{
    type: WorkoutType;
    subtype?: string;
    subtype_length_m?: number;
  }> = [];

  if (runs === 2) {
    mix = [
      isBeginnerOrReturning
        ? { type: 'easy' }
        : { type: qualityInDeload, ...deloadSubtype },
      { type: 'long_run' },
    ];
  } else if (runs === 3) {
    mix = [
      isBeginnerOrReturning && week.week_number <= 2
        ? { type: 'easy' }
        : { type: qualityInDeload, ...deloadSubtype },
      { type: 'easy' },
      { type: 'long_run' },
    ];
  } else if (runs === 4) {
    mix = [
      { type: qualityInDeload, ...deloadSubtype },
      { type: 'easy' },
      { type: 'recovery' },
      { type: 'long_run' },
    ];
  } else if (runs === 5) {
    mix = [
      { type: qualityInDeload, ...deloadSubtype },
      { type: 'easy' },
      secondaryIntensity(qualityInDeload, week.kind),
      { type: 'recovery' },
      { type: 'long_run' },
    ];
  } else {
    // 6 runs/week.
    mix = [
      { type: qualityInDeload, ...deloadSubtype },
      { type: 'easy' },
      secondaryIntensity(qualityInDeload, week.kind),
      { type: 'recovery' },
      { type: 'easy' },
      { type: 'long_run' },
    ];
  }

  // For a taper, keep the structure but simplify interval subtypes into
  // a shorter "sharpener" on week T-1.
  if (week.kind === 'taper' && mix[0].type === 'intervals') {
    mix[0] = { type: 'intervals', subtype: '5x300m', subtype_length_m: 300 };
  }

  return mix;
}

/**
 * Pick a secondary mid-week intensity that doesn't duplicate the primary.
 * Only build weeks get real intensity; deload and taper stay easy.
 */
function secondaryIntensity(
  primary: WorkoutType,
  weekKind: PlanWeek['kind'],
): { type: WorkoutType; subtype?: string } {
  if (weekKind !== 'build') return { type: 'easy' };
  if (primary === 'tempo') {
    // Avoid two tempo days; use strides on the second hard slot.
    return { type: 'strides' };
  }
  if (primary === 'intervals' || primary === 'race_pace') {
    return { type: 'tempo', subtype: 'tempo' };
  }
  return { type: 'easy' };
}

function pickQualityType(
  profile: RunnerProfile,
  week: { kind: PlanWeek['kind']; week_number: number },
  total_weeks: number,
): WorkoutType {
  const goal = profile.goal_distance;
  const w = week.week_number;

  // Race-pace blocks become more frequent in the final third.
  const isLateBuild = w >= Math.floor(total_weeks * 0.66);

  // Shorter-distance goals skew toward intervals; longer goals skew toward
  // tempo with race-pace sprinkled in during the late build.
  if (goal === '5k' || goal === '10k') {
    if (isLateBuild && w % 2 === 0) return 'race_pace';
    return w % 2 === 0 ? 'intervals' : 'tempo';
  }
  if (goal === 'half_marathon' || goal === 'marathon') {
    if (isLateBuild && w % 2 === 1) return 'race_pace';
    return w % 2 === 0 ? 'tempo' : 'intervals';
  }
  // habit
  return 'easy';
}

function pickQualitySubtype(
  type: WorkoutType,
  profile: RunnerProfile,
  week: { kind: PlanWeek['kind']; week_number: number },
): { subtype?: string; subtype_length_m?: number } {
  if (type === 'intervals') {
    const goal = profile.goal_distance;
    // Shorter races use shorter reps; half/full lean toward 800–1000m.
    if (goal === '5k') {
      return week.week_number % 2 === 0
        ? { subtype: '8x400m', subtype_length_m: 400 }
        : { subtype: '5x800m', subtype_length_m: 800 };
    }
    if (goal === '10k') {
      return week.week_number % 2 === 0
        ? { subtype: '6x800m', subtype_length_m: 800 }
        : { subtype: '4x1000m', subtype_length_m: 1000 };
    }
    return week.week_number % 2 === 0
      ? { subtype: '5x1000m', subtype_length_m: 1000 }
      : { subtype: '4x1200m', subtype_length_m: 1200 };
  }
  if (type === 'tempo') return { subtype: 'tempo' };
  if (type === 'race_pace') return { subtype: 'race-pace block' };
  return {};
}

/**
 * Distribute weekly distance across the mix.
 *
 * The long run gets a share that scales with the goal distance (longer
 * goals → proportionally longer long runs), capped by the safety ceiling
 * and by a soft "no more than ~40% of the week" guardrail.
 */
export function allocateDistances(
  profile: RunnerProfile,
  mix: Array<{ type: WorkoutType }>,
  weekly_km: number,
  week: { kind: PlanWeek['kind']; week_number: number },
): number[] {
  if (mix.length === 0) return [];

  if (week.kind === 'race') {
    // Shake-out 3 km, race distance for the race itself.
    const raceDist = goalDistanceKm(profile.goal_distance) ?? 0;
    return [Math.min(3, weekly_km * 0.2), raceDist];
  }

  const longShare = longRunShareOfWeek(profile.goal_distance);
  const longRunCapRaw = profile.max_long_run_km ?? longRunCeiling(profile);

  // During a taper, the long run shrinks.
  const taperFactor = week.kind === 'taper' ? 0.7 : 1;

  const longIdx = mix.findIndex((m) => m.type === 'long_run');
  const qualityIdx = mix.findIndex(
    (m) =>
      m.type === 'intervals' ||
      m.type === 'tempo' ||
      m.type === 'race_pace',
  );

  const sizes = new Array<number>(mix.length).fill(0);

  // 1. Long run first, capped.
  if (longIdx >= 0) {
    const ideal = weekly_km * longShare * taperFactor;
    sizes[longIdx] = Math.min(ideal, longRunCapRaw);
  }

  // 2. Quality session gets a solid chunk.
  if (qualityIdx >= 0) {
    sizes[qualityIdx] = Math.min(
      weekly_km * 0.2,
      // Keep it reasonable: no more than 12 km in a single quality session.
      12,
    );
  }

  // 3. Everyone else splits the remainder.
  const used = sizes.reduce((a, b) => a + b, 0);
  const remaining = Math.max(0, weekly_km - used);
  const fillerIdxs: number[] = [];
  for (let i = 0; i < mix.length; i++) {
    if (i === longIdx || i === qualityIdx) continue;
    fillerIdxs.push(i);
  }
  if (fillerIdxs.length > 0) {
    const per = remaining / fillerIdxs.length;
    for (const idx of fillerIdxs) sizes[idx] = per;
  }

  // 4. A long run should not be smaller than any other session. If a filler
  // is bigger, move distance over until the long run dominates or hits its
  // ceiling.
  if (longIdx >= 0) {
    for (const idx of fillerIdxs) {
      if (sizes[idx] > sizes[longIdx]) {
        const room = longRunCapRaw - sizes[longIdx];
        if (room <= 0) break;
        const transfer = Math.min(sizes[idx] - sizes[longIdx], room) / 2;
        sizes[longIdx] += transfer;
        sizes[idx] -= transfer;
      }
    }
  }

  // Round to 0.5 km for user-friendly numbers.
  return sizes.map((v) => Math.max(1, Math.round(v * 2) / 2));
}

/** Long-run share of weekly distance, rough defaults by goal. */
function longRunShareOfWeek(goal: GoalDistance): number {
  switch (goal) {
    case 'habit':
      return 0.35;
    case '5k':
      return 0.3;
    case '10k':
      return 0.3;
    case 'half_marathon':
      return 0.33;
    case 'marathon':
      return 0.35;
  }
}

function goalDistanceKm(goal: GoalDistance): number | null {
  switch (goal) {
    case '5k':
      return 5;
    case '10k':
      return 10;
    case 'half_marathon':
      return 21.1;
    case 'marathon':
      return 42.2;
    case 'habit':
      return null;
  }
}

/**
 * Default long-run ceiling when the user didn't set one. Conservative: for
 * half marathon, peak long run around 22 km; for marathon, around 32 km.
 * Scales down by runner level.
 */
export function longRunCeiling(profile: RunnerProfile): number {
  const goalCeiling: Record<GoalDistance, number> = {
    habit: 10,
    '5k': 12,
    '10k': 16,
    half_marathon: 22,
    marathon: 32,
  };
  const base = goalCeiling[profile.goal_distance];
  const factor =
    profile.level === 'beginner'
      ? 0.7
      : profile.level === 'returning_runner'
        ? 0.85
        : 1;
  return base * factor;
}

/**
 * Assign workouts to days within the runner's available_days, placing the
 * long run on preferred_long_run_day and the quality session with at least
 * one non-running day after it when possible.
 */
export function assignDays(
  profile: RunnerProfile,
  mix: Array<{ type: WorkoutType }>,
): Weekday[] {
  const available = dedupeWeekdays(profile.available_days);
  const longDay = profile.preferred_long_run_day;

  // Ensure the long-run day is in the pool.
  if (!available.includes(longDay)) available.push(longDay);

  if (mix.length > available.length) {
    // The runner asked for more runs than days they offered. Fall through
    // by cycling through the whole week; caller's intent wins.
    return spreadAcrossWeek(mix.length, longDay);
  }

  const longIdx = mix.findIndex((m) => m.type === 'long_run');
  const qualityIdx = mix.findIndex(
    (m) =>
      m.type === 'intervals' ||
      m.type === 'tempo' ||
      m.type === 'race_pace',
  );

  const days: Weekday[] = new Array(mix.length);
  const used = new Set<Weekday>();

  if (longIdx >= 0) {
    days[longIdx] = longDay;
    used.add(longDay);
  }

  // Quality placement: prefer a day that's at least 48h before the long run
  // and has at least one rest day after it inside the runner's pool.
  if (qualityIdx >= 0) {
    const candidate = pickQualityDay(available, used, longDay);
    days[qualityIdx] = candidate;
    used.add(candidate);
  }

  // Fill the remaining slots by spreading the rest as far apart as
  // possible across the remaining available days.
  const remainingSlots: number[] = [];
  for (let i = 0; i < mix.length; i++) if (!days[i]) remainingSlots.push(i);
  const remainingDays = available.filter((d) => !used.has(d));
  remainingDays.sort(byWeekdayOrder);
  for (let i = 0; i < remainingSlots.length; i++) {
    const d = remainingDays[i] ?? available[i % available.length];
    days[remainingSlots[i]] = d;
    used.add(d);
  }

  return days;
}

function dedupeWeekdays(days: Weekday[]): Weekday[] {
  const seen = new Set<Weekday>();
  const out: Weekday[] = [];
  for (const d of days) {
    if (!seen.has(d)) {
      seen.add(d);
      out.push(d);
    }
  }
  return out.sort(byWeekdayOrder);
}

function byWeekdayOrder(a: Weekday, b: Weekday): number {
  return WEEKDAYS.indexOf(a) - WEEKDAYS.indexOf(b);
}

function pickQualityDay(
  available: Weekday[],
  used: Set<Weekday>,
  longDay: Weekday,
): Weekday {
  // Prefer Tuesday or Wednesday when available (classic quality-day slot).
  const preferred: Weekday[] = ['Tue', 'Wed', 'Thu'];
  for (const d of preferred) {
    if (available.includes(d) && !used.has(d) && d !== longDay) return d;
  }
  const remaining = available.filter((d) => !used.has(d) && d !== longDay);
  return remaining[0] ?? available[0];
}

function spreadAcrossWeek(count: number, longDay: Weekday): Weekday[] {
  const step = 7 / count;
  const longIdx = WEEKDAYS.indexOf(longDay);
  const days: Weekday[] = [];
  for (let i = 0; i < count; i++) {
    const idx = Math.round((longIdx + i * step) % 7);
    days.push(WEEKDAYS[(idx + 7) % 7]);
  }
  return days;
}

/**
 * Estimate duration from distance. Use easy pace as a baseline so totals
 * line up well enough for calendar blocks; the pace engine provides the
 * true target for the workout itself.
 */
export function estimateDurationMin(
  distance_km: number,
  type: WorkoutType,
): number {
  const basePaceSecPerKm = (() => {
    switch (type) {
      case 'recovery':
        return 420; // 7:00/km
      case 'easy':
      case 'long_run':
        return 390; // 6:30/km
      case 'tempo':
        return 300; // 5:00/km
      case 'intervals':
        return 330; // includes recoveries
      case 'race_pace':
        return 320;
      case 'strides':
        return 360;
      case 'rest':
        return 0;
    }
  })();
  return Math.round((distance_km * basePaceSecPerKm) / 60);
}
