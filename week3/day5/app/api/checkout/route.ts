import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { requireAuth, successResponse, errorResponse, AppError } from '@/lib/guards';
import { checkoutSchema } from '@/lib/validations';

const FLAT_SHIPPING_PER_VENDOR = 10.0;

export async function POST(req: NextRequest) {
  try {
    const user = await requireAuth();
    const body = await req.json();

    const parseResult = checkoutSchema.safeParse(body);
    if (!parseResult.success) {
      return errorResponse('Invalid shipping or checkout details.', 400, parseResult.error.flatten().fieldErrors);
    }

    const {
      shippingName,
      shippingEmail,
      shippingPhone,
      shippingAddress,
      shippingCity,
      shippingPostalCode,
      paymentMethod,
    } = parseResult.data;

    // Run the entire multi-vendor order creation inside an atomic transaction with increased timeout
    const completedOrder = await prisma.$transaction(
      async (tx) => {
        // 1. Fetch user's cart items
        const cart = await tx.cart.findUnique({
          where: { customerId: user.id },
          include: {
            items: true,
          },
        });

        if (!cart || cart.items.length === 0) {
          throw new AppError('Your shopping cart is empty. Please add items before checking out.', 400);
        }

        // 2. Perform strictly isolated real-time validation inside the transaction
        const processedItems: Array<{
          cartItemId: string;
          productId: string;
          variantId: string | null;
          vendorId: string;
          vendorName: string;
          productName: string;
          sku: string;
          unitPrice: number;
          quantity: number;
          lineTotal: number;
          variantOptions: any | null;
          productStock: number;
          variantStock?: number;
        }> = [];

        for (const item of cart.items) {
          const product = await tx.product.findUnique({
            where: { id: item.productId },
            include: {
              vendor: true,
              variants: true,
            },
          });

          if (!product) {
            throw new AppError(`Product with ID "${item.productId}" no longer exists.`, 400);
          }

          if (product.vendor.status !== 'ACTIVE') {
            throw new AppError(`Vendor "${product.vendor.name}" is currently suspended or inactive. Checkout aborted.`, 400);
          }

          if (product.status !== 'ACTIVE') {
            throw new AppError(`Product "${product.name}" is no longer active for purchase.`, 400);
          }

          let liveUnitPrice = Number(product.price);
          let sku = product.sku;
          let selectedVariant = null;

          if (item.variantId) {
            selectedVariant = product.variants?.find((v: any) => v.id === item.variantId);
            if (!selectedVariant || selectedVariant.status !== 'ACTIVE') {
              throw new AppError(`Selected variant for product "${product.name}" is unavailable.`, 400);
            }
            if (selectedVariant.stockQuantity < item.quantity) {
              throw new AppError(
                `Insufficient stock for "${product.name}" (variant SKU: ${selectedVariant.sku}). Available: ${selectedVariant.stockQuantity}, Requested: ${item.quantity}.`,
                400
              );
            }
            if (selectedVariant.price != null) {
              liveUnitPrice = Number(selectedVariant.price);
            }
            sku = selectedVariant.sku;
          } else {
            if (product.stockQuantity < item.quantity) {
              throw new AppError(`Insufficient stock for "${product.name}". Available: ${product.stockQuantity}, Requested: ${item.quantity}.`, 400);
            }
          }

          const lineTotal = Number((liveUnitPrice * item.quantity).toFixed(2));

          processedItems.push({
            cartItemId: item.id,
            productId: product.id,
            variantId: item.variantId || null,
            vendorId: product.vendor.id,
            vendorName: product.vendor.name,
            productName: product.name,
            sku,
            unitPrice: liveUnitPrice,
            quantity: item.quantity,
            lineTotal,
            variantOptions: selectedVariant?.options || null,
            productStock: product.stockQuantity,
            variantStock: selectedVariant ? selectedVariant.stockQuantity : undefined,
          });
        }

        // 3. Group items by vendor
        const vendorItemsMap = new Map<string, typeof processedItems>();
        for (const item of processedItems) {
          if (!vendorItemsMap.has(item.vendorId)) {
            vendorItemsMap.set(item.vendorId, []);
          }
          vendorItemsMap.get(item.vendorId)!.push(item);
        }

        // Sort vendor IDs deterministically
        const sortedVendorIds = Array.from(vendorItemsMap.keys()).sort((a, b) => {
          const nameA = vendorItemsMap.get(a)![0].vendorName;
          const nameB = vendorItemsMap.get(b)![0].vendorName;
          return nameA.localeCompare(nameB);
        });

        // Compute total amounts
        let subtotal = 0;
        let shippingTotal = Number((sortedVendorIds.length * FLAT_SHIPPING_PER_VENDOR).toFixed(2));

        for (const item of processedItems) {
          subtotal = Number((subtotal + item.lineTotal).toFixed(2));
        }
        const totalAmount = Number((subtotal + shippingTotal).toFixed(2));

        // 4. Generate unique parent order number
        const orderCount = await tx.order.count();
        const orderNumber = `#${1001 + orderCount}`;

        // 5. Create Parent Order
        const parentOrder = await tx.order.create({
          data: {
            orderNumber,
            customerId: user.id,
            totalAmount,
            paymentMethod: paymentMethod || 'MOCK_GATEWAY',
            paymentStatus: 'PENDING',
            shippingName,
            shippingEmail,
            shippingPhone,
            shippingAddress,
            shippingCity,
            shippingPostalCode: shippingPostalCode || null,
            status: 'PENDING',
          },
        });

        // 6. Create VendorOrders and snapshot OrderItems
        for (let i = 0; i < sortedVendorIds.length; i++) {
          const vendorId = sortedVendorIds[i];
          const vItems = vendorItemsMap.get(vendorId)!;
          const vendorSubtotal = Number(vItems.reduce((acc, it) => acc + it.lineTotal, 0).toFixed(2));
          const vendorShipping = FLAT_SHIPPING_PER_VENDOR;
          const vendorTotal = Number((vendorSubtotal + vendorShipping).toFixed(2));

          // Deterministic suffix: #1001-A, #1001-B, etc.
          const suffix = String.fromCharCode(65 + (i % 26)) + (i >= 26 ? Math.floor(i / 26) : '');
          const vendorOrderNumber = `${orderNumber}-${suffix}`;

          const vendorOrder = await tx.vendorOrder.create({
            data: {
              vendorOrderNumber,
              orderId: parentOrder.id,
              vendorId,
              subtotal: vendorSubtotal,
              shippingAmount: vendorShipping,
              total: vendorTotal,
              status: 'PENDING',
            },
          });

          // Create OrderItems under this VendorOrder
          for (const it of vItems) {
            await tx.orderItem.create({
              data: {
                vendorOrderId: vendorOrder.id,
                productId: it.productId,
                variantId: it.variantId,
                productNameSnapshot: it.productName,
                skuSnapshot: it.sku,
                unitPriceSnapshot: it.unitPrice,
                quantity: it.quantity,
                variantOptionsSnapshot: it.variantOptions,
                lineTotal: it.lineTotal,
              },
            });
          }
        }

        // 7. Conditional atomic stock deduction & inventory audit logging
        for (const it of processedItems) {
          if (it.variantId && it.variantStock !== undefined) {
            // Conditional atomic decrement on ProductVariant
            const updatedVariant = await tx.productVariant.updateMany({
              where: {
                id: it.variantId,
                stockQuantity: { gte: it.quantity },
              },
              data: {
                stockQuantity: { decrement: it.quantity },
              },
            });

            if (updatedVariant.count === 0) {
              throw new AppError(`Insufficient stock for variant SKU "${it.sku}". Transaction aborted.`, 400);
            }

            // Conditional atomic decrement on Product
            const updatedProduct = await tx.product.updateMany({
              where: {
                id: it.productId,
                stockQuantity: { gte: it.quantity },
              },
              data: {
                stockQuantity: { decrement: it.quantity },
              },
            });

            if (updatedProduct.count === 0) {
              throw new AppError(`Insufficient stock for product "${it.productName}". Transaction aborted.`, 400);
            }

            // Check if variant / product transitioned to out of stock
            const freshVariant = await tx.productVariant.findUnique({
              where: { id: it.variantId },
              select: { stockQuantity: true },
            });

            if (freshVariant && freshVariant.stockQuantity === 0) {
              await tx.productVariant.update({
                where: { id: it.variantId },
                data: { status: 'OUT_OF_STOCK' },
              });
            }

            const freshProduct = await tx.product.findUnique({
              where: { id: it.productId },
              select: { stockQuantity: true },
            });

            if (freshProduct && freshProduct.stockQuantity === 0) {
              await tx.product.update({
                where: { id: it.productId },
                data: { status: 'OUT_OF_STOCK' },
              });
            }

            const newVarStock = freshVariant?.stockQuantity ?? 0;
            await tx.inventoryAdjustment.create({
              data: {
                productId: it.productId,
                variantId: it.variantId,
                vendorId: it.vendorId,
                previousQuantity: newVarStock + it.quantity,
                newQuantity: newVarStock,
                quantityChanged: -it.quantity,
                adjustmentType: 'SALE',
                reason: `Sale checkout Order ${parentOrder.orderNumber}`,
                changedByUserId: user.id,
              },
            });
          } else {
            // Conditional atomic decrement on Product
            const updatedProduct = await tx.product.updateMany({
              where: {
                id: it.productId,
                stockQuantity: { gte: it.quantity },
              },
              data: {
                stockQuantity: { decrement: it.quantity },
              },
            });

            if (updatedProduct.count === 0) {
              throw new AppError(`Insufficient stock for product "${it.productName}". Transaction aborted.`, 400);
            }

            const freshProduct = await tx.product.findUnique({
              where: { id: it.productId },
              select: { stockQuantity: true },
            });

            if (freshProduct && freshProduct.stockQuantity === 0) {
              await tx.product.update({
                where: { id: it.productId },
                data: { status: 'OUT_OF_STOCK' },
              });
            }

            const newProdStock = freshProduct?.stockQuantity ?? 0;
            await tx.inventoryAdjustment.create({
              data: {
                productId: it.productId,
                vendorId: it.vendorId,
                previousQuantity: newProdStock + it.quantity,
                newQuantity: newProdStock,
                quantityChanged: -it.quantity,
                adjustmentType: 'SALE',
                reason: `Sale checkout Order ${parentOrder.orderNumber}`,
                changedByUserId: user.id,
              },
            });
          }
        }

        // 8. Clear customer's cart
        await tx.cartItem.deleteMany({
          where: { cartId: cart.id },
        });

        // 9. Return the full parent order with vendor orders and items
        return await tx.order.findUnique({
          where: { id: parentOrder.id },
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
            },
          },
        });
      },
      {
        maxWait: 15000,
        timeout: 25000,
      }
    );

    return successResponse(completedOrder, 201);
  } catch (error: any) {
    if (error instanceof AppError) {
      return errorResponse(error.message, error.statusCode, error.details);
    }
    console.error('Error during checkout transaction:', error);
    return errorResponse(error.message || 'Checkout failed due to a server error.', 500);
  }
}
