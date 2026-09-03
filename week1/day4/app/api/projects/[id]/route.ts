import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import Task from '@/models/Task';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';

const UpdateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters').optional(),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).optional(),
  teamId: z.string().nullable().optional(),
  managerId: z.string().optional(),
  startDate: z.string().nullable().optional(),
  dueDate: z.string().nullable().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'PROJECT_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const project = await Project.findOne(withTenant({ _id: id }, user.orgId))
      .populate('managerId', 'name email role')
      .populate('teamId', 'name description');

    if (!project) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ project });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch project' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'PROJECT_UPDATE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = UpdateProjectSchema.parse(body);

    await connectToDatabase();

    const existingProject = await Project.findOne(withTenant({ _id: id }, user.orgId));
    if (!existingProject) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      );
    }

    const updatePayload: Record<string, any> = { ...validatedData };
    if (validatedData.startDate !== undefined) {
      updatePayload.startDate = validatedData.startDate ? new Date(validatedData.startDate) : null;
    }
    if (validatedData.dueDate !== undefined) {
      updatePayload.dueDate = validatedData.dueDate ? new Date(validatedData.dueDate) : null;
    }

    const updatedProject = await Project.findOneAndUpdate(
      withTenant({ _id: id }, user.orgId),
      { $set: updatePayload },
      { new: true, runValidators: true }
    );

    // Record Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: updatedProject?.status === 'ARCHIVED' ? 'PROJECT_ARCHIVED' : 'PROJECT_UPDATED',
      entityType: 'Project',
      entityId: id,
      details: { changes: Object.keys(validatedData) },
    });

    return NextResponse.json({
      message: 'Project updated successfully',
      project: updatedProject,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update project' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'PROJECT_DELETE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const force = searchParams.get('force') === 'true';

  try {
    await connectToDatabase();

    const project = await Project.findOne(withTenant({ _id: id }, user.orgId));
    if (!project) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Project not found' },
        { status: 404 }
      );
    }

    // Business Rule Validation: Check for active tasks
    const activeTasksCount = await Task.countDocuments(
      withTenant(
        { projectId: id, status: { $in: ['TO_DO', 'IN_PROGRESS', 'UNDER_REVIEW'] } },
        user.orgId
      )
    );

    if (activeTasksCount > 0 && !force) {
      return NextResponse.json(
        {
          error: 'BUSINESS_RULE_VIOLATION',
          message: `Cannot delete project with ${activeTasksCount} active task(s). Pass force=true to override or archive the project instead.`,
          activeTasksCount,
        },
        { status: 400 }
      );
    }

    await Project.deleteOne(withTenant({ _id: id }, user.orgId));

    // Record Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'PROJECT_DELETED',
      entityType: 'Project',
      entityId: id,
      details: { name: project.name, activeTasksDeleted: force ? activeTasksCount : 0 },
    });

    return NextResponse.json({
      message: 'Project deleted successfully',
      deletedProjectId: id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to delete project' },
      { status: 500 }
    );
  }
}
