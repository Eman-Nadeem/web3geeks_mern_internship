import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { vendorRegistrationSchema } from '@/lib/validations';
import { requireAuth, errorResponse, successResponse } from '@/lib/guards';
import { createSessionToken, setSessionCookie } from '@/lib/auth';
import { VendorStatus } from '@prisma/client';

export async function GET() {
  try {
    const vendors = await prisma.vendor.findMany({
      where: { status: VendorStatus.ACTIVE },
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        logoUrl: true,
        email: true,
        phone: true,
        createdAt: true,
        _count: {
          select: {
            products: {
              where: { status: 'ACTIVE' },
            },
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(vendors);
  } catch (err) {
    console.error('Failed to list vendors:', err);
    return errorResponse('Failed to retrieve vendors', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if user already owns a vendor
    const existingVendor = await prisma.vendor.findUnique({
      where: { ownerId: user.id },
    });

    if (existingVendor) {
      return errorResponse('User already has a registered vendor store', 400);
    }

    const body = await req.json();
    const result = vendorRegistrationSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const { name, slug, description, logoUrl, email, phone } = result.data;

    // Check slug uniqueness
    const slugConflict = await prisma.vendor.findUnique({
      where: { slug },
    });

    if (slugConflict) {
      return errorResponse('Store slug is already taken. Please choose another name or slug.', 409);
    }

    // Create vendor with PENDING status & promote user to VENDOR
    const vendor = await prisma.$transaction(async (tx) => {
      const created = await tx.vendor.create({
        data: {
          name,
          slug,
          description: description || null,
          logoUrl: logoUrl || null,
          email,
          phone: phone || null,
          status: VendorStatus.PENDING,
          ownerId: user.id,
        },
      });

      await tx.user.update({
        where: { id: user.id },
        data: { role: 'VENDOR' },
      });

      return created;
    });

    // Update user session cookie with new role
    const token = await createSessionToken({
      userId: user.id,
      email: user.email,
      name: user.name,
      role: 'VENDOR',
    });
    await setSessionCookie(token);

    revalidatePath('/admin/vendors');

    return successResponse(vendor, 201);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Vendor registration error:', err);
    return errorResponse('Failed to register vendor', 500);
  }
}
