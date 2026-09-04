import { NextResponse } from 'next/server';
import connectToDatabase from '@/lib/db';
import Organization from '@/models/Organization';
import User from '@/models/User';
import { requireAuth } from '@/lib/rbac';
import { hashPassword } from '@/lib/auth';

export async function GET(req: Request) {
  const authResult = await requireAuth(req);
  if (authResult.error) return authResult.error;

  const { user } = authResult;

  if (user.role !== 'SuperAdmin') {
    return NextResponse.json(
      { error: 'FORBIDDEN', message: 'Platform administration requires SuperAdmin role' },
      { status: 403 }
    );
  }

  try {
    await connectToDatabase();

    const organizations = await Organization.find({}).sort({ createdAt: -1 });

    return NextResponse.json({
      count: organizations.length,
      organizations,
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to fetch platform organizations' },
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
      { error: 'FORBIDDEN', message: 'Platform administration requires SuperAdmin role' },
      { status: 403 }
    );
  }

  try {
    const body = await req.json();
    const { name, slug, plan, adminEmail, adminName, adminPassword } = body;

    if (!name || !slug || !adminEmail || !adminPassword) {
      return NextResponse.json(
        { error: 'BAD_REQUEST', message: 'Name, slug, adminEmail, and adminPassword are required' },
        { status: 400 }
      );
    }

    await connectToDatabase();

    const existingSlug = await Organization.findOne({ slug: slug.toLowerCase() });
    if (existingSlug) {
      return NextResponse.json(
        { error: 'CONFLICT', message: 'Organization slug already exists' },
        { status: 409 }
      );
    }

    const org = await Organization.create({
      name,
      slug: slug.toLowerCase(),
      plan: plan || 'FREE',
      status: 'ACTIVE',
    });

    const passwordHash = await hashPassword(adminPassword);

    const adminUser = await User.create({
      orgId: org._id,
      email: adminEmail.toLowerCase(),
      fullName: adminName || adminEmail.split('@')[0],
      passwordHash,
      role: 'OrgAdmin',
      status: 'ACTIVE',
    });

    org.ownerId = adminUser._id;
    await org.save();

    return NextResponse.json({
      success: true,
      message: 'Tenant organization provisioned successfully',
      organization: org,
      adminUser: {
        _id: adminUser._id,
        email: adminUser.email,
        fullName: adminUser.fullName,
        role: adminUser.role,
      },
    });
  } catch (error: any) {
    return NextResponse.json(
      { error: 'SERVER_ERROR', message: error.message || 'Failed to create organization' },
      { status: 500 }
    );
  }
}
