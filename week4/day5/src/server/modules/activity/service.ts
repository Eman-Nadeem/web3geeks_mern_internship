import { Prisma } from "@prisma/client";
import { prisma } from "../../db/prisma";
import { logger } from "../../lib/logger";
import { ActivityDTO } from "@/types";

export interface LogActivityInput {
  organizationId: string;
  projectId?: string;
  taskId?: string;
  actorId: string;
  type:
    | "TASK_CREATED"
    | "TASK_UPDATED"
    | "TASK_DELETED"
    | "TASK_STATUS_CHANGED"
    | "TASK_ASSIGNED"
    | "TASK_COMMENT_ADDED"
    | "TASK_COMMENT_DELETED"
    | "PROJECT_CREATED"
    | "PROJECT_UPDATED"
    | "PROJECT_DELETED"
    | "MEMBER_ADDED"
    | "MEMBER_REMOVED"
    | "MEMBER_ROLE_CHANGED";
  meta?: Record<string, unknown>;
}

/**
 * Append-only activity log entry.
 * Never throws — a failed log should never fail the API.
 */
export async function logActivity(input: LogActivityInput): Promise<void> {
  try {
    await prisma.activity.create({
      data: {
        organizationId: input.organizationId,
        projectId: input.projectId ?? null,
        taskId: input.taskId ?? null,
        actorId: input.actorId,
        type: input.type,
        meta: (input.meta ?? {}) as Prisma.InputJsonValue,
      },
    });
  } catch (err) {
    logger.error({ err }, "[Activity] logActivity failed");
  }
}

export interface ActivityQuery {
  page?: number;
  limit?: number;
  type?: string;
}

const ACTOR_SELECT = {
  select: { id: true, name: true, email: true, avatar: true },
} as const;

export async function getProjectActivity(
  projectId: string,
  query: ActivityQuery
): Promise<{ activities: ActivityDTO[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 25, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { projectId };
  if (query.type) where.type = query.type;

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      include: { actor: ACTOR_SELECT },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    activities: rows.map(mapActivity),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

export async function getOrgActivity(
  organizationId: string,
  query: ActivityQuery
): Promise<{ activities: ActivityDTO[]; total: number; page: number; limit: number; totalPages: number }> {
  const page = query.page || 1;
  const limit = Math.min(query.limit || 25, 100);
  const skip = (page - 1) * limit;

  const where: Record<string, unknown> = { organizationId };
  if (query.type) where.type = query.type;

  const [total, rows] = await Promise.all([
    prisma.activity.count({ where }),
    prisma.activity.findMany({
      where,
      include: { actor: ACTOR_SELECT },
      orderBy: { createdAt: "desc" },
      skip,
      take: limit,
    }),
  ]);

  return {
    activities: rows.map(mapActivity),
    total,
    page,
    limit,
    totalPages: Math.ceil(total / limit) || 1,
  };
}

// eslint-disable-next-line @typescript-eslint/no-explicit-any
function mapActivity(a: any): ActivityDTO {
  return {
    id: a.id,
    organizationId: a.organizationId,
    projectId: a.projectId,
    taskId: a.taskId,
    actorId: a.actorId,
    type: a.type,
    meta: a.meta,
    createdAt: a.createdAt.toISOString(),
    actor: a.actor,
  };
}
