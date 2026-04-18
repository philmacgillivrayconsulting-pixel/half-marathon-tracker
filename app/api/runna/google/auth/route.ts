import { NextRequest, NextResponse } from 'next/server';
import {
  buildAuthUrl,
  googleConfigured,
} from '@/lib/runna/google-calendar';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  if (!googleConfigured()) {
    return NextResponse.json(
      { error: 'Google Calendar not configured (missing env vars)' },
      { status: 500 },
    );
  }
  const runner_id = req.nextUrl.searchParams.get('runner_id');
  if (!runner_id) {
    return NextResponse.json({ error: 'runner_id required' }, { status: 400 });
  }
  const origin = req.nextUrl.origin;
  const redirect = `${origin}/api/runna/google/callback`;
  // State carries the runner_id so the callback knows whose tokens these are.
  const state = Buffer.from(JSON.stringify({ runner_id })).toString('base64url');
  const url = buildAuthUrl(redirect, state);
  return NextResponse.redirect(url);
}
