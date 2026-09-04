import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Notification from '@/models/Notification';
import { requireAuth } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    await connectToDatabase();

    const query: Record<string, any> = { userId: user.userId };
    const filter = user.orgId ? withTenant(query, user.orgId) : query;

    const notifications = await Notification.find(filter)
      .sort({ createdAt: -1 })
      .limit(50);

    const unreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    return NextResponse.json({
      notifications,
      unreadCount,
      count: notifications.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch notifications' },
      { status: 500 }
    );
  }
}

export async function PATCH(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const body = await req.json().catch(() => ({}));
    const { notificationId, markAllRead } = body;

    await connectToDatabase();

    const baseQuery: Record<string, any> = { userId: user.userId };
    const filter = user.orgId ? withTenant(baseQuery, user.orgId) : baseQuery;

    if (markAllRead) {
      await Notification.updateMany({ ...filter, isRead: false }, { $set: { isRead: true } });
    } else if (notificationId) {
      await Notification.updateOne({ ...filter, _id: notificationId }, { $set: { isRead: true } });
    } else {
      // Default to marking all as read if no ID specified
      await Notification.updateMany({ ...filter, isRead: false }, { $set: { isRead: true } });
    }

    const updatedUnreadCount = await Notification.countDocuments({ ...filter, isRead: false });

    return NextResponse.json({
      success: true,
      unreadCount: updatedUnreadCount,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update notifications' },
      { status: 500 }
    );
  }
}
