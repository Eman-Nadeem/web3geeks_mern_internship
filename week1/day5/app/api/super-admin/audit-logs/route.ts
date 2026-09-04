import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import AuditLog from '@/models/AuditLog';
import { requireAuth } from '@/lib/rbac';

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  if (user.role !== 'SuperAdmin') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Platform audit log access requires SuperAdmin role' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();

    const auditLogs = await AuditLog.find({})
      .populate('actorId', 'fullName email role')
      .populate('orgId', 'name slug')
      .sort({ timestamp: -1 })
      .limit(100);

    return NextResponse.json({
      count: auditLogs.length,
      auditLogs,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch platform audit logs' },
      { status: 500 }
    );
  }
}
