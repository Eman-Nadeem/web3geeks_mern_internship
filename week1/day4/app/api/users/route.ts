import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'USER_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    await connectToDatabase();

    // Enforce Tenant Data Isolation with withTenant
    const users = await User.find(withTenant({}, user.orgId))
      .select('-passwordHash -refreshTokenHash -resetPasswordToken')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      count: users.length,
      users,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch users' },
      { status: 500 }
    );
  }
}
