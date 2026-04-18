// Human-readable plan exports.
//
// Markdown is the primary format because it works for a coach reviewing the
// plan, for commit review, and as input to an LLM that's rewriting or
// adapting the plan. JSON export is trivial (JSON.stringify) and not
// included here.

import { formatTarget } from './pace.ts';
import type { Plan, RunnerProfile, Workout } from './types.ts';

export function planToMarkdown(plan: Plan, profile: RunnerProfile): string {
  const lines: string[] = [];
  lines.push(`# Training plan — ${profile.name ?? profile.id}`);
  lines.push('');
  lines.push(`- goal: ${profile.goal_distance} (${profile.goal_type})`);
  if (profile.race_date) lines.push(`- race date: ${profile.race_date}`);
  lines.push(
    `- plan: ${plan.plan_length_weeks} weeks, ${profile.runs_per_week} runs/week, ${plan.style} build, ${plan.guidance_mode} guidance`,
  );
  lines.push(`- starts ${plan.start_date}, ends ${plan.end_date}`);
  if (plan.baseline_explanation) {
    lines.push(`- baseline: ${plan.baseline_explanation}`);
  }
  lines.push('');

  for (const week of plan.weeks) {
    const kind = week.kind === 'build' ? '' : ` _(${week.kind})_`;
    lines.push(
      `## Week ${week.week_number}${kind} — ${week.planned_distance_km} km`,
    );
    const sorted = [...week.workouts].sort((a, b) =>
      a.date.localeCompare(b.date),
    );
    for (const w of sorted) {
      lines.push(`- **${w.date} ${w.day}** ${formatWorkoutLine(w, profile)}`);
    }
    lines.push('');
  }

  return lines.join('\n');
}

function formatWorkoutLine(w: Workout, profile: RunnerProfile): string {
  const target = formatTarget(w.target, profile.units);
  const dist = `${w.target_distance_km} km`;
  const dur = `~${w.estimated_duration_min} min`;
  return `${w.title} — ${dist}, ${dur}, ${target}`;
}
