import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Team from '@/models/Team';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';
import { createNotificationStub } from '@/lib/notifications';

const AddMemberSchema = z.object({
  userId: z.string().min(1, 'User ID is required'),
});

export async function POST(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TEAM_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const { userId } = AddMemberSchema.parse(body);

    await connectToDatabase();

    const team = await Team.findOne(withTenant({ _id: id }, user.orgId));
    if (!team) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    // Tenant Isolation Check: Verify user belongs to same tenant org
    const targetUser = await User.findOne(withTenant({ _id: userId }, user.orgId));
    if (!targetUser) {
      return NextResponse.json(
        { error: 'USER_NOT_FOUND', message: 'Target user does not exist in your organization' },
        { status: 404 }
      );
    }

    // Check if user is already a member
    const alreadyMember = team.memberIds.some((mId) => mId.toString() === userId);
    if (alreadyMember) {
      return NextResponse.json(
        { error: 'ALREADY_EXISTS', message: 'User is already a member of this team' },
        { status: 400 }
      );
    }

    // Atomic update using $addToSet to persist in DB and return populated document
    const updatedTeam = await Team.findOneAndUpdate(
      withTenant({ _id: id }, user.orgId),
      { $addToSet: { memberIds: targetUser._id } },
      { new: true }
    ).populate('memberIds', 'fullName email role');

    if (!updatedTeam) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    // Audit Log & Notification Stub
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'MEMBER_ADDED_TO_TEAM',
      entityType: 'Team',
      entityId: id,
      details: { teamName: updatedTeam.name, addedUserId: userId },
    });

    await createNotificationStub({
      orgId: user.orgId,
      userId: userId,
      title: 'Added to Team',
      message: `You were added to the team "${updatedTeam.name}"`,
      type: 'TEAM_ADDED',
      linkUrl: `/teams/${id}`,
    });

    return NextResponse.json({
      message: 'Member added to team successfully',
      team: updatedTeam,
    });
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to add team member' },
      { status: 500 }
    );
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TEAM_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');

  if (!userId) {
    return NextResponse.json(
      { error: 'VALIDATION_ERROR', message: 'userId query parameter is required' },
      { status: 400 }
    );
  }

  try {
    await connectToDatabase();

    const updatedTeam = await Team.findOneAndUpdate(
      withTenant({ _id: id }, user.orgId),
      { $pull: { memberIds: userId } },
      { new: true }
    ).populate('memberIds', 'fullName email role');

    if (!updatedTeam) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    // Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'MEMBER_REMOVED_FROM_TEAM',
      entityType: 'Team',
      entityId: id,
      details: { teamName: updatedTeam.name, removedUserId: userId },
    });

    return NextResponse.json({
      message: 'Member removed from team successfully',
      team: updatedTeam,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to remove team member' },
      { status: 500 }
    );
  }
}
