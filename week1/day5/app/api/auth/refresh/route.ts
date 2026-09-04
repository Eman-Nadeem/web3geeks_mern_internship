import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { verifyToken, signAccessToken, signRefreshToken, setAuthCookies, JWTPayload } from '@/lib/auth';

export async function POST(req: Request) {
  try {
    let refreshToken: string | undefined;

    // Try reading refresh token from cookie
    const cookieHeader = req.headers.get('cookie') || '';
    const match = cookieHeader.match(/refresh_token=([^;]+)/);
    if (match) {
      refreshToken = match[1];
    }

    // Try reading refresh token from body
    if (!refreshToken) {
      try {
        const body = await req.json();
        refreshToken = body.refreshToken;
      } catch (e) {
        // Body was empty or not JSON
      }
    }

    if (!refreshToken) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Refresh token is required' },
        { status: 401 }
      );
    }

    const payload = await verifyToken<JWTPayload>(refreshToken);
    if (!payload || !payload.userId) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid or expired refresh token' },
        { status: 401 }
      );
    }

    await connectToDatabase();
    const user = await User.findById(payload.userId);
    if (!user || user.status === 'DEACTIVATED') {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'User account not found or deactivated' },
        { status: 401 }
      );
    }

    const tokenPayload = {
      userId: user._id.toString(),
      orgId: user.orgId ? user.orgId.toString() : '',
      email: user.email,
      role: user.role,
    };

    const newAccessToken = await signAccessToken(tokenPayload);
    const newRefreshToken = await signRefreshToken(tokenPayload);

    const response = NextResponse.json({
      message: 'Tokens refreshed successfully',
      tokens: {
        accessToken: newAccessToken,
        refreshToken: newRefreshToken,
      },
    });

    return setAuthCookies(response, newAccessToken, newRefreshToken);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to refresh token' },
      { status: 500 }
    );
  }
}
