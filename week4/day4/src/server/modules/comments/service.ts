import { prisma } from "../../db/prisma";
import { AppError } from "../../http/AppError";
import { Role } from "@/types";
import { triggerEvent, Channels } from "../../lib/pusher";
import { logActivity } from "../activity/service";
import { createNotification } from "../notifications/service";
import { CreateCommentInput, UpdateCommentInput, ListCommentsQuery } from "./schemas";
import { CommentDTO } from "@/types";

/** Select shape reused across queries */
const commentSelect = {
  id: true,
  taskId: true,
  body: true,
  status: true,
  editedAt: true,
  createdAt: true,
  updatedAt: true,
  author: {
    select: { id: true, name: true, email: true, avatar: true },
  },
} as const;

export async function createComment(
  taskId: string,
  projectId: string,
  organizationId: string,
  actorId: string,
  input: CreateCommentInput
): Promise<CommentDTO> {
  // Verify the task exists and belongs to the project
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: {
      id: true,
      title: true,
      assigneeId: true,
      createdById: true,
    },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const comment = await prisma.comment.create({
    data: {
      taskId,
      authorId: actorId,
      body: input.body,
    },
    select: commentSelect,
  });

  // Fire-and-forget: activity log + real-time + notification
  void Promise.allSettled([
    logActivity({
      organizationId,
      projectId,
      taskId,
      actorId,
      type: "TASK_COMMENT_ADDED",
      meta: { taskTitle: task.title, commentId: comment.id },
    }),
    triggerEvent(
      Channels.project(projectId),
      "task:comment.created",
      { taskId, comment: mapComment(comment) }
    ),
    // Notify task assignee & creator (but not the commenter themselves)
    notifyTaskParticipants(task, actorId, organizationId, projectId, taskId, comment.id, "TASK_COMMENT"),
  ]);

  return mapComment(comment);
}

async function notifyTaskParticipants(
  task: { id: string; title: string; assigneeId: string | null; createdById: string },
  actorId: string,
  organizationId: string,
  projectId: string,
  taskId: string,
  _commentId: string,
  type: "TASK_COMMENT"
) {
  const recipientIds = new Set<string>();
  if (task.assigneeId && task.assigneeId !== actorId) recipientIds.add(task.assigneeId);
  if (task.createdById !== actorId) recipientIds.add(task.createdById);

  for (const userId of recipientIds) {
    await createNotification({
      userId,
      type,
      title: "New comment on task",
      body: `Someone commented on "${task.title}"`,
      link: `/dashboard/${organizationId}/projects/${projectId}/tasks/${taskId}`,
      meta: { taskId, taskTitle: task.title },
    });
  }
}

export async function listComments(
  taskId: string,
  projectId: string,
  query: ListCommentsQuery
): Promise<{ comments: CommentDTO[]; nextCursor: string | null }> {
  // Verify the task belongs to the project
  const task = await prisma.task.findFirst({
    where: { id: taskId, projectId },
    select: { id: true },
  });

  if (!task) {
    throw new AppError(404, "Task not found");
  }

  const limit = query.limit;

  const comments = await prisma.comment.findMany({
    where: {
      taskId,
      status: "ACTIVE",
      ...(query.cursor ? { id: { lt: query.cursor } } : {}),
    },
    select: commentSelect,
    orderBy: { createdAt: "asc" },
    take: limit + 1, // fetch one extra to detect next page
  });

  let nextCursor: string | null = null;
  if (comments.length > limit) {
    const last = comments.pop()!;
    nextCursor = last.id;
  }

  return { comments: comments.map(mapComment), nextCursor };
}

export async function updateComment(
  commentId: string,
  actorId: string,
  input: UpdateCommentInput
): Promise<CommentDTO> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: { id: true, authorId: true, status: true, taskId: true },
  });

  if (!comment || comment.status === "DELETED") {
    throw new AppError(404, "Comment not found");
  }

  if (comment.authorId !== actorId) {
    throw new AppError(403, "Only the author can edit this comment");
  }

  const updated = await prisma.comment.update({
    where: { id: commentId },
    data: { body: input.body, editedAt: new Date() },
    select: commentSelect,
  });

  void triggerEvent(
    Channels.project(await getProjectIdForTask(comment.taskId)),
    "task:comment.updated",
    { taskId: comment.taskId, comment: mapComment(updated) }
  );

  return mapComment(updated);
}

export async function deleteComment(
  commentId: string,
  actorId: string,
  actorRole: Role
): Promise<{ success: boolean }> {
  const comment = await prisma.comment.findUnique({
    where: { id: commentId },
    select: {
      id: true,
      authorId: true,
      status: true,
      taskId: true,
      task: { select: { projectId: true } },
    },
  });

  if (!comment || comment.status === "DELETED") {
    throw new AppError(404, "Comment not found");
  }

  const isAuthor = comment.authorId === actorId;
  const isAdmin = actorRole === "OWNER" || actorRole === "ADMIN";

  if (!isAuthor && !isAdmin) {
    throw new AppError(403, "You do not have permission to delete this comment");
  }

  // Soft-delete to preserve activity log integrity
  await prisma.comment.update({
    where: { id: commentId },
    data: { status: "DELETED", body: "[deleted]" },
  });

  void triggerEvent(
    Channels.project(comment.task.projectId),
    "task:comment.deleted",
    { taskId: comment.taskId, commentId }
  );

  return { success: true };
}

// ─── Helpers ─────────────────────────────────────────────────────────────────

async function getProjectIdForTask(taskId: string): Promise<string> {
  const task = await prisma.task.findUnique({
    where: { id: taskId },
    select: { projectId: true },
  });
  return task?.projectId ?? "";
}

function mapComment(c: {
  id: string;
  taskId: string;
  body: string;
  status: string;
  editedAt: Date | null;
  createdAt: Date;
  updatedAt: Date;
  author: { id: string; name: string; email: string; avatar: string | null };
}): CommentDTO {
  return {
    id: c.id,
    taskId: c.taskId,
    body: c.body,
    status: c.status as "ACTIVE" | "DELETED",
    editedAt: c.editedAt ? c.editedAt.toISOString() : null,
    createdAt: c.createdAt.toISOString(),
    updatedAt: c.updatedAt.toISOString(),
    author: c.author,
  };
}
