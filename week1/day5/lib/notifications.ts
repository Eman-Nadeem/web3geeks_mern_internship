import { Types } from 'mongoose';
import connectDB from './db';
import Notification, { INotification } from '../models/Notification';

export interface CreateNotificationParams {
  orgId: string | Types.ObjectId;
  userId: string | Types.ObjectId;
  title: string;
  message: string;
  type: 'TASK_ASSIGNED' | 'TASK_STATUS_CHANGED' | 'TEAM_ADDED' | 'USER_INVITED';
  linkUrl?: string;
}

/**
 * Creates a notification record stub in the database.
 * Fails gracefully (logs error) to avoid blocking primary business operations.
 */
export async function createNotificationStub(params: CreateNotificationParams): Promise<INotification | null> {
  try {
    await connectDB();
    const notification = await Notification.create({
      orgId: new Types.ObjectId(params.orgId),
      userId: new Types.ObjectId(params.userId),
      title: params.title,
      message: params.message,
      type: params.type,
      linkUrl: params.linkUrl || '',
      isRead: false,
    });
    return notification;
  } catch (error) {
    console.error('Failed to create Notification stub:', error);
    return null;
  }
}
