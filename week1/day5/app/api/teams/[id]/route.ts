import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Team from '@/models/Team';
import User from '@/models/User';
import Project from '@/models/Project';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';

const UpdateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters').optional(),
  description: z.string().optional(),
  leaderId: z.string().optional(),
});

export async function GET(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TEAM_READ');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    await connectToDatabase();

    const team = await Team.findOne(withTenant({ _id: id }, user.orgId))
      .populate('leaderId', 'fullName email role')
      .populate('memberIds', 'fullName email role');

    if (!team) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    return NextResponse.json({ team });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch team' },
      { status: 500 }
    );
  }
}

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string }> }
) {
  const authResult = await requirePermission(req, 'TEAM_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  const { id } = await params;

  try {
    const body = await req.json();
    const validatedData = UpdateTeamSchema.parse(body);

    await connectToDatabase();

    const existingTeam = await Team.findOne(withTenant({ _id: id }, user.orgId));
    if (!existingTeam) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    if (validatedData.leaderId) {
      const leaderUser = await User.findOne(withTenant({ _id: validatedData.leaderId }, user.orgId));
      if (!leaderUser) {
        return NextResponse.json(
          { error: 'INVALID_LEADER', message: 'Team leader must belong to the same organization' },
          { status: 400 }
        );
      }
    }

    const updatedTeam = await Team.findOneAndUpdate(
      withTenant({ _id: id }, user.orgId),
      { $set: validatedData },
      { new: true, runValidators: true }
    );

    // Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TEAM_UPDATED',
      entityType: 'Team',
      entityId: id,
      details: { changes: Object.keys(validatedData) },
    });

    return NextResponse.json({
      message: 'Team updated successfully',
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
      { error: 'SERVER_ERROR', message: error.message || 'Failed to update team' },
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
  const force = searchParams.get('force') === 'true';

  try {
    await connectToDatabase();

    const team = await Team.findOne(withTenant({ _id: id }, user.orgId));
    if (!team) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Team not found' },
        { status: 404 }
      );
    }

    // Safety check: Check if any project is associated with this team
    const projectCount = await Project.countDocuments(withTenant({ teamId: id }, user.orgId));
    if (projectCount > 0 && !force) {
      return NextResponse.json(
        {
          error: 'BUSINESS_RULE_VIOLATION',
          message: `Cannot delete team because it is assigned to ${projectCount} project(s). Pass force=true parameter to delete anyway or reassign projects.`,
          associatedProjectsCount: projectCount,
        },
        { status: 400 }
      );
    }

    await Team.deleteOne(withTenant({ _id: id }, user.orgId));

    // Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TEAM_DELETED',
      entityType: 'Team',
      entityId: id,
      details: { name: team.name },
    });

    return NextResponse.json({
      message: 'Team deleted successfully',
      deletedTeamId: id,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to delete team' },
      { status: 500 }
    );
  }
}
