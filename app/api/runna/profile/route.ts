import { NextRequest, NextResponse } from 'next/server';
import { getProfile, upsertProfile } from '@/lib/runna/storage';
import type { RunnerProfile } from '@/lib/runna/types';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const runner_id = req.nextUrl.searchParams.get('runner_id');
  if (!runner_id) {
    return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
  }
  try {
    const profile = await getProfile(runner_id);
    return NextResponse.json({ profile });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'load failed' },
      { status: 500 },
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = (await req.json()) as { profile: RunnerProfile };
    if (!body?.profile?.id) {
      return NextResponse.json({ error: 'profile.id required' }, { status: 400 });
    }
    await upsertProfile(body.profile);
    return NextResponse.json({ ok: true });
  } catch (e) {
    return NextResponse.json(
      { error: e instanceof Error ? e.message : 'save failed' },
      { status: 500 },
    );
  }
}
