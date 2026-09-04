import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import User from '@/models/User';
import { hashPassword, signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth';
import { createAuditLog } from '@/lib/audit';
import { createNotificationStub } from '@/lib/notifications';

const acceptInviteSchema = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  fullName: z.string().min(1, 'Full name is required'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const parsed = acceptInviteSchema.safeParse(body);

    if (!parsed.success) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: parsed.error.errors[0].message },
        { status: 400 }
      );
    }

    const { token, password, fullName } = parsed.data;

    await connectToDatabase();

    const user = await User.findOne({ inviteToken: token });

    if (!user) {
      return NextResponse.json(
        { error: 'NOT_FOUND', message: 'Invalid or expired invitation token' },
        { status: 404 }
      );
    }

    if (user.inviteExpiresAt && user.inviteExpiresAt < new Date()) {
      return NextResponse.json(
        { error: 'EXPIRED', message: 'Invitation token has expired. Please request a new invite.' },
        { status: 400 }
      );
    }

    const passwordHash = await hashPassword(password);

    user.fullName = fullName;
    user.passwordHash = passwordHash;
    user.status = 'ACTIVE';
    user.inviteToken = undefined;
    user.inviteExpiresAt = undefined;
    await user.save();

    // Audit log & notification to OrgAdmin
    if (user.orgId) {
      await createAuditLog({
        orgId: user.orgId,
        actorId: user._id,
        action: 'USER_INVITE_ACCEPTED',
        entityType: 'User',
        entityId: user._id,
        details: { email: user.email, role: user.role },
      });

      const orgAdmin = await User.findOne({ orgId: user.orgId, role: 'OrgAdmin' });
      if (orgAdmin) {
        await createNotificationStub({
          orgId: user.orgId,
          userId: orgAdmin._id,
          title: 'Invitation Accepted',
          message: `${fullName} (${user.email}) accepted your invitation and joined as ${user.role}.`,
          type: 'USER_INVITED',
          linkUrl: '/users',
        });
      }
    }

    const tokenPayload = {
      userId: user._id.toString(),
      orgId: user.orgId ? user.orgId.toString() : '',
      email: user.email,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    const response = NextResponse.json({
      success: true,
      message: 'Account setup complete. Welcome!',
      user: {
        _id: user._id,
        email: user.email,
        fullName: user.fullName,
        role: user.role,
        status: user.status,
        orgId: user.orgId,
      },
    });

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to accept invitation' },
      { status: 500 }
    );
  }
}
