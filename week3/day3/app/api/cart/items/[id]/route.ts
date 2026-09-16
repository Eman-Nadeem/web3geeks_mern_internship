import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';
import { cartItemUpdateSchema } from '@/lib/validations';

interface RouteContext {
  params: Promise<{ id: string }>;
}

export async function PATCH(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id: itemId } = await context.params;
    const body = await req.json();

    const parseResult = cartItemUpdateSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid quantity.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { quantity } = parseResult.data;

    // Find cart item ensuring it belongs to current user's cart
    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
        product: {
          include: {
            vendor: true,
            variants: true,
          },
        },
        variant: true,
      },
    });

    if (!cartItem) {
      throw new AppError('Cart item not found.', 404);
    }

    if (cartItem.cart.customerId !== user.id) {
      throw new AppError('Forbidden: You do not own this cart item.', 403);
    }

    // Verify stock availability
    const availableStock = cartItem.variant ? cartItem.variant.stockQuantity : cartItem.product.stockQuantity;

    if (cartItem.product.vendor.status !== 'ACTIVE') {
      throw new AppError('This vendor is currently unavailable.', 400);
    }

    if (cartItem.product.status !== 'ACTIVE') {
      throw new AppError('This product is currently unavailable.', 400);
    }

    if (cartItem.variant && cartItem.variant.status !== 'ACTIVE') {
      throw new AppError('This product variant is currently unavailable.', 400);
    }

    if (quantity > availableStock) {
      throw new AppError(`Cannot update quantity. Only ${availableStock} units available in stock.`, 400);
    }

    const updatedItem = await prisma.cartItem.update({
      where: { id: itemId },
      data: { quantity },
      include: {
        product: true,
        variant: true,
      },
    });

    return successResponse(updatedItem);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error updating cart item:', error);
    return errorResponse('Failed to update cart item.', 500);
  }
}

export async function DELETE(req: NextRequest, context: RouteContext) {
  try {
    const user = await requireAuth();
    const { id: itemId } = await context.params;

    const cartItem = await prisma.cartItem.findUnique({
      where: { id: itemId },
      include: {
        cart: true,
      },
    });

    if (!cartItem) {
      throw new AppError('Cart item not found.', 404);
    }

    if (cartItem.cart.customerId !== user.id) {
      throw new AppError('Forbidden: You do not own this cart item.', 403);
    }

    await prisma.cartItem.delete({
      where: { id: itemId },
    });

    return successResponse({ message: 'Item removed from cart.' });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error removing cart item:', error);
    return errorResponse('Failed to remove cart item.', 500);
  }
}
