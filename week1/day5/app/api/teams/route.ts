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
  memberIds: z.array(z.string()).optional().default([]),
});

export async function GET(req: Request) {
  const authResult = await requirePermission(req, 'TEAM_READ');
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

    const tenantFilter = user.role === 'SuperAdmin' ? filter : withTenant(filter, user.orgId);

    const [teams, total] = await Promise.all([
      Team.find(tenantFilter)
        .sort({ name: 1 })
        .skip(skip)
        .limit(limit)
        .populate('leaderId', 'fullName email role')
        .populate('memberIds', 'fullName email role'),
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
    const leader = await User.findOne(withTenant({ _id: leaderId }, user.orgId));
    if (!leader) {
      return NextResponse.json(
        { error: 'INVALID_LEADER', message: 'Team leader must belong to your organization' },
        { status: 400 }
      );
    }

    if (validatedData.memberIds.length > 0) {
      const validMembers = await User.find(
        withTenant({ _id: { $in: validatedData.memberIds } }, user.orgId)
      );
      if (validMembers.length !== validatedData.memberIds.length) {
        return NextResponse.json(
          { error: 'INVALID_MEMBERS', message: 'One or more members do not belong to your organization' },
          { status: 400 }
        );
      }
    }

    const team = await Team.create({
      ...validatedData,
      leaderId,
      orgId: user.orgId,
    });

    await createAuditLog({
      orgId: user.orgId,
      actorId: user.userId,
      action: 'TEAM_CREATED',
      entityType: 'Team',
      entityId: team._id.toString(),
      details: { name: team.name, leaderId: team.leaderId },
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
