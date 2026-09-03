import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Team from '@/models/Team';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';

const CreateTeamSchema = z.object({
  name: z.string().min(2, 'Team name must be at least 2 characters'),
  description: z.string().optional(),
  leaderId: z.string().optional(),
  memberIds: z.array(z.string()).optional(),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'TEAM_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const { searchParams } = new URL(req.url);
    const search = searchParams.get('search');
    const page = Math.max(1, parseInt(searchParams.get('page') || '1', 10));
    const limit = Math.max(1, Math.min(100, parseInt(searchParams.get('limit') || '10', 10)));
    const skip = (page - 1) * limit;

    await connectToDatabase();

    const filter: Record<string, any> = {};
    if (search) {
      filter.$or = [
        { name: { $regex: search, $options: 'i' } },
        { description: { $regex: search, $options: 'i' } },
      ];
    }

    const tenantFilter = withTenant(filter, user.orgId);

    const [teams, total] = await Promise.all([
      Team.find(tenantFilter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate('leaderId', 'name email role')
        .populate('memberIds', 'name email role'),
      Team.countDocuments(tenantFilter),
    ]);

    return NextResponse.json({
      teams,
      pagination: {
        page,
        limit,
        total,
        totalPages: Math.ceil(total / limit),
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch teams' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authResult = await requirePermission(req, 'TEAM_MANAGE');
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  try {
    const body = await req.json();
    const validatedData = CreateTeamSchema.parse(body);

    await connectToDatabase();

    const leaderId = validatedData.leaderId || user.userId;

    // Validate leader belongs to same org
    const leaderUser = await User.findOne(withTenant({ _id: leaderId }, user.orgId));
    if (!leaderUser) {
      return NextResponse.json(
        { error: 'INVALID_LEADER', message: 'Team leader must belong to the same organization' },
        { status: 400 }
      );
    }

    // Validate members belong to same org if provided
    let validMemberIds: string[] = [];
    if (validatedData.memberIds && validatedData.memberIds.length > 0) {
      const orgUsers = await User.find(
        withTenant({ _id: { $in: validatedData.memberIds } }, user.orgId)
      );
      validMemberIds = orgUsers.map((u) => u._id.toString());
    }

    const team = await Team.create({
      orgId: user.orgId,
      name: validatedData.name,
      description: validatedData.description || '',
      leaderId,
      memberIds: validMemberIds,
    });

    // Audit Log
    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team._id.toString(),
      details: { name: team.name, memberCount: validMemberIds.length },
    });

    return NextResponse.json(
      {
        message: 'Team created successfully',
        team,
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
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create team' },
      { status: 500 }
    );
  }
}
