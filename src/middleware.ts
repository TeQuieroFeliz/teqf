import { NextRequest, NextResponse } from 'next/server';
import { verifyToken } from '@/lib/auth-token';

const COOKIE = 'site_auth';
const SKIP = ['/accesso', '/api/site-auth', '/login', '/register', '/forgot-password'];

export async function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  // If SITE_PASSWORD is not configured, the site is public.
  if (!process.env.SITE_PASSWORD) return NextResponse.next();

  const token = request.cookies.get(COOKIE)?.value;
  if (token && await verifyToken(token)) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/accesso';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)'],
};
