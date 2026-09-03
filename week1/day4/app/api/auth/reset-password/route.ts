import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword } from '@/lib/auth';

const ResetPasswordSchema = z.object({
  token: z.string().min(1, 'Reset token is required'),
  newPassword: z.string().min(8, 'New password must be at least 8 characters long'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { token, newPassword } = ResetPasswordSchema.parse(body);

    const tokenHash = crypto.createHash('sha256').update(token).digest('hex');

    await connectToDatabase();
    const user = await User.findOne({
      resetPasswordToken: tokenHash,
      resetPasswordExpiresAt: { $gt: new Date() },
    });

    if (!user) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Password reset token is invalid or has expired' },
        { status: 400 }
      );
    }

    // Update password and clear reset fields
    user.passwordHash = await hashPassword(newPassword);
    user.resetPasswordToken = undefined;
    user.resetPasswordExpiresAt = undefined;
    user.refreshTokenHash = undefined; // Invalidate current refresh tokens
    await user.save();

    return NextResponse.json({
      message: 'Password reset successful. You may now log in with your new password.',
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to reset password' },
      { status: 500 }
    );
  }
}
