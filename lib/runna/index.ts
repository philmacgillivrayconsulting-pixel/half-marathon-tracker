// Public surface of the Runna clone engine.
//
// Consumers should import from `@/lib/runna` rather than reaching into
// submodules, so we can rearrange internals later without breaking callers.

export * from './types.ts';
export { generatePlan } from './plan.ts';
export type { GenerateOptions } from './plan.ts';
export {
  paceEngine,
  derivePaces,
  riegelEquivalent,
  pickAnchor,
  formatPace,
  formatTarget,
} from './pace.ts';
export type { FitnessAnchor, BasePaces } from './pace.ts';
export {
  buildProgression,
  calibrateBaseline,
  weeksBetween,
} from './progression.ts';
export type { ProgressionResult, WeekPlanShell } from './progression.ts';
export {
  chooseWorkoutMix,
  allocateDistances,
  assignDays,
  longRunCeiling,
  estimateDurationMin,
} from './templates.ts';
export { planToMarkdown } from './export.ts';
