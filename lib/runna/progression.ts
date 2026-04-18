// Weekly mileage progression.
//
// Runna separates mileage and pace: mileage is shaped by ability, current
// mileage, longest run, runs per week, plan length, and training-volume
// settings. This module implements a transparent progression that honors
// those levers. Pace is handled separately in `pace.ts`.

import type { BuildStyle, PlanWeek, RunnerProfile } from './types.ts';

export interface WeekPlanShell {
  week_number: number;
  kind: PlanWeek['kind'];
  planned_distance_km: number;
}

export interface ProgressionResult {
  weeks: WeekPlanShell[];
  baseline_km: number;
  baseline_explanation: string;
}

interface StyleSpec {
  /** Fractional weekly growth during a build week. */
  growth_rate: number;
  /** Weeks between deloads. */
  deload_interval: number;
  /** Fraction of previous week's distance during a deload. */
  deload_fraction: number;
  /** Taper weeks before a race, in order from earliest to race week. */
  taper_fractions: number[];
}

function styleSpec(style: BuildStyle): StyleSpec {
  switch (style) {
    case 'light':
      return {
        growth_rate: 0.05,
        deload_interval: 3,
        deload_fraction: 0.7,
        taper_fractions: [0.7, 0.55, 0.4],
      };
    case 'standard':
      return {
        growth_rate: 0.08,
        deload_interval: 4,
        deload_fraction: 0.75,
        taper_fractions: [0.75, 0.6, 0.45],
      };
    case 'aggressive':
      return {
        growth_rate: 0.1,
        deload_interval: 4,
        deload_fraction: 0.8,
        taper_fractions: [0.8, 0.65, 0.5],
      };
  }
}

/**
 * Calibrate the starting weekly distance.
 *
 * Runna treats entered current mileage as what the runner could realistically
 * cover in the first week, then nudges up or down by ability and run days.
 * We do the same conservatively: clamp to what the longest recent run
 * supports for the requested number of sessions, and never start higher
 * than the runner already does without a small upward nudge for more
 * experienced runners.
 */
export function calibrateBaseline(
  profile: RunnerProfile,
): { baseline_km: number; explanation: string } {
  const reasons: string[] = [];
  let baseline = Math.max(profile.current_weekly_distance_km, 0);
  reasons.push(
    `started from current weekly distance ${baseline.toFixed(1)} km`,
  );

  // Longest-run sanity: if the longest recent run is tiny, cap the week
  // so we don't open with a long run bigger than the runner has done.
  const feasible = profile.longest_recent_run_km * profile.runs_per_week;
  if (baseline > feasible && feasible > 0) {
    baseline = feasible;
    reasons.push(
      `capped by longest recent run × runs/week (${feasible.toFixed(1)} km)`,
    );
  }

  // If the runner has zero recent mileage, seed a tiny starter load scaled
  // to runs_per_week so the first week doesn't divide by zero.
  if (baseline <= 0) {
    baseline = profile.runs_per_week * 3;
    reasons.push(
      `no baseline reported; seeded ${baseline.toFixed(1)} km from runs/week`,
    );
  }

  // Small ability nudge for runners who can safely handle more. Done after
  // the longest-run clamp so we don't erase that safety.
  const abilityBump: Record<string, number> = {
    beginner: 0,
    intermediate: 0.05,
    advanced: 0.1,
    elite: 0.15,
    elite_plus: 0.15,
  };
  const bump = abilityBump[profile.running_ability] ?? 0;
  if (bump > 0) {
    const nudged = baseline * (1 + bump);
    reasons.push(
      `nudged +${Math.round(bump * 100)}% for ${profile.running_ability} ability`,
    );
    baseline = nudged;
  }

  // Respect an explicit weekly cap if the runner set one.
  if (
    profile.max_weekly_distance_km &&
    baseline > profile.max_weekly_distance_km
  ) {
    baseline = profile.max_weekly_distance_km;
    reasons.push(
      `clamped to user's weekly cap ${profile.max_weekly_distance_km.toFixed(1)} km`,
    );
  }

  return {
    baseline_km: roundKm(baseline),
    explanation: reasons.join('; '),
  };
}

function roundKm(x: number): number {
  return Math.round(x * 10) / 10;
}

/**
 * Build the week-by-week distance progression.
 *
 * The last up to 3 weeks become a taper when the goal is a race; the final
 * week is marked `race`. Deload weeks are inserted at the configured
 * cadence, skipping any week already inside the taper window.
 */
export function buildProgression(
  profile: RunnerProfile,
  total_weeks: number,
): ProgressionResult {
  const style = profile.build_style ?? mapVolumeToStyle(profile);
  const spec = styleSpec(style);
  const { baseline_km, explanation } = calibrateBaseline(profile);

  // Decide taper window. Only races get a true taper; habit plans don't.
  const isRace = profile.goal_type !== 'habit' && !!profile.race_date;
  const taperLen = isRace ? Math.min(3, Math.max(0, total_weeks - 1)) : 0;
  const taperStart = total_weeks - taperLen + 1;

  const weeks: WeekPlanShell[] = [];
  let lastBuild = baseline_km;

  for (let w = 1; w <= total_weeks; w++) {
    let kind: PlanWeek['kind'] = 'build';
    let distance = 0;

    if (isRace && w === total_weeks) {
      kind = 'race';
      // Race week: race distance itself plus an easy day or two. Planned
      // distance represents the structured week, not the race itself, so
      // keep it very light.
      const fractionIndex = spec.taper_fractions.length - 1;
      distance = lastBuild * spec.taper_fractions[fractionIndex];
    } else if (isRace && w >= taperStart) {
      kind = 'taper';
      const idx = Math.max(
        0,
        w - taperStart, // 0, 1, 2...
      );
      const frac =
        spec.taper_fractions[
          Math.min(idx, spec.taper_fractions.length - 2)
        ];
      distance = lastBuild * frac;
    } else if (w > 1 && w % spec.deload_interval === 0) {
      kind = 'deload';
      distance = lastBuild * spec.deload_fraction;
    } else {
      // Build week. Grow from the last non-deload, non-taper reference.
      const target = lastBuild * (1 + spec.growth_rate);
      distance = w === 1 ? baseline_km : target;
      lastBuild = distance;
    }

    // Respect an explicit weekly cap throughout.
    if (
      profile.max_weekly_distance_km &&
      distance > profile.max_weekly_distance_km
    ) {
      distance = profile.max_weekly_distance_km;
      if (kind === 'build') {
        lastBuild = distance;
      }
    }

    weeks.push({
      week_number: w,
      kind,
      planned_distance_km: roundKm(distance),
    });
  }

  return { weeks, baseline_km, baseline_explanation: explanation };
}

function mapVolumeToStyle(profile: RunnerProfile): BuildStyle {
  if (profile.training_volume === 'gradual') return 'light';
  if (profile.training_volume === 'progressive') return 'aggressive';
  return 'standard';
}

/** Rough ISO-date week-counting between two ISO date strings inclusive. */
export function weeksBetween(
  startISO: string,
  endISO: string,
): number {
  const start = new Date(startISO + 'T00:00:00Z').getTime();
  const end = new Date(endISO + 'T00:00:00Z').getTime();
  const days = Math.max(1, Math.round((end - start) / (24 * 60 * 60 * 1000)));
  return Math.max(1, Math.ceil(days / 7));
}
