import { NextRequest, NextResponse } from 'next/server';
import { buildAuthUrl, stravaConfigured } from '@/lib/runna/strava';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!stravaConfigured()) {
    return NextResponse.json(
      { error: 'Strava not configured (missing env vars)' },
      { status: 500 },
    );
  }
  const runner_id = req.nextUrl.searchParams.get('runner_id');
  if (!runner_id) {
    return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
  }
  const origin = req.nextUrl.origin;
  const redirect = `${origin}/api/runna/strava/callback`;
  const state = Buffer.from(JSON.stringify({ runner_id })).toString('base64url');
  return NextResponse.redirect(buildAuthUrl(redirect, state));
}
