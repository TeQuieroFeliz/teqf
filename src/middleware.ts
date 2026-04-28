import { NextRequest, NextResponse } from 'next/server';

const COOKIE = 'site_auth';
const SKIP = ['/login', '/api/site-auth'];

export function middleware(request: NextRequest) {
  const { pathname } = request.nextUrl;

  if (SKIP.some(p => pathname.startsWith(p))) {
    return NextResponse.next();
  }

  const password = process.env.SITE_PASSWORD;
  if (!password) return NextResponse.next();

  if (request.cookies.get(COOKIE)?.value === password) {
    return NextResponse.next();
  }

  const url = request.nextUrl.clone();
  url.pathname = '/login';
  url.searchParams.set('from', pathname);
  return NextResponse.redirect(url);
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon\\.ico|.*\\.png|.*\\.svg|.*\\.jpg|.*\\.webp).*)'],
};
