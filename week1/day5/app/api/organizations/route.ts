import { NextResponse } from 'next/server';
import { z } from 'zod';
import connectToDatabase from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { requireAuth } from '@/lib/rbac';
import { createAuditLog } from '@/lib/audit';
import { hashPassword } from '@/lib/auth';

const CreateOrganizationSchema = z.object({
  name: z.string().min(2, 'Organization name must be at least 2 characters'),
  slug: z.string().min(2, 'Slug must be at least 2 characters'),
  plan: z.enum(['FREE', 'PRO', 'ENTERPRISE']).default('FREE'),
  status: z.enum(['ACTIVE', 'SUSPENDED']).default('ACTIVE'),
  ownerId: z.string().optional().nullable(),
  newOwnerName: z.string().optional(),
  newOwnerEmail: z.string().optional(),
});

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  if (user.role !== 'SuperAdmin') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Only SuperAdmin can view all organizations' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();
    const organizations = await Organization.find({})
      .populate('ownerId', '_id fullName email')
      .sort({ createdAt: -1 });

    return NextResponse.json({
      organizations,
      count: organizations.length,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch organizations' },
      { status: 500 }
    );
  }
}

export async function POST(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;
  if (user.role !== 'SuperAdmin') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Only SuperAdmin can create organizations' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const validatedData = CreateOrganizationSchema.parse(body);

    await connectToDatabase();

    const existingSlug = await Organization.findOne({ slug: validatedData.slug.toLowerCase() });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'DUPLICATE_SLUG', message: 'An organization with this slug already exists' },
        { status: 400 }
      );
    }

    const orgData: Record<string, any> = {
      name: validatedData.name,
      slug: validatedData.slug.toLowerCase(),
      plan: validatedData.plan,
      status: validatedData.status,
    };
    if (validatedData.ownerId) {
      orgData.ownerId = validatedData.ownerId;
    }

    const organization = await Organization.create(orgData);

    let assignedOwnerId = validatedData.ownerId;

    // Handle inline new owner creation by SuperAdmin
    if (validatedData.newOwnerEmail && validatedData.newOwnerName) {
      const email = validatedData.newOwnerEmail.toLowerCase().trim();
      let ownerUser = await User.findOne({ email });

      if (!ownerUser) {
        const passwordHash = await hashPassword('Password123!');
        ownerUser = await User.create({
          fullName: validatedData.newOwnerName.trim(),
          email,
          passwordHash,
          role: 'OrgAdmin',
          orgId: organization._id,
          status: 'ACTIVE',
        });
      } else {
        ownerUser.orgId = organization._id;
        ownerUser.role = 'OrgAdmin';
        await ownerUser.save();
      }

      assignedOwnerId = ownerUser._id.toString();
      await Organization.findByIdAndUpdate(organization._id, { ownerId: ownerUser._id });
    } else if (validatedData.ownerId) {
      await User.findByIdAndUpdate(validatedData.ownerId, { orgId: organization._id, role: 'OrgAdmin' });
    }

    await createAuditLog({
      orgId: organization._id,
      actorId: user.userId,
      action: 'ORGANIZATION_CREATED',
      entityType: 'Organization',
      entityId: organization._id,
      details: { name: organization.name, plan: organization.plan },
    });

    return NextResponse.json(
      { message: 'Organization created successfully', organization },
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
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}
