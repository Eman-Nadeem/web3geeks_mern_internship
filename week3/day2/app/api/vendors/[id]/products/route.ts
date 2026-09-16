import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/guards';
import { getCurrentUser } from '@/lib/auth';
import { ProductStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findFirst({
      where: {
        OR: [
          { id },
          { slug: id },
        ],
      },
    });

    if (!vendor) {
      return errorResponse('Vendor not found', 404);
    }

    const currentUser = await getCurrentUser();
    const isOwner = currentUser?.id === vendor.ownerId;
    const isAdmin = currentUser?.role === 'ADMIN';

    // If vendor is not active, only owner/admin can access
    if (vendor.status !== 'ACTIVE' && !isOwner && !isAdmin) {
      return errorResponse('Vendor not found', 404);
    }

    // Determine product visibility
    const whereClause: { vendorId: string; status?: ProductStatus } = { vendorId: vendor.id };
    if (!isOwner && !isAdmin) {
      whereClause.status = ProductStatus.ACTIVE;
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formatted = products.map((p) => {
      const primaryImg = p.images.find((img) => img.isPrimary) || p.images[0];
      return {
        ...p,
        stock: p.stockQuantity,
        imageUrl: primaryImg ? primaryImg.url : null,
      };
    });

    return successResponse(formatted);
  } catch (err) {
    console.error('Failed to get vendor products:', err);
    return errorResponse('Failed to retrieve products', 500);
  }
}
