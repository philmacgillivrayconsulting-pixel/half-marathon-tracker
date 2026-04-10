import { NextRequest, NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function POST(req: NextRequest) {
  const { pin } = await req.json();
  const adminPin = process.env.ADMIN_PIN || process.env.NEXT_PUBLIC_ADMIN_PIN || '';

  if (!adminPin) {
    return NextResponse.json({ ok: false, error: 'Admin PIN not configured' }, { status: 500 });
  }

  if (pin === adminPin) {
    return NextResponse.json({ ok: true });
  }

  return NextResponse.json({ ok: false }, { status: 401 });
}

