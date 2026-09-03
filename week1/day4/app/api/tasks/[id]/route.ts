import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';
import { createNotificationStub } from '@/lib/notifications';

const UpdateTaskSchema = z.object({
  title: z.string().min(2, 'Task title must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED']).optional(),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).optional(),
  assigneeId: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

// Allowed status transition state machine
const ALLOWED_STATUS_TRANSITIONS: Record<string, string[]> = {
  TO_DO: ['IN_PROGRESS'],
  IN_PROGRESS: ['UNDER_REVIEW', 'COMPLETED', 'TO_DO'],
  UNDER_REVIEW: ['COMPLETED', 'IN_PROGRESS'],
  COMPLETED: ['IN_PROGRESS', 'TO_DO'],
};

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TASK_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const task = await Task.findOne(withTenant({ _id: id }, user.orgId))
      .populate('projectId', 'name status')
      .populate('assigneeId', 'name email role')
      .populate('reporterId', 'name email role');

    if (!task) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ task });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch task' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TASK_UPDATE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = UpdateTaskSchema.parse(body);

    await connectToDatabase();

    const existingTask = await Task.findOne(withTenant({ _id: id }, user.orgId));
    if (!existingTask) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      );
    }

    // Business Rule 1: TeamMembers can only update tasks assigned to them
    if (user.role === 'TeamMember') {
      const isAssignedToUser = existingTask.assigneeId?.toString() === user.userId;
      if (!isAssignedToUser) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Team members can only update tasks assigned directly to them',
          },
          { status: 403 }
        );
      }

      // Business Rule 2: TeamMembers cannot reassign tasks to someone else
      if (
        validatedData.assigneeId !== undefined &&
        validatedData.assigneeId !== existingTask.assigneeId?.toString()
      ) {
        return NextResponse.json(
          {
            error: 'FORBIDDEN',
            message: 'Only Project Managers, Org Admins, or Super Admins can reassign tasks',
          },
          { status: 403 }
        );
      }
    }

    // Business Rule 3: Validate Assignee belongs to same tenant org if changed
    if (validatedData.assigneeId) {
      const targetAssignee = await User.findOne(
        withTenant({ _id: validatedData.assigneeId }, user.orgId)
      );
      if (!targetAssignee) {
        return NextResponse.json(
          { error: 'INVALID_ASSIGNEE', message: 'Assignee user must belong to your organization' },
          { status: 400 }
        );
      }
    }

    // Business Rule 4: Status Transition Logic Enforcement
    if (validatedData.status && validatedData.status !== existingTask.status) {
      const allowedNext = ALLOWED_STATUS_TRANSITIONS[existingTask.status] || [];
      if (!allowedNext.includes(validatedData.status)) {
        return NextResponse.json(
          {
            error: 'INVALID_STATUS_TRANSITION',
            message: `Status transition from ${existingTask.status} to ${validatedData.status} is not permitted. Allowed next statuses: ${allowedNext.join(', ')}`,
            currentStatus: existingTask.status,
            attemptedStatus: validatedData.status,
            allowedTransitions: allowedNext,
          },
          { status: 400 }
        );
      }
    }

    const updatePayload: Record<string, any> = { ...validatedData };
    if (validatedData.dueDate !== undefined) {
      updatePayload.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }

    const updatedTask = await Task.findOneAndUpdate(
      withTenant({ _id: id }, user.orgId),
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    // Audit Log & Notification triggers
    const oldAssignee = existingTask.assigneeId?.toString();
    const newAssignee = validatedData.assigneeId;

    if (newAssignee !== undefined && newAssignee !== oldAssignee) {
      await createAuditLog({
        orgId: user.orgId,
        actorId: user.userId,
        action: 'TASK_REASSIGNED',
        entityType: 'Task',
        entityId: id,
        details: { oldAssigneeId: oldAssignee, newAssigneeId: newAssignee },
      });

      if (newAssignee) {
        await createNotificationStub({
          orgId: user.orgId,
          userId: newAssignee,
          title: 'Task Reassigned',
          message: `Task "${existingTask.title}" has been assigned to you`,
          type: 'TASK_ASSIGNED',
          linkUrl: `/tasks/${id}`,
        });
      }
    } else if (validatedData.status && validatedData.status !== existingTask.status) {
      await createAuditLog({
        orgId: user.orgId,
        actorId: user.userId,
        action: 'TASK_STATUS_CHANGED',
        entityType: 'Task',
        entityId: id,
        details: { oldStatus: existingTask.status, newStatus: validatedData.status },
      });

      if (existingTask.assigneeId) {
        await createNotificationStub({
          orgId: user.orgId,
          userId: existingTask.assigneeId.toString(),
          title: 'Task Status Updated',
          message: `Task "${existingTask.title}" status changed to ${validatedData.status}`,
          type: 'TASK_STATUS_CHANGED',
          linkUrl: `/tasks/${id}`,
        });
      }
    } else {
      await createAuditLog({
        orgId: user.orgId,
        actorId: user.userId,
        action: 'TASK_UPDATED',
        entityType: 'Task',
        entityId: id,
        details: { updatedFields: Object.keys(validatedData) },
      });
    }

    return NextResponse.json({
      message: 'Task updated successfully',
      task: updatedTask,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update task' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TASK_DELETE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const task = await Task.findOne(withTenant({ _id: id }, user.orgId));
    if (!task) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Task not found' },
        { status: 404 }
      );
    }

    await Task.deleteOne(withTenant({ _id: id }, user.orgId));

    // Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TASK_DELETED',
      entityType: 'Task',
      entityId: id,
      details: { title: task.title },
    });

    return NextResponse.json({
      message: 'Task deleted successfully',
      deletedTaskId: id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to delete task' },
      { status: 500 }
    );
  }
}
