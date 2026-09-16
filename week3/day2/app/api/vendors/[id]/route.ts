import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { vendorUpdateSchema } from '@/lib/validations';
import { requireAuth, errorResponse, successResponse } from '@/lib/guards';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
      include: {
        _count: {
          select: { products: { where: { status: 'ACTIVE' } } },
        },
      },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // If vendor is not ACTIVE, only the owner or an ADMIN can view it
    if (vendor.status !== 'ACTIVE') {
      const currentUser = await getCurrentUser();
      const isOwner = currentUser?.id === vendor.ownerId;
      const isAdmin = currentUser?.role === 'ADMIN';

      if (!isOwner && !isAdmin) {
        return errorResponse('Vendor not found', 404);
      }
    }

    return successResponse(vendor);
  } catch (err) {
    console.error('Failed to get vendor:', err);
    return errorResponse('Failed to retrieve vendor', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const user = await requireAuth();
    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    // Ownership check: must be owner (or admin)
    if (vendor.ownerId !== user.id && user.role !== 'ADMIN') {
      return errorResponse('Forbidden: You can only edit your own vendor profile', 403);
    }

    const body = await req.json();
    const result = vendorUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const updated = await prisma.vendor.update({
      where: { id },
      data: {
        ...(result.data.name ? { name: result.data.name } : {}),
        ...(result.data.description !== undefined ? { description: result.data.description } : {}),
        ...(result.data.logoUrl !== undefined ? { logoUrl: result.data.logoUrl } : {}),
        ...(result.data.email ? { email: result.data.email } : {}),
        ...(result.data.phone !== undefined ? { phone: result.data.phone } : {}),
      },
    });

    revalidatePath('/vendors');
    revalidatePath(`/vendors/${vendor.slug}`);

    return successResponse(updated);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Vendor update error:', err);
    return errorResponse('Failed to update vendor', 500);
  }
}
