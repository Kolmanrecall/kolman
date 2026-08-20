import { NextResponse, type NextRequest } from 'next/server';

export function middleware(request: NextRequest) {
  return NextResponse.next({ request });
}

export const config = {
  matcher: ['/dashboard/:path*', '/contacts/:path*', '/cases/:path*', '/import/:path*', '/data/:path*', '/recall/:path*'],
};
