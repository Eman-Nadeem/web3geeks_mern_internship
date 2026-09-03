import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';

const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('PLANNING'),
  teamId: z.string().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'PROJECT_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const status = searchParams.get('status');
    const search = searchParams.get('search');
    const sortBy = searchParams.get('sortBy') || 'createdAt';
    const sortOrder = searchParams.get('sortOrder') === 'asc' ? 1 : -1;
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const filter: Record<string, any> = {};
    if (status) {
      filter.status = status;
    }
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tenantFilter = withTenant(filter, user.orgId);

    const [projects, total] = await Promise.all([
      Project.find(tenantFilter)
        .sort({ [sortBy]: sortOrder })
        .skip(skip)
        .limit(limit)
        .populate('managerId', 'name email role')
        .populate('teamId', 'name'),
      Project.countDocuments(tenantFilter),
    ]);

    return NextResponse.json({
      projects,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch projects' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authResult = await requirePermission(req, 'PROJECT_CREATE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const body = await req.json();
    const validatedData = CreateProjectSchema.parse(body);

    await connectToDatabase();

    const project = await Project.create({
      ...validatedData,
      orgId: user.orgId,
      managerId: user.userId,
      startDate: validatedData.startDate ? new Date(validatedData.startDate) : undefined,
      dueDate: validatedData.dueDate ? new Date(validatedData.dueDate) : undefined,
    });

    // Record Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'PROJECT_CREATED',
      entityType: 'Project',
      entityId: project._id.toString(),
      details: { name: project.name, status: project.status },
    });

    return NextResponse.json(
      {
        message: 'Project created successfully',
        project,
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
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create project' },
      { status: 500 }
    );
  }
}
