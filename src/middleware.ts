import { decodeJwt } from 'jose';
import { cookies } from 'next/headers';
import { NextRequest, NextResponse } from 'next/server';

export const middleware = async (request: NextRequest) => {
  if (request.method === 'POST') {
    return NextResponse.next();
  }

  const cookieStore = await cookies();
  const token = cookieStore.get('firebaseAuthToken')?.value;

  const { pathname } = request.nextUrl;
  if (
    !token &&
    (pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password'))
  ) {
    return NextResponse.next();
  }

  if (!token) {
    return NextResponse.redirect(new URL('/', request.url));
  }
  const decodedToken = decodeJwt(token);

  if (decodedToken.exp && (decodedToken.exp - 300) * 1000 < Date.now()) {
    return NextResponse.redirect(
      new URL(
        `/api/refresh-token?redirect=${encodeURIComponent(pathname)}`,
        request.url
      )
    );
  }

  if (
    decodedToken.role === 'ADMIN' &&
    (pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password'))
  ) {
    return NextResponse.redirect(new URL('/admin-dashboard', request.url));
  }

  if (
    decodedToken.role === 'CLIENT' &&
    (pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password'))
  ) {
    return NextResponse.redirect(new URL('/user-dashboard', request.url));
  }
  if (
    token &&
    (pathname.startsWith('/login') ||
      pathname.startsWith('/register') ||
      pathname.startsWith('/forgot-password'))
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (
    decodedToken.role !== 'ADMIN' &&
    pathname.startsWith('/admin-dashboard')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  if (
    decodedToken.role !== 'CLIENT' &&
    pathname.startsWith('/user-dashboard')
  ) {
    return NextResponse.redirect(new URL('/', request.url));
  }

  return NextResponse.next();
};

export const config = {
  matcher: [
    '/admin-dashboard',
    '/admin-dashboard/:path*',
    '/user-dashboard',
    '/user-dashboard/:path*',
    '/login',
    '/register',
    '/forgot-password',
  ],
};
