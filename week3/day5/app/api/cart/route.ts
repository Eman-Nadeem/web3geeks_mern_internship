import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';

const FLAT_SHIPPING_PER_VENDOR = 10.0;

export async function GET(req: NextRequest) {
  try {
    const user = await requireAuth();

    const cart = await prisma.cart.findUnique({
      where: { customerId: user.id },
      include: {
        items: {
          include: {
            product: {
              include: {
                images: { orderBy: { order: 'asc' } },
                vendor: {
                  select: {
                    id: true,
                    name: true,
                    slug: true,
                    logoUrl: true,
                    status: true,
                  },
                },
              },
            },
            variant: true,
          },
          orderBy: { createdAt: 'asc' },
        },
      },
    });

    if (!cart || cart.items.length === 0) {
      return successResponse({
        cartId: cart?.id || null,
        items: [],
        vendorGroups: [],
        totalItems: 0,
        subtotal: 0,
        shippingTotal: 0,
        grandTotal: 0,
      });
    }

    // Process items and group by vendor
    const vendorMap = new Map<string, {
      vendor: { id: string; name: string; slug: string; logoUrl: string | null; status: string };
      items: Array<{
        id: string;
        productId: string;
        variantId: string | null;
        productName: string;
        productSlug: string;
        sku: string;
        imageUrl: string | null;
        unitPrice: number;
        quantity: number;
        lineTotal: number;
        variantOptions: any | null;
        stockQuantity: number;
        isAvailable: boolean;
        availabilityReason?: string;
      }>;
      vendorSubtotal: number;
      shippingAmount: number;
      vendorTotal: number;
    }>();

    let totalItems = 0;
    let subtotal = 0;

    for (const item of cart.items) {
      const rawPrice = item.variant?.price ?? item.product.price;
      const livePrice = Number(rawPrice);
      const lineTotal = Number((livePrice * item.quantity).toFixed(2));
      const availableStock = item.variant ? item.variant.stockQuantity : item.product.stockQuantity;

      let isAvailable = true;
      let availabilityReason = undefined;

      if (item.product.vendor.status !== 'ACTIVE') {
        isAvailable = false;
        availabilityReason = 'VENDOR_SUSPENDED';
      } else if (item.product.status !== 'ACTIVE') {
        isAvailable = false;
        availabilityReason = 'PRODUCT_INACTIVE';
      } else if (item.variant && item.variant.status !== 'ACTIVE') {
        isAvailable = false;
        availabilityReason = 'VARIANT_UNAVAILABLE';
      } else if (availableStock < item.quantity) {
        isAvailable = false;
        availabilityReason = 'OUT_OF_STOCK';
      }

      const vendorId = item.product.vendor.id;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendor: item.product.vendor,
          items: [],
          vendorSubtotal: 0,
          shippingAmount: FLAT_SHIPPING_PER_VENDOR,
          vendorTotal: 0,
        });
      }

      const vendorGroup = vendorMap.get(vendorId)!;
      const primaryImage = item.variant?.imageUrl || item.product.images[0]?.url || null;

      vendorGroup.items.push({
        id: item.id,
        productId: item.productId,
        variantId: item.variantId,
        productName: item.product.name,
        productSlug: item.product.slug,
        sku: item.variant?.sku || item.product.sku,
        imageUrl: primaryImage,
        unitPrice: livePrice,
        quantity: item.quantity,
        lineTotal,
        variantOptions: item.variant?.options || null,
        stockQuantity: availableStock,
        isAvailable,
        availabilityReason,
      });

      vendorGroup.vendorSubtotal = Number((vendorGroup.vendorSubtotal + lineTotal).toFixed(2));
      vendorGroup.vendorTotal = Number((vendorGroup.vendorSubtotal + vendorGroup.shippingAmount).toFixed(2));

      totalItems += item.quantity;
      subtotal = Number((subtotal + lineTotal).toFixed(2));
    }

    const vendorGroups = Array.from(vendorMap.values());
    const shippingTotal = Number((vendorGroups.length * FLAT_SHIPPING_PER_VENDOR).toFixed(2));
    const grandTotal = Number((subtotal + shippingTotal).toFixed(2));

    return successResponse({
      cartId: cart.id,
      items: cart.items,
      vendorGroups,
      totalItems,
      subtotal,
      shippingTotal,
      grandTotal,
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error fetching cart:', error);
    return errorResponse('Failed to retrieve shopping cart.', 500);
  }
}

export async function DELETE(req: NextRequest) {
  try {
    const user = await requireAuth();

    const cart = await prisma.cart.findUnique({
      where: { customerId: user.id },
    });

    if (cart) {
      await prisma.cartItem.deleteMany({
        where: { cartId: cart.id },
      });
    }

    return successResponse({ message: 'Cart cleared successfully.' }, 200);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error clearing cart:', error);
    return errorResponse('Failed to clear cart.', 500);
  }
}
