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
      // 1. Update parent order status and paymentStatus
      const nextPaymentStatus = order.paymentStatus === 'PAID' ? 'REFUNDED' : order.paymentStatus;
      await tx.order.update({
        where: { id: orderId },
        data: {
          status: 'CANCELLED',
          paymentStatus: nextPaymentStatus,
        },
      });

      // If order was paid, record payment reversal in ledger
      if (order.paymentStatus === 'PAID' && tx.financialTransaction) {
        await tx.financialTransaction.create({
          data: {
            orderId: order.id,
            type: 'REFUND',
            amount: order.totalAmount,
            direction: 'DEBIT',
            description: `Payment refunded for cancelled Order ${order.orderNumber}`,
          },
        });
      }

      const orphanedItems: Array<{ sku: string; name: string; reason: string }> = [];

      // 2. Update each vendor order, commission record, and restore inventory
      for (const vo of order.vendorOrders) {
        await tx.vendorOrder.update({
          where: { id: vo.id },
          data: { status: 'CANCELLED' },
        });

        // Handle commission record reversal
        if (tx.commissionRecord) {
          const commRecord = await tx.commissionRecord.findUnique({
            where: { vendorOrderId: vo.id },
            include: { settlementItem: true },
          });

          if (commRecord && commRecord.status !== 'CANCELLED' && commRecord.status !== 'REFUNDED') {
            await tx.commissionRecord.update({
              where: { id: commRecord.id },
              data: { status: 'CANCELLED' },
            });

            if (tx.financialTransaction) {
              // Write reversal FinancialTransaction ledger entries
              await tx.financialTransaction.create({
                data: {
                  vendorId: vo.vendorId,
                  orderId: order.id,
                  vendorOrderId: vo.id,
                  type: 'REFUND',
                  amount: commRecord.grossAmount,
                  direction: 'DEBIT',
                  description: `Cancellation reversal of gross sale for VendorOrder ${vo.vendorOrderNumber}`,
                },
              });

              await tx.financialTransaction.create({
                data: {
                  vendorId: vo.vendorId,
                  orderId: order.id,
                  vendorOrderId: vo.id,
                  type: 'REFUND',
                  amount: commRecord.commissionAmount,
                  direction: 'CREDIT',
                  description: `Cancellation reversal of platform commission for VendorOrder ${vo.vendorOrderNumber}`,
                },
              });
            }
          }
        }

        for (const item of vo.items) {
          if (!item.productId) {
            orphanedItems.push({
              sku: item.skuSnapshot,
              name: item.productNameSnapshot,
              reason: 'Product record was permanently removed from catalog',
            });
            continue;
          }

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) {
            orphanedItems.push({
              sku: item.skuSnapshot,
              name: item.productNameSnapshot,
              reason: 'Product record was permanently removed from catalog',
            });
            continue;
          }

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

              const restoredProdStock = prod.stockQuantity + item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: restoredProdStock,
                  status: restoredProdStock > 0 ? 'ACTIVE' : undefined,
                },
              });

              await tx.inventoryAdjustment.create({
                data: {
                  productId: item.productId,
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
            } else {
              // Variant was deleted but parent product still exists: restore product stock
              const restoredProdStock = prod.stockQuantity + item.quantity;
              await tx.product.update({
                where: { id: item.productId },
                data: {
                  stockQuantity: restoredProdStock,
                  status: restoredProdStock > 0 ? 'ACTIVE' : undefined,
                },
              });

              await tx.inventoryAdjustment.create({
                data: {
                  productId: item.productId,
                  vendorId: vo.vendorId,
                  previousQuantity: prod.stockQuantity,
                  newQuantity: restoredProdStock,
                  quantityChanged: item.quantity,
                  adjustmentType: 'RETURN',
                  reason: `Customer cancelled order ${order.orderNumber}`,
                  changedByUserId: user.id,
                },
              });
            }
          } else {
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

      const finalOrder = await tx.order.findUnique({
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

      return {
        order: finalOrder,
        orphanedItems: orphanedItems.length > 0 ? orphanedItems : undefined,
      };
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
