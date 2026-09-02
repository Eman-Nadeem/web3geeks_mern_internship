import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Task from '@/models/Task';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

const CreateTaskSchema = z.object({
  projectId: z.string().min(1, 'Project ID is required'),
  title: z.string().min(2, 'Task title must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['BACKLOG', 'TO_DO', 'IN_PROGRESS', 'IN_REVIEW', 'COMPLETED', 'CANCELLED']).default('TO_DO'),
  priority: z.enum(['LOW', 'MEDIUM', 'HIGH', 'URGENT']).default('MEDIUM'),
  assigneeId: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'TASK_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    await connectToDatabase();

    // Enforce Tenant Isolation
    const tasks = await Task.find(withTenant({}, user.orgId)).sort({ createdAt: -1 });

    return NextResponse.json({
      count: tasks.length,
      tasks,
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

    const task = await Task.create({
      ...validatedData,
      orgId: user.orgId,
      reporterId: user.userId,
    });

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
