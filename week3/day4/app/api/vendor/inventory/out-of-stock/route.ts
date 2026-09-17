import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();

    const products = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        OR: [
          { stockQuantity: 0 },
          { status: ProductStatus.OUT_OF_STOCK },
        ],
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { updatedAt: 'desc' },
    });

    return successResponse(products);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to get out of stock products:', err);
    return errorResponse('Failed to retrieve out-of-stock products', 500);
  }
}
