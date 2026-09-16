import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.trim();
    const status = searchParams.get('status');

    const where: any = {
      vendorId: vendor.id,
    };

    if (status && status !== 'ALL') {
      where.status = status as ProductStatus;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    const [products, totalProducts, activeProducts, draftProducts, allVendorProducts] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          variants: { orderBy: { createdAt: 'asc' } },
          _count: { select: { adjustments: true, variants: true } },
        },
        orderBy: { stockQuantity: 'asc' },
      }),
      prisma.product.count({ where: { vendorId: vendor.id } }),
      prisma.product.count({ where: { vendorId: vendor.id, status: ProductStatus.ACTIVE } }),
      prisma.product.count({ where: { vendorId: vendor.id, status: ProductStatus.DRAFT } }),
      prisma.product.findMany({
        where: { vendorId: vendor.id },
        select: { id: true, stockQuantity: true, lowStockThreshold: true, status: true },
      }),
    ]);

    const lowStockCount = allVendorProducts.filter(
      (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
    ).length;

    const outOfStockCount = allVendorProducts.filter(
      (p) => p.stockQuantity === 0 || p.status === ProductStatus.OUT_OF_STOCK
    ).length;

    const totalInventoryUnits = allVendorProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

    return successResponse({
      stats: {
        totalProducts,
        activeProducts,
        draftProducts,
        lowStockCount,
        outOfStockCount,
        totalInventoryUnits,
      },
      products,
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to get vendor inventory overview:', err);
    return errorResponse('Failed to retrieve inventory overview', 500);
  }
}
