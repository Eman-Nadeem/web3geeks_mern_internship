import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Organization from '@/models/Organization';
import { requireAuth } from '@/lib/rbac';
import { comparePassword, hashPassword } from '@/lib/auth';

const ProfileUpdateSchema = z.object({
  fullName: z.string().min(2, 'Full name must be at least 2 characters').optional(),
  avatarUrl: z.string().optional(),
  currentPassword: z.string().optional(),
  newPassword: z.string().min(6, 'New password must be at least 6 characters').optional(),
});

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    await connectToDatabase();
    const dbUser = await User.findById(user.userId).select('-passwordHash -refreshTokenHash -resetPasswordToken');
    if (!dbUser) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User profile not found' }, { status: 404 });
    }

    let organization = null;
    if (dbUser.orgId) {
      organization = await Organization.findById(dbUser.orgId).select('name slug plan status logoUrl ownerId');
    } else if (dbUser.role === 'SuperAdmin') {
      organization = await Organization.findOne().select('name slug plan status logoUrl ownerId');
    }

    return NextResponse.json({
      user: dbUser,
      organization,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch user profile' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const body = await req.json();
    const validatedData = ProfileUpdateSchema.parse(body);

    await connectToDatabase();
    const dbUser = await User.findById(user.userId);
    if (!dbUser) {
      return NextResponse.json({ error: 'NOT_FOUND', message: 'User not found' }, { status: 404 });
    }

    const updates: Record<string, any> = {};

    if (validatedData.fullName) {
      updates.fullName = validatedData.fullName.trim();
    }
    if (validatedData.avatarUrl !== undefined) {
      updates.avatarUrl = validatedData.avatarUrl.trim();
    }

    // Password change
    if (validatedData.newPassword) {
      if (!validatedData.currentPassword) {
        return NextResponse.json(
          { error: 'MISSING_PASSWORD', message: 'Current password is required to set a new password' },
          { status: 400 }
        );
      }

      const isValid = await comparePassword(validatedData.currentPassword, dbUser.passwordHash);
      if (!isValid) {
        return NextResponse.json(
          { error: 'INVALID_PASSWORD', message: 'Current password is incorrect' },
          { status: 400 }
        );
      }

      updates.passwordHash = await hashPassword(validatedData.newPassword);
    }

    const updatedUser = await User.findByIdAndUpdate(
      user.userId,
      { $set: updates },
      { new: true }
    ).select('-passwordHash -refreshTokenHash -resetPasswordToken');

    return NextResponse.json({
      message: 'Profile updated successfully',
      user: updatedUser,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update profile' },
      { status: 500 }
    );
  }
}
