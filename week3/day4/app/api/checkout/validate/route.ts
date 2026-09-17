import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';

const FLAT_SHIPPING_PER_VENDOR = 10.0;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();

    // Check if client provided custom items to validate or if we should read from user's DB cart
    let itemsToValidate: Array<{
      id?: string;
      productId: string;
      variantId?: string | null;
      quantity: number;
      expectedPrice?: number;
    }> = [];

    const body = await req.json().catch(() => ({}));
    if (body.items && Array.isArray(body.items) && body.items.length > 0) {
      itemsToValidate = body.items;
    } else {
      const cart = await prisma.cart.findUnique({
        where: { customerId: user.id },
        include: { items: true },
      });

      if (!cart || cart.items.length === 0) {
        return successResponse({
          isValid: false,
          error: 'Shopping cart is empty.',
          validItems: [],
          invalidItems: [],
          summary: {
            subtotal: 0,
            shippingTotal: 0,
            grandTotal: 0,
            perVendorSummary: [],
          },
        });
      }

      itemsToValidate = cart.items.map((i) => ({
        id: i.id,
        productId: i.productId,
        variantId: i.variantId,
        quantity: i.quantity,
      }));
    }

    const validItems: any[] = [];
    const invalidItems: any[] = [];
    const vendorMap = new Map<string, {
      vendorId: string;
      vendorName: string;
      subtotal: number;
      shippingAmount: number;
      total: number;
      itemsCount: number;
    }>();

    let subtotal = 0;

    for (const item of itemsToValidate) {
      const product = await prisma.product.findUnique({
        where: { id: item.productId },
        include: {
          vendor: true,
          variants: true,
          images: { orderBy: { order: 'asc' } },
        },
      });

      if (!product) {
        invalidItems.push({
          productId: item.productId,
          variantId: item.variantId,
          reason: 'PRODUCT_INACTIVE',
          message: 'Product could not be found or has been removed.',
        });
        continue;
      }

      if (product.vendor.status !== 'ACTIVE') {
        invalidItems.push({
          productId: product.id,
          productName: product.name,
          vendorName: product.vendor.name,
          reason: 'VENDOR_SUSPENDED',
          message: `Vendor "${product.vendor.name}" is currently suspended or inactive.`,
        });
        continue;
      }

      if (product.status !== 'ACTIVE') {
        invalidItems.push({
          productId: product.id,
          productName: product.name,
          reason: 'PRODUCT_INACTIVE',
          message: `Product "${product.name}" is not currently available for purchase.`,
        });
        continue;
      }

      let selectedVariant = null;
      let availableStock = product.stockQuantity;
      let currentPrice = product.price;
      let sku = product.sku;

      if (item.variantId) {
        selectedVariant = product.variants.find((v) => v.id === item.variantId);
        if (!selectedVariant || selectedVariant.status !== 'ACTIVE') {
          invalidItems.push({
            productId: product.id,
            variantId: item.variantId,
            productName: product.name,
            reason: 'VARIANT_UNAVAILABLE',
            message: `Selected variant for "${product.name}" is unavailable.`,
          });
          continue;
        }
        availableStock = selectedVariant.stockQuantity;
        if (selectedVariant.price != null) {
          currentPrice = selectedVariant.price;
        }
        sku = selectedVariant.sku;
      }

      if (availableStock < item.quantity) {
        invalidItems.push({
          productId: product.id,
          variantId: item.variantId,
          productName: product.name,
          requestedQuantity: item.quantity,
          availableStock,
          reason: 'OUT_OF_STOCK',
          message: availableStock > 0
            ? `Only ${availableStock} units of "${product.name}" remaining.`
            : `"${product.name}" is out of stock.`,
        });
        continue;
      }

      // Check if price changed from what frontend submitted
      if (item.expectedPrice !== undefined && item.expectedPrice !== currentPrice) {
        invalidItems.push({
          productId: product.id,
          variantId: item.variantId,
          productName: product.name,
          expectedPrice: item.expectedPrice,
          currentPrice,
          reason: 'PRICE_CHANGED',
          message: `Price for "${product.name}" updated to $${currentPrice.toFixed(2)}.`,
        });
        continue;
      }

      const lineTotal = Number((currentPrice * item.quantity).toFixed(2));
      subtotal = Number((subtotal + lineTotal).toFixed(2));

      // Group per vendor
      const vendorId = product.vendor.id;
      if (!vendorMap.has(vendorId)) {
        vendorMap.set(vendorId, {
          vendorId,
          vendorName: product.vendor.name,
          subtotal: 0,
          shippingAmount: FLAT_SHIPPING_PER_VENDOR,
          total: 0,
          itemsCount: 0,
        });
      }

      const vGroup = vendorMap.get(vendorId)!;
      vGroup.subtotal = Number((vGroup.subtotal + lineTotal).toFixed(2));
      vGroup.total = Number((vGroup.subtotal + vGroup.shippingAmount).toFixed(2));
      vGroup.itemsCount += item.quantity;

      validItems.push({
        id: item.id,
        productId: product.id,
        variantId: item.variantId || null,
        vendorId: product.vendor.id,
        vendorName: product.vendor.name,
        productName: product.name,
        sku,
        unitPrice: currentPrice,
        quantity: item.quantity,
        lineTotal,
        variantOptions: selectedVariant?.options || null,
        imageUrl: selectedVariant?.imageUrl || product.images[0]?.url || null,
        availableStock,
      });
    }

    const perVendorSummary = Array.from(vendorMap.values());
    const shippingTotal = Number((perVendorSummary.length * FLAT_SHIPPING_PER_VENDOR).toFixed(2));
    const grandTotal = Number((subtotal + shippingTotal).toFixed(2));

    return successResponse({
      isValid: invalidItems.length === 0 && validItems.length > 0,
      validItems,
      invalidItems,
      summary: {
        subtotal,
        shippingTotal,
        grandTotal,
        perVendorSummary,
      },
    });
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error validating checkout:', error);
    return errorResponse('Failed to validate checkout items.', 500);
  }
}
