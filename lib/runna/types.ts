// Runna clone engine — core data model.
//
// These types cover profile, plan, workout, and pace-target shapes used by
// every other module in `lib/runna/`. Matches the JSON schema in
// `docs/runna-clone-blueprint.md`.

export type Weekday =
  | 'Mon'
  | 'Tue'
  | 'Wed'
  | 'Thu'
  | 'Fri'
  | 'Sat'
  | 'Sun';

export const WEEKDAYS: Weekday[] = [
  'Mon',
  'Tue',
  'Wed',
  'Thu',
  'Fri',
  'Sat',
  'Sun',
];

export type RunnerLevel =
  | 'beginner'
  | 'returning_runner'
  | 'intermediate'
  | 'advanced';

// Runna's public ability ladder. We add 'elite_plus' for symmetry; the
// engine currently treats advanced and above the same.
export type RunningAbility =
  | 'beginner'
  | 'intermediate'
  | 'advanced'
  | 'elite'
  | 'elite_plus';

export type GoalDistance =
  | 'habit'
  | '5k'
  | '10k'
  | 'half_marathon'
  | 'marathon';

export type GoalType = 'habit' | 'finish' | 'improve' | 'time';

export type TrainingVolume = 'gradual' | 'steady' | 'progressive';
export type Difficulty = 'comfortable' | 'balanced' | 'challenging';
export type BuildStyle = 'light' | 'standard' | 'aggressive';
export type GuidanceMode = 'pace' | 'effort';
export type Units = 'km' | 'mi';

export interface RaceTimes {
  /** 5K time in seconds. */
  fiveK_seconds?: number;
  tenK_seconds?: number;
  halfMarathon_seconds?: number;
  marathon_seconds?: number;
}

export interface RunnerProfile {
  id: string;
  name?: string;
  level: RunnerLevel;
  running_ability: RunningAbility;
  goal_type: GoalType;
  goal_distance: GoalDistance;
  /** ISO date string, e.g. "2026-09-20". */
  race_date?: string;
  goal_time_seconds?: number;

  current_weekly_distance_km: number;
  longest_recent_run_km: number;
  recent_race_times?: RaceTimes;

  /** Weekdays the runner is willing to run. */
  available_days: Weekday[];
  preferred_long_run_day: Weekday;
  runs_per_week: 2 | 3 | 4 | 5 | 6;

  training_volume: TrainingVolume;
  difficulty: Difficulty;
  build_style?: BuildStyle;
  guidance_mode: GuidanceMode;
  units: Units;

  /** Optional safety caps. */
  max_long_run_km?: number;
  max_weekly_distance_km?: number;

  /** Integration flags — honored by sync services, not by the core engine. */
  calendar_enabled?: boolean;
  strava_enabled?: boolean;
}

export type WorkoutType =
  | 'easy'
  | 'recovery'
  | 'long_run'
  | 'tempo'
  | 'intervals'
  | 'race_pace'
  | 'strides'
  | 'rest';

/** A single block inside an interval or tempo session. */
export interface Rep {
  rep: number;
  /** Distance of the rep in meters (use either distance_m or duration_sec). */
  distance_m?: number;
  duration_sec?: number;
  target_pace_sec_per_km?: number;
  recovery_sec?: number;
}

export interface WorkoutStructure {
  warmup?: string;
  main_set?: Rep[];
  /** Free-text description when the structure isn't a rep set. */
  main_text?: string;
  cooldown?: string;
}

export type TargetMode = 'pace' | 'effort';

export interface PaceTarget {
  mode: 'pace';
  /** Inclusive low bound, seconds per km. */
  pace_low_sec_per_km: number;
  /** Inclusive high bound, seconds per km. Always >= low. */
  pace_high_sec_per_km: number;
  /** Optional RPE hint for the same target. */
  rpe?: number;
  /** Short human description, e.g. "conversational easy". */
  description: string;
}

export interface EffortTarget {
  mode: 'effort';
  /** Borg-ish 1–10 scale, keep as a range when useful. */
  rpe_low: number;
  rpe_high: number;
  description: string;
}

export type WorkoutTarget = PaceTarget | EffortTarget;

export interface Workout {
  id: string;
  plan_id: string;
  week_number: number;
  /** ISO date string. */
  date: string;
  day: Weekday;
  type: WorkoutType;
  /** Sub-type label like "6x400m" or "marathon-pace finish". */
  subtype?: string;
  title: string;
  target_distance_km: number;
  estimated_duration_min: number;
  structure: WorkoutStructure;
  target: WorkoutTarget;
  /** Filled in by sync services later; blank at generation time. */
  calendar_event_id?: string;
  strava_activity_id?: string;
  status: 'planned' | 'completed' | 'skipped' | 'moved';
}

export interface PlanWeek {
  week_number: number;
  /** Kind of week for progression logic. */
  kind: 'build' | 'deload' | 'taper' | 'race';
  planned_distance_km: number;
  workouts: Workout[];
}

export interface Plan {
  id: string;
  runner_id: string;
  goal: string;
  start_date: string;
  end_date: string;
  plan_length_weeks: number;
  style: BuildStyle;
  guidance_mode: GuidanceMode;
  weeks: PlanWeek[];
  /** Human explanation of the baseline calibration. Useful for trust. */
  baseline_explanation?: string;
}
