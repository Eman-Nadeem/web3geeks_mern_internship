import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, successResponse, errorResponse, AppError } from '@/lib/guards';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const vendorId = searchParams.get('vendorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const orderId = searchParams.get('orderId') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;
    if (orderId) where.orderId = orderId;

    const skip = (page - 1) * limit;

    const [records, total] = await Promise.all([
      prisma.commissionRecord.findMany({
        where,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
          order: {
            select: {
              orderNumber: true,
            },
          },
          vendorOrder: {
            select: {
              vendorOrderNumber: true,
              status: true,
            },
          },
          settlementItem: {
            include: {
              settlement: {
                select: {
                  id: true,
                  settlementNumber: true,
                  status: true,
                },
              },
            },
          },
        },
      }),
      prisma.commissionRecord.count({ where }),
    ]);

    return successResponse({
      records,
      pagination: {
        total,
        page,
        limit,
        totalPages: Math.ceil(total / limit) || 1,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching admin commissions:', error);
    return errorResponse('Failed to fetch commissions.', 500);
  }
}
