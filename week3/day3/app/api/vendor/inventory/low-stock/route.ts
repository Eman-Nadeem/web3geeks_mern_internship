import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();

    const products = await prisma.product.findMany({
      where: {
        vendorId: vendor.id,
        stockQuantity: { gt: 0 },
      },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
      orderBy: { stockQuantity: 'asc' },
    });

    // Filter strictly for products at or below their lowStockThreshold (and stock > 0)
    const lowStockProducts = products.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
    );

    return successResponse(lowStockProducts);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to get low stock products:', err);
    return errorResponse('Failed to retrieve low-stock products', 500);
  }
}
