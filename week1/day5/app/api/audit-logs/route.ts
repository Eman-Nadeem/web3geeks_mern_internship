import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { requireAuth } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  if (user.role !== 'SuperAdmin' && user.role !== 'OrgAdmin') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'You do not have permission to view audit logs' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();

    const filter = user.role === 'SuperAdmin' ? {} : withTenant({}, user.orgId);

    const logs = await AuditLog.find(filter)
      .populate('actorId', 'fullName email role')
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json({
      logs,
      count: logs.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch audit logs' },
      { status: 500 }
    );
  }
}
