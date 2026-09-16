import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { vendorStatusUpdateSchema } from '@/lib/validations';
import { requireAdmin, errorResponse, successResponse } from '@/lib/guards';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    await requireAdmin();
    const { id } = await params;

    const vendor = await prisma.vendor.findUnique({
      where: { id },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    const body = await req.json();
    const result = vendorStatusUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const { status } = result.data;

    const updated = await prisma.vendor.update({
      where: { id },
      data: { status },
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
      },
    });

    // Revalidate storefront and admin paths immediately (Phase 7: no caching lag)
    revalidatePath('/vendors');
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/admin/vendors');
    revalidatePath('/products');

    return successResponse(updated);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Admin vendor status update error:', err);
    return errorResponse('Failed to update vendor status', 500);
  }
}
