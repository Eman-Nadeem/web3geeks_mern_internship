import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import {
  requireVendor,
  assertVendorOrderOwnership,
  isValidOrderTransition,
  computeParentOrderStatus,
  ALLOWED_ORDER_TRANSITIONS,
  successResponse,
  errorResponse,
  AppError,
} from '@/lib/guards';
import { vendorOrderStatusUpdateSchema } from '@/lib/validations';
import { OrderStatus } from '@prisma/client';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const { user, vendor } = await requireVendor();
    const { id: vendorOrderId } = await context.params;
    const body = await req.json();

    const parseResult = vendorOrderStatusUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid order status.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { status: nextStatus } = parseResult.data;

    // Verify vendor ownership
    const vendorOrder = await assertVendorOrderOwnership(vendorOrderId, vendor.id);

    // Validate state machine transition
    if (!isValidOrderTransition(vendorOrder.status, nextStatus)) {
      const allowed = ALLOWED_ORDER_TRANSITIONS[vendorOrder.status] || [];
      throw new AppError(
        `Invalid status transition from ${vendorOrder.status} to ${nextStatus}. Allowed next states: [${allowed.join(', ')}].`,
        400,
        { currentStatus: vendorOrder.status, requestedStatus: nextStatus, allowedTransitions: allowed }
      );
    }

    const result = await prisma.$transaction(async (tx) => {
      // If cancelling, restore inventory
      if (nextStatus === 'CANCELLED' && vendorOrder.status !== 'CANCELLED') {
        for (const item of vendorOrder.items) {
          if (!item.productId) continue;

          const prod = await tx.product.findUnique({ where: { id: item.productId } });
          if (!prod) continue; // Product was permanently deleted; skip restock gracefully

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
                  vendorId: vendor.id,
                  previousQuantity: variant.stockQuantity,
                  newQuantity: restoredStock,
                  quantityChanged: item.quantity,
                  adjustmentType: 'RETURN',
                  reason: `Vendor cancelled order item ${vendorOrder.vendorOrderNumber}`,
                  changedByUserId: user.id,
                },
              });
            } else {
              // Variant deleted, product exists
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
                  vendorId: vendor.id,
                  previousQuantity: prod.stockQuantity,
                  newQuantity: restoredProdStock,
                  quantityChanged: item.quantity,
                  adjustmentType: 'RETURN',
                  reason: `Vendor cancelled order item ${vendorOrder.vendorOrderNumber}`,
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
                vendorId: vendor.id,
                previousQuantity: prod.stockQuantity,
                newQuantity: restoredStock,
                quantityChanged: item.quantity,
                adjustmentType: 'RETURN',
                reason: `Vendor cancelled order item ${vendorOrder.vendorOrderNumber}`,
                changedByUserId: user.id,
              },
            });
          }
        }
      }

      // 1. Update the vendor order
      const updatedVendorOrder = await tx.vendorOrder.update({
        where: { id: vendorOrderId },
        data: { status: nextStatus },
        include: {
          items: true,
          vendor: true,
        },
      });

      // 2. Query all sibling vendor orders under parent Order
      const allSiblings = await tx.vendorOrder.findMany({
        where: { orderId: vendorOrder.orderId },
        select: { status: true },
      });

      const rollupStatus = computeParentOrderStatus(allSiblings.map((s) => s.status));

      // 3. Update parent order status
      await tx.order.update({
        where: { id: vendorOrder.orderId },
        data: { status: rollupStatus },
      });

      return {
        vendorOrder: updatedVendorOrder,
        parentOrderStatus: rollupStatus,
      };
    });

    return successResponse(result);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error updating vendor order status:', error);
    return errorResponse('Failed to update vendor order status.', 500);
  }
}
