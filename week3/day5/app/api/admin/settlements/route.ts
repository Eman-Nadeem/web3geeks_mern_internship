import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAdmin, successResponse, errorResponse, AppError } from '@/lib/guards';

export async function GET(req: NextRequest) {
  try {
    await requireAdmin();
    const { searchParams } = new URL(req.url);

    const vendorId = searchParams.get('vendorId') || undefined;
    const status = searchParams.get('status') || undefined;
    const page = parseInt(searchParams.get('page') || '1', 10);
    const limit = parseInt(searchParams.get('limit') || '50', 10);

    const where: any = {};
    if (vendorId) where.vendorId = vendorId;
    if (status) where.status = status;

    const skip = (page - 1) * limit;

    const [settlements, total] = await Promise.all([
      prisma.settlement.findMany({
        where,
        orderBy: { requestedAt: 'desc' },
        skip,
        take: limit,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
              email: true,
            },
          },
          items: {
            include: {
              commissionRecord: {
                include: {
                  vendorOrder: true,
                },
              },
            },
          },
        },
      }),
      prisma.settlement.count({ where }),
    ]);

    return successResponse({
      settlements,
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
    console.error('Error fetching admin settlements:', error);
    return errorResponse('Failed to fetch settlements.', 500);
  }
}
