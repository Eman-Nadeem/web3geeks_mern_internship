import { SignJWT, jwtVerify } from 'jose';
import bcrypt from 'bcryptjs';
import { cookies } from 'next/headers';
import { NextResponse } from 'next/server';

const getJwtSecret = () => {
  const secret = process.env.JWT_SECRET;
  if (!secret) {
    if (process.env.NODE_ENV === 'production') {
      throw new Error('JWT_SECRET environment variable is missing in production!');
    }
    return 'super-secret-jwt-key-change-in-production-32-chars';
  }
  return secret;
};

const JWT_SECRET = new TextEncoder().encode(getJwtSecret());

export interface JWTPayload {
  userId: string;
  orgId: string;
  email: string;
  role: 'SuperAdmin' | 'OrgAdmin' | 'ProjectManager' | 'TeamMember';
  [key: string]: any;
}

/**
 * Signs a short-lived access token (default: 15m)
 */
export async function signAccessToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ ...payload, tokenType: 'access' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('15m')
    .sign(JWT_SECRET);
}

/**
 * Signs a long-lived refresh token (default: 7d)
 */
export async function signRefreshToken(payload: JWTPayload): Promise<string> {
  return new SignJWT({ userId: payload.userId, orgId: payload.orgId, tokenType: 'refresh' })
    .setProtectedHeader({ alg: 'HS256' })
    .setIssuedAt()
    .setExpirationTime('7d')
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token (works in Node.js and Next.js Edge Middleware)
 */
export async function verifyToken<T = JWTPayload>(token: string): Promise<T | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET);
    return payload as unknown as T;
  } catch (error) {
    return null;
  }
}

/**
 * Hashes a raw password using bcrypt
 */
export async function hashPassword(password: string): Promise<string> {
  return bcrypt.hash(password, 10);
}

/**
 * Verifies a plain text password against a stored hash
 */
export async function comparePassword(password: string, hash: string): Promise<boolean> {
  return bcrypt.compare(password, hash);
}

/**
 * Sets secure HTTP-only cookies on a NextResponse object
 */
export function setAuthCookies(
  response: NextResponse,
  accessToken: string,
  refreshToken: string
): NextResponse {
  const isProd = process.env.NODE_ENV === 'production';

  response.cookies.set('access_token', accessToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 15 * 60, // 15 minutes
  });

  response.cookies.set('refresh_token', refreshToken, {
    httpOnly: true,
    secure: isProd,
    sameSite: 'lax',
    path: '/',
    maxAge: 7 * 24 * 60 * 60, // 7 days
  });

  return response;
}

/**
 * Clears authentication cookies
 */
export function clearAuthCookies(response: NextResponse): NextResponse {
  response.cookies.set('access_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  response.cookies.set('refresh_token', '', {
    httpOnly: true,
    expires: new Date(0),
    path: '/',
  });

  return response;
}

/**
 * Extracts and verifies auth session from request cookies or Authorization header
 */
export async function getAuthSession(req: Request): Promise<JWTPayload | null> {
  let token: string | undefined;

  // 1. Try Authorization header
  const authHeader = req.headers.get('authorization');
  if (authHeader && authHeader.startsWith('Bearer ')) {
    token = authHeader.substring(7);
  }

  // 2. Try Cookies
  if (!token) {
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/access_token=([^;]+)/);
    if (match) {
      token = match[1];
    }
  }

  if (!token) return null;
  return verifyToken<JWTPayload>(token);
}
