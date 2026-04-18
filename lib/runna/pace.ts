// Pace engine.
//
// Pace targets come from the runner's best available "current race time"
// anchor. We convert the anchor to equivalent race times across 5K, 10K,
// half marathon, and marathon using Riegel's formula, derive base training
// paces from those equivalents, then map workout types to pace bands.
//
// Beginners, returners, and runners who chose effort-mode bypass the
// numeric pace bands and get RPE targets only. This mirrors Runna's public
// behavior where new-to-running and return-to-running plans are
// effort-based.

import type {
  EffortTarget,
  GoalDistance,
  PaceTarget,
  RaceTimes,
  RunnerProfile,
  WorkoutTarget,
  WorkoutType,
} from './types.ts';

export interface FitnessAnchor {
  /** Distance of the anchor performance, in meters. */
  distance_m: number;
  /** Duration in seconds. */
  time_sec: number;
  source: 'race_time' | 'goal_time' | 'default_by_ability';
}

export interface BasePaces {
  /** All values are seconds per km. */
  recovery: number;
  easy: number;
  marathon: number;
  halfMarathon: number;
  threshold: number;
  tenK: number;
  fiveK: number;
  /** VO2 / short interval pace, ~3K equivalent. */
  interval: number;
}

const RIEGEL_EXPONENT = 1.06;

export function riegelEquivalent(
  knownDistance_m: number,
  knownTime_sec: number,
  targetDistance_m: number,
): number {
  return (
    knownTime_sec *
    Math.pow(targetDistance_m / knownDistance_m, RIEGEL_EXPONENT)
  );
}

function paceSecPerKm(distance_m: number, time_sec: number): number {
  return time_sec / (distance_m / 1000);
}

/** Pick the best available fitness anchor. */
export function pickAnchor(profile: RunnerProfile): FitnessAnchor | null {
  const t = profile.recent_race_times ?? {};

  // Prefer an anchor near to the runner's goal distance for accuracy.
  const preferenceOrder: Array<{
    distance_m: number;
    get: (r: RaceTimes) => number | undefined;
  }> = [
    { distance_m: 21_097.5, get: (r) => r.halfMarathon_seconds },
    { distance_m: 10_000, get: (r) => r.tenK_seconds },
    { distance_m: 42_195, get: (r) => r.marathon_seconds },
    { distance_m: 5_000, get: (r) => r.fiveK_seconds },
  ];
  for (const c of preferenceOrder) {
    const time = c.get(t);
    if (time && time > 0) {
      return { distance_m: c.distance_m, time_sec: time, source: 'race_time' };
    }
  }

  // Fall back to a goal time only if we have both a time and a distance.
  if (profile.goal_time_seconds && profile.goal_distance) {
    const dist = goalDistanceMeters(profile.goal_distance);
    if (dist) {
      return {
        distance_m: dist,
        time_sec: profile.goal_time_seconds,
        source: 'goal_time',
      };
    }
  }

  return null;
}

export function goalDistanceMeters(d: GoalDistance): number | null {
  switch (d) {
    case '5k':
      return 5_000;
    case '10k':
      return 10_000;
    case 'half_marathon':
      return 21_097.5;
    case 'marathon':
      return 42_195;
    case 'habit':
      return null;
  }
}

// Rough default anchors by self-reported ability. Only used when the runner
// has no race times and no goal time. These exist so the engine can still
// produce reasonable pace hints for intermediate+ runners in pace mode.
const DEFAULT_ANCHORS_BY_ABILITY: Record<
  string,
  { distance_m: number; time_sec: number }
> = {
  beginner: { distance_m: 5_000, time_sec: 2100 }, // 35:00 5K
  intermediate: { distance_m: 5_000, time_sec: 1680 }, // 28:00 5K
  advanced: { distance_m: 10_000, time_sec: 2700 }, // 45:00 10K
  elite: { distance_m: 10_000, time_sec: 2280 }, // 38:00 10K
  elite_plus: { distance_m: 10_000, time_sec: 2040 }, // 34:00 10K
};

export function derivePaces(anchor: FitnessAnchor): BasePaces {
  // Equivalent race times (seconds).
  const eq5k = riegelEquivalent(anchor.distance_m, anchor.time_sec, 5_000);
  const eq10k = riegelEquivalent(anchor.distance_m, anchor.time_sec, 10_000);
  const eqHM = riegelEquivalent(anchor.distance_m, anchor.time_sec, 21_097.5);
  const eqM = riegelEquivalent(anchor.distance_m, anchor.time_sec, 42_195);
  // Internal 3K equivalent for short intervals.
  const eq3k = riegelEquivalent(anchor.distance_m, anchor.time_sec, 3_000);

  const pace5k = paceSecPerKm(5_000, eq5k);
  const pace10k = paceSecPerKm(10_000, eq10k);
  const paceHM = paceSecPerKm(21_097.5, eqHM);
  const paceM = paceSecPerKm(42_195, eqM);
  const paceInterval = paceSecPerKm(3_000, eq3k);

  // Threshold sits near half-marathon pace for most trained runners; pick
  // the midpoint between HM and 10K for a slightly sharper "threshold"
  // label used in interval sessions.
  const threshold = (paceHM + pace10k) / 2;

  // Easy and recovery are expressed as offsets from marathon pace so they
  // scale with ability: fitter runners get tighter offsets, slower runners
  // get wider ones, which keeps "conversational" honest.
  const easy = paceM + 45;
  const recovery = paceM + 90;

  return {
    recovery,
    easy,
    marathon: paceM,
    halfMarathon: paceHM,
    threshold,
    tenK: pace10k,
    fiveK: pace5k,
    interval: paceInterval,
  };
}

/** Width of the pace band, seconds per km, one-sided. */
interface BandSpec {
  center: keyof BasePaces;
  half_width: number;
  rpe: number;
  description: string;
}

function bandForWorkout(
  type: WorkoutType,
  subtypeLengthMeters: number | null,
): BandSpec {
  switch (type) {
    case 'recovery':
      return {
        center: 'recovery',
        half_width: 20,
        rpe: 2,
        description: 'very easy, full sentences',
      };
    case 'easy':
      return {
        center: 'easy',
        half_width: 15,
        rpe: 3,
        description: 'conversational easy',
      };
    case 'long_run':
      return {
        center: 'easy',
        half_width: 20,
        rpe: 4,
        description: 'steady endurance, mostly easy',
      };
    case 'tempo':
      return {
        center: 'threshold',
        half_width: 8,
        rpe: 7,
        description: 'comfortably hard, sustained',
      };
    case 'intervals': {
      // Short reps faster than threshold; longer reps closer to 10K/HM.
      if (subtypeLengthMeters != null && subtypeLengthMeters <= 400) {
        return {
          center: 'interval',
          half_width: 5,
          rpe: 9,
          description: 'fast, hard but repeatable',
        };
      }
      if (subtypeLengthMeters != null && subtypeLengthMeters <= 800) {
        return {
          center: 'fiveK',
          half_width: 5,
          rpe: 8,
          description: '5K effort',
        };
      }
      return {
        center: 'tenK',
        half_width: 5,
        rpe: 8,
        description: '10K effort',
      };
    }
    case 'race_pace':
      return {
        center: 'marathon',
        half_width: 5,
        rpe: 6,
        description: 'race effort',
      };
    case 'strides':
      return {
        center: 'interval',
        half_width: 10,
        rpe: 8,
        description: '~20s fast strides, fully recovered between reps',
      };
    case 'rest':
      return {
        center: 'recovery',
        half_width: 0,
        rpe: 1,
        description: 'rest day',
      };
  }
}

/** RPE-only target used for beginners, returners, or effort mode. */
function effortTargetFor(type: WorkoutType): EffortTarget {
  switch (type) {
    case 'recovery':
      return {
        mode: 'effort',
        rpe_low: 1,
        rpe_high: 2,
        description: 'very easy, recovery',
      };
    case 'easy':
      return {
        mode: 'effort',
        rpe_low: 3,
        rpe_high: 4,
        description: 'easy, conversational',
      };
    case 'long_run':
      return {
        mode: 'effort',
        rpe_low: 3,
        rpe_high: 5,
        description: 'steady endurance; mostly easy, can build late',
      };
    case 'tempo':
      return {
        mode: 'effort',
        rpe_low: 7,
        rpe_high: 8,
        description: 'comfortably hard, sustained',
      };
    case 'intervals':
      return {
        mode: 'effort',
        rpe_low: 8,
        rpe_high: 9,
        description: 'hard but repeatable with recovery',
      };
    case 'race_pace':
      return {
        mode: 'effort',
        rpe_low: 5,
        rpe_high: 7,
        description: 'target race effort',
      };
    case 'strides':
      return {
        mode: 'effort',
        rpe_low: 7,
        rpe_high: 8,
        description: 'short accelerations, full recovery',
      };
    case 'rest':
      return {
        mode: 'effort',
        rpe_low: 1,
        rpe_high: 1,
        description: 'rest',
      };
  }
}

export function paceEngine(
  profile: RunnerProfile,
  type: WorkoutType,
  subtypeLengthMeters: number | null = null,
): WorkoutTarget {
  // Effort fallback for beginner or returning runners, and anyone who
  // explicitly asked for effort guidance.
  if (
    profile.guidance_mode === 'effort' ||
    profile.level === 'beginner' ||
    profile.level === 'returning_runner'
  ) {
    return effortTargetFor(type);
  }

  let anchor = pickAnchor(profile);
  if (!anchor) {
    const def = DEFAULT_ANCHORS_BY_ABILITY[profile.running_ability];
    if (def) {
      anchor = { ...def, source: 'default_by_ability' };
    }
  }
  if (!anchor) {
    return effortTargetFor(type);
  }

  const base = derivePaces(anchor);
  const spec = bandForWorkout(type, subtypeLengthMeters);
  const center = base[spec.center];
  const target: PaceTarget = {
    mode: 'pace',
    pace_low_sec_per_km: Math.round(center - spec.half_width),
    pace_high_sec_per_km: Math.round(center + spec.half_width),
    rpe: spec.rpe,
    description: spec.description,
  };
  return target;
}

/** Format seconds per km as "m:ss/km". */
export function formatPace(sec_per_km: number, units: 'km' | 'mi'): string {
  const s = units === 'mi' ? sec_per_km * 1.609344 : sec_per_km;
  const total = Math.round(s);
  const m = Math.floor(total / 60);
  const r = total % 60;
  return `${m}:${r.toString().padStart(2, '0')}/${units}`;
}

/** Format a pace target as "4:20–4:35/km" or an RPE range. */
export function formatTarget(t: WorkoutTarget, units: 'km' | 'mi'): string {
  if (t.mode === 'pace') {
    return `${formatPace(t.pace_low_sec_per_km, units)}–${formatPace(
      t.pace_high_sec_per_km,
      units,
    )}`;
  }
  return t.rpe_low === t.rpe_high
    ? `RPE ${t.rpe_low}`
    : `RPE ${t.rpe_low}–${t.rpe_high}`;
}
