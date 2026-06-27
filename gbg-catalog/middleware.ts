import { NextRequest, NextResponse } from 'next/server';

const COOKIE_USERNAME = 'gbg_username';
const COOKIE_CUSTOMER_ID = 'gbg_customer_id';

export function middleware(request: NextRequest) {
  const { searchParams } = request.nextUrl;
  const username = searchParams.get('username');
  const customerId = searchParams.get('customerId');

  if (!username && !customerId) {
    return NextResponse.next();
  }

  const response = NextResponse.next();
  if (username) {
    response.cookies.set(COOKIE_USERNAME, username, { path: '/', sameSite: 'lax' });
  }
  if (customerId) {
    response.cookies.set(COOKIE_CUSTOMER_ID, customerId, { path: '/', sameSite: 'lax' });
  }
  return response;
}

export const config = {
  matcher: ['/((?!_next/static|_next/image|favicon.ico|img/).*)'],
};
