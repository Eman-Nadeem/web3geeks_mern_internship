import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, errorResponse, successResponse } from '@/lib/guards';
import { VendorStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();

    const { searchParams } = new URL(req.url);
    const statusParam = searchParams.get('status')?.toUpperCase();

    const where: { status?: VendorStatus } = {};
    if (statusParam && Object.values(VendorStatus).includes(statusParam as VendorStatus)) {
      where.status = statusParam as VendorStatus;
    }

    const vendors = await prisma.vendor.findMany({
      where,
      include: {
        owner: {
          select: {
            id: true,
            name: true,
            email: true,
            createdAt: true,
          },
        },
        _count: {
          select: {
            products: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(vendors);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Admin list vendors error:', err);
    return errorResponse('Failed to fetch vendors', 500);
  }
}
