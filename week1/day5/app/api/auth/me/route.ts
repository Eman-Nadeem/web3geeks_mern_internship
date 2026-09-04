import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import Organization from '@/models/Organization';
import { requireAuth } from '@/lib/rbac';
import { ROLE_PERMISSIONS } from '@/lib/rbac';

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { userId } = authResult.user;

  try {
    await connectToDatabase();
    const user = await User.findById(userId).select('-passwordHash -refreshTokenHash');

    if (!user) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'User profile not found' },
        { status: 404 }
      );
    }

    let organization = null;
    if (user.orgId) {
      organization = await Organization.findById(user.orgId);
    }

    const permissions = ROLE_PERMISSIONS[user.role] || [];

    return NextResponse.json({
      user: {
        _id: user._id.toString(),
        id: user._id.toString(),
        orgId: user.orgId ? user.orgId.toString() : '',
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        avatarUrl: user.avatarUrl,
        status: user.status,
      },
      organization: organization
        ? {
            id: organization._id.toString(),
            name: organization.name,
            slug: organization.slug,
            plan: organization.plan,
            status: organization.status,
          }
        : null,
      permissions,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch user session profile' },
      { status: 500 }
    );
  }
}
