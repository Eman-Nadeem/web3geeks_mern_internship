import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Organization from '@/models/Organization';
import { comparePassword, hashPassword, signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth';

const LoginSchema = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(1, 'Password is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = LoginSchema.parse(body);

    await connectToDatabase();

    // 1. Find user by email
    const user = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (!user) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 2. Verify status
    if (user.status === 'DEACTIVATED') {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Account is deactivated. Please contact support.' },
        { status: 403 }
      );
    }

    // 3. Verify password
    const isPasswordValid = await comparePassword(validatedData.password, user.passwordHash);
    if (!isPasswordValid) {
      return NextResponse.json(
        { error: 'UNAUTHORIZED', message: 'Invalid credentials' },
        { status: 401 }
      );
    }

    // 4. Fetch Organization details if present
    let orgSlug = '';
    if (user.orgId) {
      const org = await Organization.findById(user.orgId);
      if (org) {
        orgSlug = org.slug;
      }
    }

    // 5. Generate tokens
    const tokenPayload = {
      userId: user._id.toString(),
      orgId: user.orgId ? user.orgId.toString() : '',
      email: user.email,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    // Save refresh token hash
    user.refreshTokenHash = await hashPassword(refreshToken);
    await user.save();

    const response = NextResponse.json({
      message: 'Login successful',
      user: {
        id: user._id.toString(),
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        orgId: user.orgId ? user.orgId.toString() : null,
        orgSlug,
      },
      tokens: {
        accessToken,
        refreshToken,
      },
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to authenticate' },
      { status: 500 }
    );
  }
}
