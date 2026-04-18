import { NextRequest, NextResponse } from 'next/server';
import { syncPlan } from '@/lib/runna/google-calendar';
import {
  getActivePlan,
  getProfile,
  updatePlan,
} from '@/lib/runna/storage';

export const dynamic = 'force-dynamic';
export const maxDuration = 60;

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runner_id?: string;
      default_time?: string;
      timezone?: string;
    };
    const runner_id = body.runner_id;
    if (!runner_id) {
      return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
    }
    const [profile, plan] = await Promise.all([
      getProfile(runner_id),
      getActivePlan(runner_id),
    ]);
    if (!profile || !plan) {
      return NextResponse.json(
        { error: 'profile or plan missing' },
        { status: 404 },
      );
    }
    const result = await syncPlan(runner_id, plan, profile, {
      default_time: body.default_time,
      timezone: body.timezone,
    });
    // syncPlan mutates plan.weeks[].workouts[].calendar_event_id — persist.
    await updatePlan(plan);
    return NextResponse.json({ ok: true, ...result });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'sync failed' },
      { status: 500 },
    );
  }
}
