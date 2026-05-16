import { NextRequest, NextResponse } from 'next/server';
import { signToken } from '@/lib/auth-token';

export async function POST(request: NextRequest) {
  const { password } = await request.json();
  const expected = process.env.SITE_PASSWORD;

  if (!expected || password !== expected) {
    return NextResponse.json({ error: 'Password errata' }, { status: 401 });
  }

  const token = await signToken();

  const response = NextResponse.json({ ok: true });
  response.cookies.set('site_auth', token, {
    httpOnly: true,
    sameSite: 'lax',
    path: '/',
    maxAge: 60 * 60 * 24 * 30, // 30 days
    secure: process.env.NODE_ENV === 'production',
  });
  return response;
}
