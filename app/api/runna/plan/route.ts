import { NextRequest, NextResponse } from 'next/server';
import { generatePlan } from '@/lib/runna/plan';
import {
  getActivePlan,
  getProfile,
  saveActivePlan,
} from '@/lib/runna/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const runner_id = req.nextUrl.searchParams.get('runner_id');
  if (!runner_id) {
    return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
  }
  try {
    const plan = await getActivePlan(runner_id);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'load failed' },
      { status: 500 },
    );
  }
}

// Generate a fresh plan from the stored profile and persist it as the
// active plan. Optional `start_date` override in the body.
export async function POST(req: NextRequest) {
  try {
    const body = (await req.json().catch(() => ({}))) as {
      runner_id?: string;
      start_date?: string;
    };
    const runner_id = body.runner_id;
    if (!runner_id) {
      return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
    }
    const profile = await getProfile(runner_id);
    if (!profile) {
      return NextResponse.json({ error: 'profile not found' }, { status: 404 });
    }
    const plan = generatePlan(profile, { start_date: body.start_date });
    await saveActivePlan(plan);
    return NextResponse.json({ plan });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'generate failed' },
      { status: 500 },
    );
  }
}
