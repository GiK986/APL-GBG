import { NextRequest, NextResponse } from 'next/server';

const COOKIE_USERNAME = 'gbg_username';

export function middleware(request: NextRequest) {
  const authUserHeader = request.headers.get('x-auth-user');
  const username = authUserHeader
    ? decodeURIComponent(authUserHeader)
    : request.nextUrl.searchParams.get('username');

  if (!username) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  response.cookies.set(COOKIE_USERNAME, username, { path: '/', sameSite: 'lax' });
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|img/).*)'],
};
