import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

const JWT_SECRET = new TextEncoder().encode(
  process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-32-chars'
);

const PUBLIC_API_PATHS = [
  '/api/health',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

/**
 * Next.js Edge Middleware for JWT Authentication & Secure Tenant Context Resolution.
 * Extracts JWT token from httpOnly cookie or Authorization header, verifies signature,
 * and sets immutable tenant context (`x-tenant-id`, `x-user-id`, `x-user-role`) for downstream handlers.
 */
export async function middleware(request: NextRequest) {
  const pathname = request.nextUrl.pathname;

  // Allow public API endpoints to bypass auth checks
  if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
    return NextResponse.next();
  }

  // Allow non-API assets and public pages
  if (!pathname.startsWith('/api') && !pathname.startsWith('/(dashboard)')) {
    return NextResponse.next();
  }

  let token: string | undefined;

  // 1. Try Authorization header
  const authHeader = request.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Try httpOnly access_token cookie
  if (!token) {
    token = request.cookies.get('access_token')?.value;
  }

  // If missing token on protected API route, return 401 Unauthorized
  if (!token) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }

  try {
    // Verify JWT token signature and expiration
    const { payload } = await jwtVerify(token, JWT_SECRET);

    // Prevent token type mismatch (e.g. using a refresh token as an access token)
    if (payload.tokenType && payload.tokenType !== 'access') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid token type provided.' },
        { status: 401 }
      );
    }

    const requestHeaders = new Headers(request.headers);

    // Secure Tenant Isolation: MUST set orgId from verified token payload (NEVER trust client input)
    if (payload.orgId) {
      requestHeaders.set('x-tenant-id', String(payload.orgId));
    }
    if (payload.userId) {
      requestHeaders.set('x-user-id', String(payload.userId));
    }
    if (payload.role) {
      requestHeaders.set('x-user-role', String(payload.role));
    }
    if (payload.email) {
      requestHeaders.set('x-user-email', String(payload.email));
    }

    return NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });
  } catch (error) {
    if (pathname.startsWith('/api/')) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Session expired or token verification failed.' },
        { status: 401 }
      );
    }
    return NextResponse.redirect(new URL('/login', request.url));
  }
}

export const config = {
  matcher: ['/api/:path*', '/(dashboard)/:path*'],
};
