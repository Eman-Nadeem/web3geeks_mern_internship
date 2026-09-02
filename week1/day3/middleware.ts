import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

/**
 * Next.js Edge Middleware stub for tenant context resolution & RBAC route guarding.
 * Extracts `x-org-id` and session tokens from headers/cookies and injects context into route handlers.
 */
export function middleware(request: NextRequest) {
  const response = NextResponse.next();

  // Extract orgId from custom request header or cookie
  const orgIdHeader = request.headers.get('x-org-id');
  const sessionCookie = request.cookies.get('session')?.value;

  if (orgIdHeader) {
    response.headers.set('x-tenant-id', orgIdHeader);
  }

  // Allow health check and public endpoints to proceed freely
  if (request.nextUrl.pathname.startsWith('/api/health')) {
    return response;
  }

  return response;
}

export const config = {
  matcher: ['/api/:path*', '/(dashboard)/:path*'],
};
