import { NextResponse } from 'next/server';
import { z } from 'zod';
import crypto from 'crypto';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';

const ForgotPasswordSchema = z.object({
  email: z.string().email('Invalid email address'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email } = ForgotPasswordSchema.parse(body);

    await connectToDatabase();
    const user = await User.findOne({ email: email.toLowerCase() });

    // For security, always return success message even if email doesn't exist
    if (!user) {
      return NextResponse.json({
        message: 'If an account exists with that email, a password reset link has been issued.',
      });
    }

    // Generate random 32-byte hex token
    const resetToken = crypto.randomBytes(32).toString('hex');
    const resetTokenHash = crypto.createHash('sha256').update(resetToken).digest('hex');

    user.resetPasswordToken = resetTokenHash;
    user.resetPasswordExpiresAt = new Date(Date.now() + 60 * 60 * 1000); // 1 hour expiry
    await user.save();

    // Dev mode email simulation logging
    console.log('\n==================================================');
    console.log('📧 [SIMULATED EMAIL SERVICE] PASSWORD RESET LINK');
    console.log(`To: ${user.email}`);
    console.log(`Reset Token: ${resetToken}`);
    console.log(`Reset URL: http://localhost:3000/reset-password?token=${resetToken}`);
    console.log('==================================================\n');

    return NextResponse.json({
      message: 'If an account exists with that email, a password reset link has been issued.',
      devToken: process.env.NODE_ENV !== 'production' ? resetToken : undefined,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to process request' },
      { status: 500 }
    );
  }
}
