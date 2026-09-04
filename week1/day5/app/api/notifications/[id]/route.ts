import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const query: Record<string, any> = { _id: id, userId: user.userId };
    const filter = user.orgId ? withTenant(query, user.orgId) : query;

    const notification = await Notification.findOneAndUpdate(
      filter,
      { $set: { isRead: true } },
      { new: true }
    );

    if (!notification) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Notification not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({
      message: 'Notification marked as read',
      notification,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update notification' },
      { status: 500 }
    );
  }
}
