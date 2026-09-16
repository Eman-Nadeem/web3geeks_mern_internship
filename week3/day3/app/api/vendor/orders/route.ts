import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireVendor, successResponse, errorResponse, AppError } from '@/lib/guards';
import { OrderStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();

    const { searchParams } = new URL(req.url);
    const statusFilter = searchParams.get('status') as OrderStatus | null;

    const whereClause: any = {
      vendorId: vendor.id,
    };

    if (statusFilter && Object.values(OrderStatus).includes(statusFilter)) {
      whereClause.status = statusFilter;
    }

    const vendorOrders = await prisma.vendorOrder.findMany({
      where: whereClause,
      include: {
        order: {
          select: {
            id: true,
            orderNumber: true,
            customer: {
              select: {
                id: true,
                name: true,
                email: true,
              },
            },
            shippingName: true,
            shippingEmail: true,
            shippingPhone: true,
            shippingAddress: true,
            shippingCity: true,
            shippingPostalCode: true,
            paymentStatus: true,
            paymentMethod: true,
            createdAt: true,
          },
        },
        items: true,
      },
      orderBy: { createdAt: 'desc' },
    });

    // Compute stats for all vendor orders
    const allVendorOrders = await prisma.vendorOrder.findMany({
      where: { vendorId: vendor.id },
      select: { status: true, subtotal: true, total: true },
    });

    const stats = {
      totalOrders: allVendorOrders.length,
      pendingCount: allVendorOrders.filter((o) => o.status === 'PENDING').length,
      confirmedCount: allVendorOrders.filter((o) => o.status === 'CONFIRMED').length,
      processingCount: allVendorOrders.filter((o) => o.status === 'PROCESSING').length,
      shippedCount: allVendorOrders.filter((o) => o.status === 'SHIPPED').length,
      deliveredCount: allVendorOrders.filter((o) => o.status === 'DELIVERED').length,
      cancelledCount: allVendorOrders.filter((o) => o.status === 'CANCELLED').length,
      totalRevenue: Number(
        allVendorOrders
          .filter((o) => o.status !== 'CANCELLED')
          .reduce((sum, o) => sum + o.subtotal, 0)
          .toFixed(2)
      ),
    };

    const formattedOrders = vendorOrders.map((vo) => ({
      id: vo.id,
      vendorOrderNumber: vo.vendorOrderNumber,
      parentOrderNumber: vo.order.orderNumber,
      customerName: vo.order.shippingName || vo.order.customer.name,
      customerEmail: vo.order.shippingEmail || vo.order.customer.email,
      customerPhone: vo.order.shippingPhone,
      shippingAddress: `${vo.order.shippingAddress}, ${vo.order.shippingCity}`,
      subtotal: vo.subtotal,
      shippingAmount: vo.shippingAmount,
      total: vo.total,
      status: vo.status,
      paymentStatus: vo.order.paymentStatus,
      itemsCount: vo.items.reduce((sum, item) => sum + item.quantity, 0),
      items: vo.items,
      createdAt: vo.createdAt,
      updatedAt: vo.updatedAt,
    }));

    return successResponse({
      orders: formattedOrders,
      stats,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching vendor orders:', error);
    return errorResponse('Failed to fetch vendor orders.', 500);
  }
}
