import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';
import { cartItemAddSchema } from '@/lib/validations';

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const parseResult = cartItemAddSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid cart item data.', 400, parseResult.error.flatten().fieldErrors);
    }

    const { productId, variantId, quantity } = parseResult.data;

    // Fetch product with vendor and variants
    const product = await prisma.product.findUnique({
      where: { id: productId },
      include: {
        vendor: true,
        variants: true,
      },
    });

    if (!product) {
      throw new AppError('Product not found.', 404);
    }

    if (product.vendor.status !== 'ACTIVE') {
      throw new AppError('This vendor is currently unavailable or suspended.', 400);
    }

    if (product.status !== 'ACTIVE') {
      throw new AppError('This product is currently inactive or out of stock.', 400);
    }

    let availableStock = product.stockQuantity;
    let selectedVariant = null;

    if (variantId) {
      selectedVariant = product.variants.find((v) => v.id === variantId);
      if (!selectedVariant) {
        throw new AppError('Specified product variant does not exist.', 404);
      }
      if (selectedVariant.status !== 'ACTIVE') {
        throw new AppError('This product variant is currently unavailable.', 400);
      }
      availableStock = selectedVariant.stockQuantity;
    }

    if (availableStock <= 0) {
      throw new AppError('This product is currently out of stock.', 400);
    }

    if (quantity > availableStock) {
      throw new AppError(`Cannot add ${quantity} units. Only ${availableStock} units available in stock.`, 400);
    }

    // Lazy find or create user's cart
    let cart = await prisma.cart.findUnique({
      where: { customerId: user.id },
    });

    if (!cart) {
      cart = await prisma.cart.create({
        data: { customerId: user.id },
      });
    }

    // Check for existing cart item
    const existingItem = await prisma.cartItem.findFirst({
      where: {
        cartId: cart.id,
        productId: product.id,
        variantId: variantId || null,
      },
    });

    let resultItem;
    if (existingItem) {
      const newQuantity = existingItem.quantity + quantity;
      if (newQuantity > availableStock) {
        throw new AppError(`Cannot update cart. Total quantity (${newQuantity}) exceeds available stock (${availableStock}).`, 400);
      }

      resultItem = await prisma.cartItem.update({
        where: { id: existingItem.id },
        data: { quantity: newQuantity },
        include: {
          product: true,
          variant: true,
        },
      });
    } else {
      resultItem = await prisma.cartItem.create({
        data: {
          cartId: cart.id,
          productId: product.id,
          variantId: variantId || null,
          vendorId: product.vendorId,
          quantity,
        },
        include: {
          product: true,
          variant: true,
        },
      });
    }

    return successResponse(resultItem, 201);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error adding item to cart:', error);
    return errorResponse('Failed to add item to cart.', 500);
  }
}
