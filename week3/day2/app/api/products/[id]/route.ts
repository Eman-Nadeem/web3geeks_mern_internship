import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus, VendorStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;

    const product = await prisma.product.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
        status: ProductStatus.ACTIVE,
        vendor: { status: VendorStatus.ACTIVE },
      },
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        compareAtPrice: true,
        stockQuantity: true,
        lowStockThreshold: true,
        category: true,
        status: true,
        createdAt: true,
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        variants: {
          where: { status: ProductStatus.ACTIVE },
          select: {
            id: true,
            sku: true,
            options: true,
            price: true,
            stockQuantity: true,
            imageUrl: true,
            status: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            status: true,
            // Strictly EXCLUDE email and phone from public product details
          },
        },
      },
    });

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];

    const formatted = {
      ...product,
      stock: product.stockQuantity,
      imageUrl: primaryImg ? primaryImg.url : null,
    };

    return successResponse(formatted);
  } catch (err) {
    console.error('Failed to get public product:', err);
    return errorResponse('Failed to retrieve product', 500);
  }
}
