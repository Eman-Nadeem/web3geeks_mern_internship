import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import AuditLog from '@/models/AuditLog';
import { hashPassword, signAccessToken, signRefreshToken, setAuthCookies } from '@/lib/auth';

const SignupSchema = z.object({
  orgName: z.string().min(2, 'Organization name must be at least 2 characters'),
  orgSlug: z
    .string()
    .min(2, 'Organization slug must be at least 2 characters')
    .regex(/^[a-z0-9-]+$/, 'Slug can only contain lowercase letters, numbers, and hyphens'),
  fullName: z.string().min(2, 'Full name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(8, 'Password must be at least 8 characters long'),
});

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const validatedData = SignupSchema.parse(body);

    await connectToDatabase();

    // 1. Check if organization slug is taken
    const existingOrg = await Organization.findOne({ slug: validatedData.orgSlug.toLowerCase() });
    if (existingOrg) {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'Organization slug is already registered' },
        { status: 409 }
      );
    }

    // 2. Check if user email is taken
    const existingUser = await User.findOne({ email: validatedData.email.toLowerCase() });
    if (existingUser) {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'User with this email already exists' },
        { status: 409 }
      );
    }

    // 3. Create Organization
    const organization = await Organization.create({
      name: validatedData.orgName,
      slug: validatedData.orgSlug.toLowerCase(),
      plan: 'FREE',
      status: 'ACTIVE',
    });

    // 4. Hash password and create First User (OrgAdmin)
    const passwordHash = await hashPassword(validatedData.password);
    const user = await User.create({
      orgId: organization._id,
      email: validatedData.email.toLowerCase(),
      passwordHash,
      fullName: validatedData.fullName,
      role: 'OrgAdmin',
      status: 'ACTIVE',
    });

    // 5. Set Organization owner atomically
    await Organization.findByIdAndUpdate(organization._id, { ownerId: user._id });

    // 6. Create Audit Log
    await AuditLog.create({
      orgId: organization._id,
      actorId: user._id,
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: organization._id,
      details: { name: organization.name, plan: organization.plan, ownerEmail: user.email },
    });

    // 7. Generate Tokens
    const tokenPayload = {
      userId: user._id.toString(),
      orgId: organization._id.toString(),
      email: user.email,
      role: user.role,
    };

    const accessToken = await signAccessToken(tokenPayload);
    const refreshToken = await signRefreshToken(tokenPayload);

    // Save refresh token hash
    user.refreshTokenHash = await hashPassword(refreshToken);
    await user.save();

    const response = NextResponse.json(
      {
        message: 'Organization and admin user registered successfully',
        user: {
          id: user._id.toString(),
          email: user.email,
          fullName: user.fullName,
          role: user.role,
        },
        organization: {
          id: organization._id.toString(),
          name: organization.name,
          slug: organization.slug,
          plan: organization.plan,
        },
        tokens: {
          accessToken,
          refreshToken,
        },
      },
      { status: 201 }
    );

    return setAuthCookies(response, accessToken, refreshToken);
  } catch (error: any) {
    if (error instanceof z.ZodError) {
      return NextResponse.json(
        { error: 'VALIDATION_ERROR', details: error.errors },
        { status: 400 }
      );
    }

    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to complete signup' },
      { status: 500 }
    );
  }
}
