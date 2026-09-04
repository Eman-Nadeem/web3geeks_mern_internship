import { NextResponse } from 'next/server';
import crypto from 'crypto';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { requirePermission } from '@/lib/rbac';
import { withTenant } from '@/lib/tenantScoping';
import { createAuditLog } from '@/lib/audit';
import { createNotificationStub } from '@/lib/notifications';

const inviteSchema = z.object({
  email: z.string().email('Invalid email address'),
  role: z.enum(['ProjectManager', 'TeamMember'], {
    errorMap: () => ({ message: 'Role must be ProjectManager or TeamMember' }),
  }),
});

export async function POST(req: Request) {
  const authResult = await requirePermission(req, 'USER_INVITE');
  if (authResult.error) return authResult.error;

  const { user: currentUser } = authResult;

  try {
    const body = await req.json();
    const parsed = inviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { email, role } = parsed.data;

    await connectToDatabase();

    // Check if user already exists in this organization
    const existingUser = await User.findOne(withTenant({ email: email.toLowerCase() }, currentUser.orgId));

    const inviteToken = crypto.randomBytes(32).toString('hex');
    const inviteExpiresAt = new Date(Date.now() + 7 * 24 * 60 * 60 * 1000); // 7 days

    let targetUser;

    if (existingUser) {
      if (existingUser.status === 'ACTIVE') {
        return NextResponse.json(
          { error: 'CONFLICT', message: 'User with this email is already an active member of this organization.' },
          { status: 409 }
        );
      }

      // Refresh invitation token for pending/invited user
      existingUser.inviteToken = inviteToken;
      existingUser.inviteExpiresAt = inviteExpiresAt;
      existingUser.role = role;
      existingUser.status = 'INVITED';
      await existingUser.save();
      targetUser = existingUser;
    } else {
      // Create new pending invited user
      targetUser = await User.create({
        orgId: currentUser.orgId,
        email: email.toLowerCase(),
        passwordHash: '$2a$10$INVITED_PENDING_PASSWORD_HASH_PLACEHOLDER',
        fullName: email.split('@')[0],
        role,
        status: 'INVITED',
        inviteToken,
        inviteExpiresAt,
      });
    }

    // Audit log & notification
    await createAuditLog({
      orgId: currentUser.orgId,
      actorId: currentUser.userId,
      action: 'USER_INVITED',
      entityType: 'User',
      entityId: targetUser._id,
      details: { email, role, inviteExpiresAt },
    });

    await createNotificationStub({
      orgId: currentUser.orgId,
      userId: targetUser._id,
      title: 'Organization Invitation',
      message: `You have been invited to join the organization as ${role}.`,
      type: 'USER_INVITED',
      linkUrl: `/accept-invite?token=${inviteToken}`,
    });

    const inviteLink = `/accept-invite?token=${inviteToken}`;

    return NextResponse.json({
      success: true,
      message: `Invitation successfully created for ${email}`,
      user: {
        _id: targetUser._id,
        email: targetUser.email,
        fullName: targetUser.fullName,
        role: targetUser.role,
        status: targetUser.status,
        inviteExpiresAt: targetUser.inviteExpiresAt,
      },
      inviteToken,
      inviteLink,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to process invitation' },
      { status: 500 }
    );
  }
}
