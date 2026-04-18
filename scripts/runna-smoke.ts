// Smoke test for the Runna clone engine.
//
// Runs three representative profiles through `generatePlan` and prints the
// Markdown plan for each. No test framework so it can be invoked from a bare
// Node install:
//
//     node --experimental-strip-types scripts/runna-smoke.ts
//
// Requires Node 22+.

import { generatePlan, planToMarkdown } from '../lib/runna/index.ts';
import type { RunnerProfile } from '../lib/runna/types.ts';

const returningHalf: RunnerProfile = {
  id: 'runner_phil',
  name: 'Phil',
  level: 'returning_runner',
  running_ability: 'intermediate',
  goal_type: 'finish',
  goal_distance: 'half_marathon',
  race_date: '2026-09-20',
  current_weekly_distance_km: 18,
  longest_recent_run_km: 9,
  recent_race_times: { tenK_seconds: 3360 },
  available_days: ['Tue', 'Thu', 'Sun'],
  preferred_long_run_day: 'Sun',
  runs_per_week: 3,
  training_volume: 'steady',
  difficulty: 'balanced',
  guidance_mode: 'effort',
  units: 'km',
};

const beginnerHabit: RunnerProfile = {
  id: 'runner_alex',
  name: 'Alex',
  level: 'beginner',
  running_ability: 'beginner',
  goal_type: 'habit',
  goal_distance: 'habit',
  current_weekly_distance_km: 6,
  longest_recent_run_km: 3,
  available_days: ['Mon', 'Wed', 'Sat'],
  preferred_long_run_day: 'Sat',
  runs_per_week: 2,
  training_volume: 'gradual',
  difficulty: 'comfortable',
  build_style: 'light',
  guidance_mode: 'effort',
  units: 'km',
};

const intermediateTenK: RunnerProfile = {
  id: 'runner_sam',
  name: 'Sam',
  level: 'intermediate',
  running_ability: 'advanced',
  goal_type: 'improve',
  goal_distance: '10k',
  race_date: '2026-07-05',
  current_weekly_distance_km: 40,
  longest_recent_run_km: 14,
  recent_race_times: { fiveK_seconds: 1200, tenK_seconds: 2520 },
  available_days: ['Mon', 'Tue', 'Thu', 'Fri', 'Sun'],
  preferred_long_run_day: 'Sun',
  runs_per_week: 5,
  training_volume: 'progressive',
  difficulty: 'challenging',
  build_style: 'aggressive',
  guidance_mode: 'pace',
  units: 'km',
};

function runOne(name: string, profile: RunnerProfile, start_date: string) {
  const plan = generatePlan(profile, { start_date });
  console.log('━'.repeat(72));
  console.log(`# ${name}`);
  console.log('━'.repeat(72));
  console.log(planToMarkdown(plan, profile));
}

runOne('Returning runner → half marathon (effort)', returningHalf, '2026-05-25');
runOne('Beginner → habit (2/wk light)', beginnerHabit, '2026-04-20');
runOne('Intermediate → 10K improve (aggressive)', intermediateTenK, '2026-05-04');
