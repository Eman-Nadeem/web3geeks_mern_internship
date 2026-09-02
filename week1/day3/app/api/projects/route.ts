import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Project from '@/models/Project';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';

const CreateProjectSchema = z.object({
  name: z.string().min(2, 'Project name must be at least 2 characters'),
  description: z.string().optional(),
  status: z.enum(['PLANNING', 'ACTIVE', 'ON_HOLD', 'COMPLETED', 'ARCHIVED']).default('PLANNING'),
  budget: z.number().optional(),
  startDate: z.string().optional(),
  dueDate: z.string().optional(),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'PROJECT_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    await connectToDatabase();

    // Enforce Tenant Data Isolation
    const projects = await Project.find(withTenant({}, user.orgId)).sort({ createdAt: -1 });

    return NextResponse.json({
      count: projects.length,
      projects,
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
