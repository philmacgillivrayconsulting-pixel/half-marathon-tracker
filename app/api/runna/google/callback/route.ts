import { NextRequest, NextResponse } from 'next/server';
import { exchangeCode } from '@/lib/runna/google-calendar';
import { saveIntegration } from '@/lib/runna/storage';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest) {
  const code = req.nextUrl.searchParams.get('code');
  const state = req.nextUrl.searchParams.get('state');
  const err = req.nextUrl.searchParams.get('error');
  if (err) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/training/integrations?google_error=${encodeURIComponent(err)}`,
    );
  }
  if (!code || !state) {
    return NextResponse.json({ error: 'missing code or state' }, { status: 400 });
  }

  let runner_id = '';
  try {
    const decoded = JSON.parse(
      Buffer.from(state, 'base64url').toString('utf8'),
    ) as { runner_id: string };
    runner_id = decoded.runner_id;
  } catch {
    return NextResponse.json({ error: 'invalid state' }, { status: 400 });
  }

  try {
    const redirect = `${req.nextUrl.origin}/api/runna/google/callback`;
    const tokens = await exchangeCode(code, redirect);
    await saveIntegration(runner_id, 'google', tokens);
    return NextResponse.redirect(
      `${req.nextUrl.origin}/training/integrations?google=connected`,
    );
  } catch (e) {
    return NextResponse.redirect(
      `${req.nextUrl.origin}/training/integrations?google_error=${encodeURIComponent(
        e instanceof Error ? e.message : 'unknown',
      )}`,
    );
  }
}
