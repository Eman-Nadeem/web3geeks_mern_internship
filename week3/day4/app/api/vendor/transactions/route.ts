import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, successResponse, errorResponse, AppError } from '@/lib/guards';
import { financialFilterSchema } from '@/lib/validations';
import { FinancialTransactionType, TransactionDirection } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();
    const { searchParams } = new URL(req.url);

    const queryParams = {
      startDate: searchParams.get('startDate') || undefined,
      endDate: searchParams.get('endDate') || undefined,
      type: searchParams.get('type') || undefined,
      direction: searchParams.get('direction') || undefined,
      orderId: searchParams.get('orderId') || undefined,
      page: searchParams.get('page') || '1',
      limit: searchParams.get('limit') || '20',
    };

    const parseResult = financialFilterSchema.safeParse(queryParams);
    if (!parseResult.success) {
      return errorResponse('Invalid filter parameters.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { startDate, endDate, type, direction, orderId, page, limit } = parseResult.data;

    // Build database WHERE clause scoped strictly to this vendor
    const whereClause: any = {
      vendorId: vendor.id,
    };

    if (type) {
      whereClause.type = type as FinancialTransactionType;
    }

    if (direction) {
      whereClause.direction = direction as TransactionDirection;
    }

    if (orderId) {
      whereClause.orderId = orderId;
    }

    if (startDate || endDate) {
      whereClause.createdAt = {};
      if (startDate) {
        whereClause.createdAt.gte = new Date(startDate);
      }
      if (endDate) {
        whereClause.createdAt.lte = new Date(endDate);
      }
    }

    const skip = (page - 1) * limit;

    const [transactions, total] = await Promise.all([
      prisma.financialTransaction.findMany({
        where: whereClause,
        orderBy: { createdAt: 'desc' },
        skip,
        take: limit,
        include: {
          order: {
            select: {
              orderNumber: true,
            },
          },
          vendorOrder: {
            select: {
              vendorOrderNumber: true,
            },
          },
        },
      }),
      prisma.financialTransaction.count({
        where: whereClause,
      }),
    ]);

    return successResponse({
      transactions,
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
    console.error('Error fetching vendor transactions:', error);
    return errorResponse('Failed to fetch transactions.', 500);
  }
}
