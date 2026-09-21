import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, assertProductOwnership, errorResponse, successResponse } from '@/lib/guards';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vendor } = await requireVendor();

    // Verify ownership
    await assertProductOwnership(id, vendor.id);

    const adjustments = await prisma.inventoryAdjustment.findMany({
      where: {
        productId: id,
        vendorId: vendor.id,
      },
      include: {
        changedByUser: {
          select: {
            id: true,
            name: true,
            email: true,
          },
        },
        variant: {
          select: {
            id: true,
            sku: true,
            options: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(adjustments);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to get inventory history:', err);
    return errorResponse('Failed to retrieve inventory history', 500);
  }
}
