import { NextRequest, NextResponse } from 'next/server';
import {
  applyAnchorSuggestion,
  applyMatchesToPlan,
  matchActivitiesToPlan,
  suggestAnchorUpdate,
} from '@/lib/runna/adaptation';
import { detectRacePR, importRecentActivities } from '@/lib/runna/strava';
import {
  getActivePlan,
  getProfile,
  updatePlan,
  upsertProfile,
} from '@/lib/runna/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runner_id?: string;
      days?: number;
    };
    const runner_id = body.runner_id;
    if (!runner_id) {
      return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
    }

    const activities = await importRecentActivities(
      runner_id,
      body.days ?? 60,
    );

    const [profile, plan] = await Promise.all([
      getProfile(runner_id),
      getActivePlan(runner_id),
    ]);

    const report = {
      imported: activities.length,
      matched: 0,
      anchor_direction: 'hold' as 'faster' | 'slower' | 'hold',
      race_pr_detected: {} as Record<string, number>,
      rationale: '',
    };

    if (profile && plan) {
      const matches = matchActivitiesToPlan(plan, activities, profile);
      applyMatchesToPlan(plan, matches);
      await updatePlan(plan);
      report.matched = matches.length;

      const suggestion = suggestAnchorUpdate(matches);
      report.anchor_direction = suggestion.direction;
      report.rationale = suggestion.rationale;

      let nextProfile = profile;
      if (suggestion.direction !== 'hold') {
        nextProfile = applyAnchorSuggestion(profile, suggestion);
      }

      // Also override with any detected race PR (much stronger signal).
      const pr = detectRacePR(activities);
      if (Object.keys(pr).length > 0) {
        nextProfile = {
          ...nextProfile,
          recent_race_times: {
            ...(nextProfile.recent_race_times ?? {}),
            ...pr,
          },
        };
        report.race_pr_detected = pr as Record<string, number>;
      }

      if (nextProfile !== profile) {
        await upsertProfile(nextProfile);
      }
    }

    return NextResponse.json({ ok: true, ...report });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 },
    );
  }
}
