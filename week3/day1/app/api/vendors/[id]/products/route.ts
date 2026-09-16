import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/guards';
import { getCurrentUser } from '@/lib/auth';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const vendor = await prisma.vendor.findUnique({
      where: { id },
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
    const whereClause: { vendorId: string; status?: 'ACTIVE' } = { vendorId: id };
    if (!isOwner && !isAdmin) {
      whereClause.status = 'ACTIVE';
    }

    const products = await prisma.product.findMany({
      where: whereClause,
      orderBy: { createdAt: 'desc' },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    return successResponse(products);
  } catch (err) {
    console.error('Failed to get vendor products:', err);
    return errorResponse('Failed to retrieve products', 500);
  }
}
