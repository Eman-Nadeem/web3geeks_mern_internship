import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';

const updateUserSchema = z.object({
  role: z.enum(['ProjectManager', 'TeamMember']).optional(),
  status: z.enum(['ACTIVE', 'DEACTIVATED']).optional(),
});

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'USER_MANAGE');
  if (authResult.error) return authResult.error;

  const { user: currentUser } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const parsed = updateUserSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { role, status } = parsed.data;

    if (!role && !status) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'No valid update parameters provided' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const targetUser = await User.findOne(withTenant({ _id: id }, currentUser.orgId));

    if (!targetUser) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'User not found in your organization' },
        { status: 404 }
      );
    }

    // Safety checks
    if (status === 'DEACTIVATED' && targetUser._id.toString() === currentUser.userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Org Admin cannot deactivate their own account' },
        { status: 403 }
      );
    }

    if (targetUser.role === 'OrgAdmin' || targetUser.role === 'SuperAdmin') {
      if (role && role !== targetUser.role && currentUser.role !== 'SuperAdmin') {
        return NextResponse.json(
          { error: 'FORBIDDEN', message: 'Cannot alter role of Organization Admin' },
          { status: 403 }
        );
      }
    }

    const changes: Record<string, any> = {};

    if (role && role !== targetUser.role) {
      changes.previousRole = targetUser.role;
      targetUser.role = role;
      changes.newRole = role;
    }

    if (status && status !== targetUser.status) {
      changes.previousStatus = targetUser.status;
      targetUser.status = status;
      changes.newStatus = status;
    }

    await targetUser.save();

    await createAuditLog({
      orgId: currentUser.orgId,
      actorId: currentUser.userId,
      action: role ? 'USER_ROLE_UPDATED' : 'USER_STATUS_UPDATED',
      entityType: 'User',
      entityId: targetUser._id,
      details: changes,
    });

    return NextResponse.json({
      success: true,
      message: 'User updated successfully',
      user: {
        _id: targetUser._id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
        status: targetUser.status,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update user' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'USER_MANAGE');
  if (authResult.error) return authResult.error;

  const { user: currentUser } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const targetUser = await User.findOne(withTenant({ _id: id }, currentUser.orgId));

    if (!targetUser) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'User not found in your organization' },
        { status: 404 }
      );
    }

    if (targetUser._id.toString() === currentUser.userId) {
      return NextResponse.json(
        { error: 'FORBIDDEN', message: 'Cannot deactivate your own user account' },
        { status: 403 }
      );
    }

    targetUser.status = 'DEACTIVATED';
    await targetUser.save();

    await createAuditLog({
      orgId: currentUser.orgId,
      actorId: currentUser.userId,
      action: 'USER_DEACTIVATED',
      entityType: 'User',
      entityId: targetUser._id,
    });

    return NextResponse.json({
      success: true,
      message: 'User deactivated successfully',
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to deactivate user' },
      { status: 500 }
    );
  }
}
