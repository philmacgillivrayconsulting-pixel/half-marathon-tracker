// Plan generator orchestrator.
//
// Takes a RunnerProfile and emits a full Plan. Combines progression,
// templates, and the pace engine. Pure function: same input → same output.

import { paceEngine } from './pace.ts';
import { buildProgression, weeksBetween } from './progression.ts';
import {
  allocateDistances,
  assignDays,
  chooseWorkoutMix,
  estimateDurationMin,
} from './templates.ts';
import type {
  Plan,
  PlanWeek,
  RunnerProfile,
  Weekday,
  Workout,
  WorkoutStructure,
  WorkoutType,
} from './types.ts';
import { WEEKDAYS } from './types.ts';

export interface GenerateOptions {
  /** ISO date string. Defaults to today (UTC) when omitted. */
  start_date?: string;
  /**
   * Default plan length in weeks, used when the profile has no race_date.
   * Defaults to 12.
   */
  default_weeks?: number;
  /** Stable ID for the generated plan. Defaults to a timestamp-based ID. */
  plan_id?: string;
}

export function generatePlan(
  profile: RunnerProfile,
  opts: GenerateOptions = {},
): Plan {
  const start_date = opts.start_date ?? todayISO();
  const total_weeks = resolveLength(profile, start_date, opts);
  const end_date = addDaysISO(start_date, total_weeks * 7 - 1);

  const progression = buildProgression(profile, total_weeks);
  const plan_id = opts.plan_id ?? `plan_${Date.now()}`;

  const weeks: PlanWeek[] = progression.weeks.map((shell) => {
    const mix = chooseWorkoutMix(
      profile,
      { kind: shell.kind, week_number: shell.week_number },
      total_weeks,
    );
    const distances = allocateDistances(
      profile,
      mix,
      shell.planned_distance_km,
      { kind: shell.kind, week_number: shell.week_number },
    );
    const days = assignDays(profile, mix);
    // Race-week race day aligns to the profile.race_date when present.
    const raceAlignment =
      shell.kind === 'race' && profile.race_date
        ? weekdayOf(profile.race_date)
        : null;

    const workouts: Workout[] = mix.map((m, i) => {
      const day =
        shell.kind === 'race' && m.type === 'race_pace' && raceAlignment
          ? raceAlignment
          : days[i];
      const date = dateForWeekday(start_date, shell.week_number, day);
      const distance = distances[i];
      const type: WorkoutType = m.type;
      const duration = estimateDurationMin(distance, type);
      const target = paceEngine(
        profile,
        type,
        m.subtype_length_m ?? null,
      );
      const structure = describeStructure(type, m.subtype, m.subtype_length_m);

      return {
        id: `${plan_id}_w${shell.week_number}_${i + 1}`,
        plan_id,
        week_number: shell.week_number,
        date,
        day,
        type,
        subtype: m.subtype,
        title: titleFor(type, m.subtype, distance),
        target_distance_km: distance,
        estimated_duration_min: duration,
        structure,
        target,
        status: 'planned',
      };
    });

    return {
      week_number: shell.week_number,
      kind: shell.kind,
      planned_distance_km: shell.planned_distance_km,
      workouts,
    };
  });

  return {
    id: plan_id,
    runner_id: profile.id,
    goal: `${profile.goal_distance}_${profile.goal_type}`,
    start_date,
    end_date,
    plan_length_weeks: total_weeks,
    style: profile.build_style ?? 'standard',
    guidance_mode: profile.guidance_mode,
    weeks,
    baseline_explanation: progression.baseline_explanation,
  };
}

function resolveLength(
  profile: RunnerProfile,
  start_date: string,
  opts: GenerateOptions,
): number {
  if (profile.race_date) {
    return Math.max(4, weeksBetween(start_date, profile.race_date));
  }
  return opts.default_weeks ?? 12;
}

function todayISO(): string {
  return new Date().toISOString().slice(0, 10);
}

function addDaysISO(dateISO: string, days: number): string {
  const d = new Date(dateISO + 'T00:00:00Z');
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

function weekdayOf(dateISO: string): Weekday {
  const d = new Date(dateISO + 'T00:00:00Z');
  // Date.getUTCDay: Sun=0..Sat=6. WEEKDAYS starts Mon.
  const jsDay = d.getUTCDay();
  const idx = (jsDay + 6) % 7;
  return WEEKDAYS[idx];
}

function dateForWeekday(
  start_date: string,
  week_number: number,
  day: Weekday,
): string {
  const weekStart = addDaysISO(start_date, (week_number - 1) * 7);
  const startDow = weekdayOf(weekStart);
  const startIdx = WEEKDAYS.indexOf(startDow);
  const targetIdx = WEEKDAYS.indexOf(day);
  const offset = (targetIdx - startIdx + 7) % 7;
  return addDaysISO(weekStart, offset);
}

function titleFor(
  type: WorkoutType,
  subtype: string | undefined,
  distance_km: number,
): string {
  const d = distance_km.toFixed(1).replace(/\.0$/, '');
  switch (type) {
    case 'easy':
      return subtype ? `Easy — ${subtype}` : `Easy ${d} km`;
    case 'recovery':
      return `Recovery ${d} km`;
    case 'long_run':
      return `Long Run ${d} km`;
    case 'tempo':
      return `Tempo ${d} km`;
    case 'intervals':
      return `Intervals — ${subtype ?? 'mixed'}`;
    case 'race_pace':
      return subtype === 'race' ? `Race Day` : `Race-Pace Session`;
    case 'strides':
      return `Easy ${d} km + strides`;
    case 'rest':
      return `Rest`;
  }
}

function describeStructure(
  type: WorkoutType,
  subtype: string | undefined,
  repLenMeters: number | undefined,
): WorkoutStructure {
  switch (type) {
    case 'intervals': {
      const reps = parseRepCount(subtype);
      if (reps && repLenMeters) {
        return {
          warmup: '10–15 min easy',
          main_set: Array.from({ length: reps }, (_, i) => ({
            rep: i + 1,
            distance_m: repLenMeters,
            recovery_sec: repLenMeters <= 400 ? 90 : 120,
          })),
          cooldown: '10 min easy',
        };
      }
      return {
        warmup: '10–15 min easy',
        main_text: subtype ?? 'structured interval set',
        cooldown: '10 min easy',
      };
    }
    case 'tempo':
      return {
        warmup: '10 min easy',
        main_text: 'sustained tempo at threshold effort',
        cooldown: '10 min easy',
      };
    case 'race_pace':
      if (subtype === 'race') {
        return { main_text: 'Race day — follow your race plan.' };
      }
      return {
        warmup: '10 min easy',
        main_text: 'race-pace blocks with easy floats',
        cooldown: '10 min easy',
      };
    case 'long_run':
      return { main_text: 'steady endurance; mostly easy' };
    case 'easy':
      return {
        main_text: subtype === 'shake-out'
          ? 'short, relaxed shake-out'
          : 'easy conversational run',
      };
    case 'recovery':
      return { main_text: 'very easy, keep it short' };
    case 'strides':
      return {
        warmup: '10 min easy',
        main_text: '6–8 × 20s strides with full recovery',
        cooldown: '5 min easy',
      };
    case 'rest':
      return { main_text: 'rest day' };
  }
}

function parseRepCount(subtype: string | undefined): number | null {
  if (!subtype) return null;
  // Matches "6x800m", "8x400m", "4x1000m", etc.
  const m = subtype.match(/^(\d+)\s*[xX]\s*\d+/);
  if (!m) return null;
  const n = parseInt(m[1], 10);
  return isFinite(n) ? n : null;
}
