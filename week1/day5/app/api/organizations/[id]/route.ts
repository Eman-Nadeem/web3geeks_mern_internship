import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Organization from '@/models/Organization';
import { requirePermission, requireAuth } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';

const updateOrgSchema = z.object({
  name: z.string().min(1, 'Organization name cannot be empty').optional(),
  logoUrl: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user: currentUser } = authResult;
  let { id } = await params;
  if (id === 'mine') id = currentUser.orgId;

  try {
    await connectToDatabase();

    if (currentUser.role !== 'SuperAdmin' && currentUser.orgId !== id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You can only view your own organization' },
        { status: 403 }
      );
    }

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Organization not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ organization: org });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch organization' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'ORG_MANAGE');
  if (authResult.error) return authResult.error;

  const { user: currentUser } = authResult;
  let { id } = await params;
  if (id === 'mine') id = currentUser.orgId;

  try {
    if (currentUser.role !== 'SuperAdmin' && currentUser.orgId !== id) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'You can only edit your own organization' },
        { status: 403 }
      );
    }

    const body = await req.json();
    const parsed = updateOrgSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const org = await Organization.findById(id);
    if (!org) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Organization not found' },
        { status: 404 }
      );
    }

    const { name, logoUrl } = parsed.data;

    if (name) org.name = name;
    if (logoUrl !== undefined) org.logoUrl = logoUrl;

    await org.save();

    await createAuditLog({
      orgId: org._id,
      actorId: currentUser.userId,
      action: 'ORG_UPDATED',
      entityType: 'Organization',
      entityId: org._id,
      details: { name, logoUrl },
    });

    return NextResponse.json({
      success: true,
      message: 'Organization updated successfully',
      organization: org,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update organization' },
      { status: 500 }
    );
  }
}
