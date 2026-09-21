import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const orders = await prisma.order.findMany({
      where: { customerId: user.id },
      include: {
        vendorOrders: {
          include: {
            items: true,
            vendor: {
              select: {
                id: true,
                name: true,
                slug: true,
                logoUrl: true,
              },
            },
          },
          orderBy: { vendorOrderNumber: 'asc' },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    const formattedOrders = orders.map((order) => {
      const vendorNames = order.vendorOrders.map((vo) => vo.vendor.name);
      const totalItemCount = order.vendorOrders.reduce(
        (total, vo) => total + vo.items.reduce((sum, item) => sum + item.quantity, 0),
        0
      );

      return {
        id: order.id,
        orderNumber: order.orderNumber,
        totalAmount: order.totalAmount,
        paymentStatus: order.paymentStatus,
        paymentMethod: order.paymentMethod,
        status: order.status,
        vendorCount: order.vendorOrders.length,
        vendorNames,
        totalItemCount,
        vendorOrders: order.vendorOrders,
        createdAt: order.createdAt,
        updatedAt: order.updatedAt,
      };
    });

    return successResponse(formattedOrders);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching customer orders:', error);
    return errorResponse('Failed to fetch orders.', 500);
  }
}
