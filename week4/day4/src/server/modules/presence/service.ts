import { prisma } from "../../db/prisma";
import { PresenceDTO } from "@/types";

/** Online threshold: < 2 minutes since last heartbeat = online */
const ONLINE_THRESHOLD_MS = 2 * 60 * 1000;

/**
 * Upsert the user's presence session and update User.lastSeenAt.
 * Called on every heartbeat (POST /api/presence/heartbeat).
 */
export async function heartbeat(userId: string): Promise<void> {
  const now = new Date();

  await Promise.all([
    prisma.presenceSession.upsert({
      where: { userId },
      create: { userId, lastHeartAt: now },
      update: { lastHeartAt: now },
    }),
    prisma.user.update({
      where: { id: userId },
      data: { lastSeenAt: now },
    }),
  ]);
}

/**
 * Get presence status for a list of user IDs.
 */
export async function getPresence(userIds: string[]): Promise<PresenceDTO[]> {
  if (userIds.length === 0) return [];

  const sessions = await prisma.presenceSession.findMany({
    where: { userId: { in: userIds } },
    select: { userId: true, lastHeartAt: true },
  });

  const sessionMap = new Map(sessions.map((s) => [s.userId, s.lastHeartAt]));

  // Also fetch lastSeenAt from user for users without an active session
  const users = await prisma.user.findMany({
    where: { id: { in: userIds } },
    select: { id: true, lastSeenAt: true },
  });

  const now = Date.now();

  return users.map((u) => {
    const lastHeartAt = sessionMap.get(u.id);
    const lastSeenAt = lastHeartAt ?? u.lastSeenAt;
    const isOnline = lastHeartAt
      ? now - lastHeartAt.getTime() < ONLINE_THRESHOLD_MS
      : false;

    return {
      userId: u.id,
      isOnline,
      lastSeenAt: lastSeenAt ? lastSeenAt.toISOString() : null,
    };
  });
}

/**
 * Explicitly mark a user offline (called on sign-out).
 */
export async function markOffline(userId: string): Promise<void> {
  await prisma.presenceSession.deleteMany({ where: { userId } });
}
