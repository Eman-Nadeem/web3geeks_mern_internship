import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { stockAdjustmentSchema } from '@/lib/validations';
import { requireVendor, assertProductOwnership, errorResponse, successResponse, AppError } from '@/lib/guards';
import { ProductStatus, AdjustmentType } from '@prisma/client';

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { user, vendor } = await requireVendor(['ACTIVE']);

    // Ensure product belongs to authenticated vendor (403 otherwise)
    const product = await assertProductOwnership(id, vendor.id);

    const body = await req.json();
    const result = stockAdjustmentSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const { variantId, adjustmentType, delta, exactQuantity, reason } = result.data;

    const updatedData = await prisma.$transaction(async (tx) => {
      let previousQuantity: number;
      let newQuantity: number;
      let quantityChanged: number;

      if (variantId) {
        // Variant stock adjustment
        const variant = await tx.productVariant.findFirst({
          where: { id: variantId, productId: product.id },
        });

        if (!variant) {
          throw new AppError('Variant not found for this product.', 404);
        }

        previousQuantity = variant.stockQuantity;

        if (exactQuantity !== undefined) {
          newQuantity = exactQuantity;
          quantityChanged = newQuantity - previousQuantity;
        } else if (delta !== undefined) {
          newQuantity = previousQuantity + delta;
          quantityChanged = delta;
        } else {
          throw new AppError('Must provide either delta or exactQuantity', 400);
        }

        if (newQuantity < 0) {
          throw new AppError(`Cannot adjust stock below zero. Current stock is ${previousQuantity}.`, 400);
        }

        // Update variant
        const updatedVariant = await tx.productVariant.update({
          where: { id: variantId },
          data: {
            stockQuantity: newQuantity,
            status: newQuantity === 0 ? ProductStatus.OUT_OF_STOCK : ProductStatus.ACTIVE,
          },
        });

        // Compute total parent stock
        const allVariants = await tx.productVariant.findMany({
          where: { productId: product.id },
        });
        const totalStock = allVariants.reduce((sum, v) => sum + (v.id === variantId ? newQuantity : v.stockQuantity), 0);

        // Update parent status & computed stock
        let parentStatus = product.status;
        if (totalStock === 0 && product.status === ProductStatus.ACTIVE) {
          parentStatus = ProductStatus.OUT_OF_STOCK;
        } else if (totalStock > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
          parentStatus = ProductStatus.ACTIVE;
        }

        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: totalStock,
            status: parentStatus,
          },
          include: {
            images: { orderBy: { order: 'asc' } },
            variants: { orderBy: { createdAt: 'asc' } },
          },
        });

        // Create adjustment audit log
        const adjustment = await tx.inventoryAdjustment.create({
          data: {
            productId: product.id,
            variantId: variant.id,
            vendorId: vendor.id,
            previousQuantity,
            newQuantity,
            quantityChanged,
            adjustmentType: adjustmentType as AdjustmentType,
            reason: reason || `Stock adjusted (${quantityChanged >= 0 ? '+' : ''}${quantityChanged}) for variant ${variant.sku}`,
            changedByUserId: user.id,
          },
        });

        return { product: updatedProduct, variant: updatedVariant, adjustment };
      } else {
        // Direct product stock adjustment
        previousQuantity = product.stockQuantity;

        if (exactQuantity !== undefined) {
          newQuantity = exactQuantity;
          quantityChanged = newQuantity - previousQuantity;
        } else if (delta !== undefined) {
          newQuantity = previousQuantity + delta;
          quantityChanged = delta;
        } else {
          throw new AppError('Must provide either delta or exactQuantity', 400);
        }

        if (newQuantity < 0) {
          throw new AppError(`Cannot adjust stock below zero. Current stock is ${previousQuantity}.`, 400);
        }

        let newStatus = product.status;
        if (newQuantity === 0 && product.status === ProductStatus.ACTIVE) {
          newStatus = ProductStatus.OUT_OF_STOCK;
        } else if (newQuantity > 0 && product.status === ProductStatus.OUT_OF_STOCK) {
          newStatus = ProductStatus.ACTIVE;
        }

        const updatedProduct = await tx.product.update({
          where: { id: product.id },
          data: {
            stockQuantity: newQuantity,
            status: newStatus,
          },
          include: {
            images: { orderBy: { order: 'asc' } },
            variants: { orderBy: { createdAt: 'asc' } },
          },
        });

        const adjustment = await tx.inventoryAdjustment.create({
          data: {
            productId: product.id,
            vendorId: vendor.id,
            previousQuantity,
            newQuantity,
            quantityChanged,
            adjustmentType: adjustmentType as AdjustmentType,
            reason: reason || `Stock adjusted (${quantityChanged >= 0 ? '+' : ''}${quantityChanged}) for product ${product.sku}`,
            changedByUserId: user.id,
          },
        });

        return { product: updatedProduct, adjustment };
      }
    });

    revalidatePath('/products');
    revalidatePath(`/products/${product.slug}`);
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');
    revalidatePath('/vendor/inventory');
    revalidatePath('/vendor/dashboard');

    return successResponse(updatedData);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      const appErr = err as { message: string; statusCode: number; details?: unknown };
      return errorResponse(appErr.message, appErr.statusCode, appErr.details);
    }
    console.error('Stock adjustment error:', err);
    return errorResponse('Failed to adjust stock', 500);
  }
}
