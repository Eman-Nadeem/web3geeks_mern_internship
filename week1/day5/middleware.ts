import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import { jwtVerify } from 'jose';

function getJwtSecret() {
  const secret = process.env.JWT_SECRET || 'super-secret-jwt-key-change-in-production-32-chars';
  return new TextEncoder().encode(secret);
}

const PUBLIC_API_PATHS = [
  '/api/health',
  '/api/docs',
  '/api/auth/login',
  '/api/auth/signup',
  '/api/auth/refresh',
  '/api/auth/forgot-password',
  '/api/auth/reset-password',
];

/**
 * Attaches standard CORS headers to responses for local development & cross-origin clients.
 */
function applyCorsHeaders(response: NextResponse, requestOrigin?: string | null): NextResponse {
  const origin = requestOrigin || '*';
  response.headers.set('Access-Control-Allow-Origin', origin);
  response.headers.set('Access-Control-Allow-Methods', 'GET, POST, PUT, PATCH, DELETE, OPTIONS');
  response.headers.set(
    'Access-Control-Allow-Headers',
    'Content-Type, Authorization, X-Requested-With, x-tenant-id, x-user-id, x-user-role, x-user-email'
  );
  response.headers.set('Access-Control-Allow-Credentials', 'true');
  response.headers.set('Access-Control-Max-Age', '86400');
  return response;
}

/**
 * Next.js Edge Middleware for CORS, JWT Authentication & Secure Tenant Context Resolution.
 */
export async function middleware(request: NextRequest) {
  const origin = request.headers.get('origin');
  const pathname = request.nextUrl.pathname;

  // 1. Handle Preflight CORS OPTIONS requests
  if (request.method === 'OPTIONS') {
    const preflightResponse = new NextResponse(null, { status: 204 });
    return applyCorsHeaders(preflightResponse, origin);
  }

  try {
    // 2. Allow non-API assets and public pages
    if (!pathname.startsWith('/api')) {
      return NextResponse.next();
    }

    // 3. Allow public API endpoints to bypass auth checks
    if (PUBLIC_API_PATHS.some((path) => pathname.startsWith(path))) {
      const publicResponse = NextResponse.next();
      return applyCorsHeaders(publicResponse, origin);
    }

    let token: string | undefined;

    // Extract Authorization header token
    const authHeader = request.headers.get('authorization');
    if (authHeader && authHeader.startsWith('Bearer ')) {
      token = authHeader.substring(7);
    }

    // Extract httpOnly access_token cookie
    if (!token) {
      token = request.cookies.get('access_token')?.value;
    }

    // Missing token check
    if (!token) {
      const unauthorizedResponse = NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Authentication required. Please log in.' },
        { status: 401 }
      );
      return applyCorsHeaders(unauthorizedResponse, origin);
    }

    // Verify JWT token signature and expiration
    const { payload } = await jwtVerify(token, getJwtSecret());

    if (payload.tokenType && payload.tokenType !== 'access') {
      const tokenMismatchResponse = NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid token type provided.' },
        { status: 401 }
      );
      return applyCorsHeaders(tokenMismatchResponse, origin);
    }

    const requestHeaders = new Headers(request.headers);

    // Set Tenant Isolation context headers
    if (payload.orgId) requestHeaders.set('x-tenant-id', String(payload.orgId));
    if (payload.userId) requestHeaders.set('x-user-id', String(payload.userId));
    if (payload.role) requestHeaders.set('x-user-role', String(payload.role));
    if (payload.email) requestHeaders.set('x-user-email', String(payload.email));

    const nextResponse = NextResponse.next({
      request: {
        headers: requestHeaders,
      },
    });

    return applyCorsHeaders(nextResponse, origin);
  } catch (error) {
    const errorResponse = NextResponse.json(
      { error: 'UNAUTHORIZED', message: 'Session expired or token verification failed.' },
      { status: 401 }
    );
    return applyCorsHeaders(errorResponse, origin);
  }
}

export const config = {
  matcher: ['/api/:path*'],
};
