import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
import Project from '@/models/Project';
import Team from '@/models/Team';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';
import { createNotificationStub } from '@/lib/notifications';

const CreateTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW', 'COMPLETED']).default('TO_DO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'TASK_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const priority = searchParams.get('priority');
    const projectId = searchParams.get('projectId');
    const assigneeId = searchParams.get('assigneeId');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const filter: Record<string, any> = {};
    if (status) filter.status = status;
    if (priority) filter.priority = priority;
    if (projectId) filter.projectId = projectId;
    if (assigneeId) filter.assigneeId = assigneeId;
    if (search) {
      filter.$or = [
        { title: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tenantFilter = user.role === 'SuperAdmin' ? filter : withTenant(filter, user.orgId);

    const [tasks, total] = await Promise.all([
      Task.find(tenantFilter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('projectId', 'name status')
        .populate('assigneeId', 'fullName email role')
        .populate('reporterId', 'fullName email role'),
      Task.countDocuments(tenantFilter),
    ]);

    return NextResponse.json({
      tasks,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch tasks' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authResult = await requirePermission(req, 'TASK_CREATE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const body = await req.json();
    const validatedData = CreateTaskSchema.parse(body);

    await connectToDatabase();

    // Business Rule Validation 1: Verify Project belongs to same organization
    const project = await Project.findOne(withTenant({ _id: validatedData.projectId }, user.orgId));
    if (!project) {
      return NextResponse.json(
        { error: 'INVALID_PROJECT', message: 'Project not found in your organization' },
        { status: 400 }
      );
    }

    // Business Rule Validation 2: Verify Assignee belongs to same organization & team if project has team
    if (validatedData.assigneeId) {
      const assignee = await User.findOne(withTenant({ _id: validatedData.assigneeId }, user.orgId));
      if (!assignee) {
        return NextResponse.json(
          { error: 'INVALID_ASSIGNEE', message: 'Assignee user must belong to your organization' },
          { status: 400 }
        );
      }

      if (project.teamId) {
        const team = await Team.findOne(withTenant({ _id: project.teamId }, user.orgId));
        if (team) {
          const isLeader = team.leaderId?.toString() === validatedData.assigneeId;
          const isMember = team.memberIds.some((m: any) => m.toString() === validatedData.assigneeId);
          if (!isLeader && !isMember) {
            return NextResponse.json(
              { error: 'INVALID_ASSIGNEE', message: 'Assignee user must belong to the team assigned to this project' },
              { status: 400 }
            );
          }
        }
      }
    }

    const task = await Task.create({
      ...validatedData,
      orgId: user.orgId,
      reporterId: user.userId,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    });

    // Record Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TASK_CREATED',
      entityType: 'Task',
      entityId: task._id.toString(),
      details: { title: task.title, status: task.status, assigneeId: task.assigneeId },
    });

    // Notification Stub if task is assigned
    if (validatedData.assigneeId) {
      await createNotificationStub({
        orgId: user.orgId,
        userId: validatedData.assigneeId,
        title: 'New Task Assigned',
        message: `You have been assigned to task "${task.title}"`,
        type: 'TASK_ASSIGNED',
        linkUrl: `/tasks/${task._id}`,
      });
    }

    return NextResponse.json(
      {
        message: 'Task created successfully',
        task,
      },
      { status: 201 }
    );
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create task' },
      { status: 500 }
    );
  }
}
