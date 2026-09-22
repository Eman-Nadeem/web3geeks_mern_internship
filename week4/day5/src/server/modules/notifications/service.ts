import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { logger } from "../../lib/logger";
import { triggerEvent, Channels } from "../../lib/pusher";
import { NotificationDTO, NotificationType } from "@/types";

export interface CreateNotificationInput {
  userId: string;
  type: NotificationType;
  title: string;
  body: string;
  link?: string;
  meta?: Record<string, unknown>;
}

/**
 * Internal — create a notification and push it to the user's private channel.
 * Never throws; silently logs on error.
 */
export async function createNotification(input: CreateNotificationInput): Promise<void> {
  try {
    const notification = await prisma.notification.create({
      data: {
        userId: input.userId,
        type: input.type,
        title: input.title,
        body: input.body,
        link: input.link ?? null,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    });

    // Real-time push to the user's private channel
    void triggerEvent(
      Channels.user(input.userId),
      "user:notification",
      mapNotification(notification)
    );
  } catch (err) {
    logger.error({ err }, "[Notifications] createNotification failed");
  }
}

export interface ListNotificationsQuery {
  page?: number;
  limit?: number;
  unreadOnly?: boolean;
}

export async function listNotifications(
  userId: string,
  query: ListNotificationsQuery
): Promise<{
  notifications: NotificationDTO[];
  total: number;
  unreadCount: number;
  page: number;
  limit: number;
  totalPages: number;
}> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 20, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { userId };
  if (query.unreadOnly) where.isRead = false;

  const [total, unreadCount, rows] = await Promise.all([
    prisma.notification.count({ where }),
    prisma.notification.count({ where: { userId, isRead: false } }),
    prisma.notification.findMany({
      where,
      orderBy: [{ isRead: "asc" }, { createdAt: "desc" }],
      skip,
      take: limit,
    }),
  ]);

  return {
    notifications: rows.map(mapNotification),
    total,
    unreadCount,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getUnreadCount(userId: string): Promise<number> {
  return prisma.notification.count({ where: { userId, isRead: false } });
}

export async function markRead(ids: string[], userId: string): Promise<void> {
  if (ids.length === 0) return;
  await prisma.notification.updateMany({
    where: { id: { in: ids }, userId },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function markAllRead(userId: string): Promise<void> {
  await prisma.notification.updateMany({
    where: { userId, isRead: false },
    data: { isRead: true, readAt: new Date() },
  });
}

export async function deleteNotification(
  notificationId: string,
  userId: string
): Promise<void> {
  const n = await prisma.notification.findUnique({
    where: { id: notificationId },
    select: { userId: true },
  });

  if (!n || n.userId !== userId) {
    throw new AppError(404, "Notification not found");
  }

  await prisma.notification.delete({ where: { id: notificationId } });
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapNotification(n: any): NotificationDTO {
  return {
    id: n.id,
    userId: n.userId,
    type: n.type,
    title: n.title,
    body: n.body,
    link: n.link ?? null,
    isRead: n.isRead,
    readAt: n.readAt ? n.readAt.toISOString() : null,
    meta: n.meta,
    createdAt: n.createdAt.toISOString(),
  };
}
