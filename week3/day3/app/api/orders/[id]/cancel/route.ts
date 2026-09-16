import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, assertCustomerOrderOwnership, successResponse, errorResponse, AppError } from '@/lib/guards';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id: orderId } = await context.params;

    const order = await assertCustomerOrderOwnership(orderId, user.id);

    if (order.status === 'CANCELLED') {
      throw new AppError('This order is already cancelled.', 400);
    }

    // Check if any vendor order has shipped or delivered
    const hasShippedOrDelivered = order.vendorOrders.some(
      (vo) => vo.status === 'SHIPPED' || vo.status === 'DELIVERED'
    );

    if (hasShippedOrDelivered) {
      throw new AppError('Cannot cancel order because one or more shipments have already been dispatched.', 400);
    }

    const updatedOrder = await prisma.$transaction(async (tx) => {
      // 1. Update parent order status
      await tx.order.update({
        where: { id: orderId },
        data: { status: 'CANCELLED' },
      });

      // 2. Update each vendor order and restore inventory
      for (const vo of order.vendorOrders) {
        await tx.vendorOrder.update({
          where: { id: vo.id },
          data: { status: 'CANCELLED' },
        });

        for (const item of vo.items) {
          if (item.variantId) {
            const variant = await tx.productVariant.findUnique({
              where: { id: item.variantId },
            });
            if (variant) {
              const restoredStock = variant.stockQuantity + item.quantity;
              await tx.productVariant.update({
                where: { id: item.variantId },
                data: {
                  stockQuantity: restoredStock,
                  status: restoredStock > 0 ? 'ACTIVE' : undefined,
                },
              });

              if (item.productId) {
                const prod = await tx.product.findUnique({ where: { id: item.productId } });
                if (prod) {
                  const restoredProdStock = prod.stockQuantity + item.quantity;
                  await tx.product.update({
                    where: { id: item.productId },
                    data: {
                      stockQuantity: restoredProdStock,
                      status: restoredProdStock > 0 ? 'ACTIVE' : undefined,
                    },
                  });
                }
              }

              await tx.inventoryAdjustment.create({
                data: {
                  productId: item.productId || '',
                  variantId: item.variantId,
                  vendorId: vo.vendorId,
                  previousQuantity: variant.stockQuantity,
                  newQuantity: restoredStock,
                  quantityChanged: item.quantity,
                  adjustmentType: 'RETURN',
                  reason: `Customer cancelled order ${order.orderNumber}`,
                  changedByUserId: user.id,
                },
              });
            }
          } else if (item.productId) {
            const prod = await tx.product.findUnique({
              where: { id: item.productId },
            });
            if (prod) {
              const restoredStock = prod.stockQuantity + item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: restoredStock,
                  status: restoredStock > 0 ? 'ACTIVE' : undefined,
                },
              });

              await tx.inventoryAdjustment.create({
                data: {
                  productId: item.productId,
                  vendorId: vo.vendorId,
                  previousQuantity: prod.stockQuantity,
                  newQuantity: restoredStock,
                  quantityChanged: item.quantity,
                  adjustmentType: 'RETURN',
                  reason: `Customer cancelled order ${order.orderNumber}`,
                  changedByUserId: user.id,
                },
              });
            }
          }
        }
      }

      return await tx.order.findUnique({
        where: { id: orderId },
        include: {
          vendorOrders: {
            include: {
              items: true,
              vendor: true,
            },
          },
        },
      });
    });

    return successResponse(updatedOrder);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error cancelling order:', error);
    return errorResponse('Failed to cancel order.', 500);
  }
}
