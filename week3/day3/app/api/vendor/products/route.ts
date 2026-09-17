import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { productCreateSchema } from '@/lib/validations';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus, AdjustmentType, VendorStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { vendor } = await requireVendor();
    const { searchParams } = new URL(req.url);

    const search = searchParams.get('search')?.trim();
    const category = searchParams.get('category');
    const status = searchParams.get('status');
    const availability = searchParams.get('availability');
    const sort = searchParams.get('sort') || 'newest';

    const where: Prisma.ProductWhereInput = {
      vendorId: vendor.id,
    };

    if (status && status !== 'ALL') {
      where.status = status as ProductStatus;
    }

    if (category && category !== 'ALL') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { sku: { contains: search, mode: 'insensitive' } },
      ];
    }

    if (availability === 'in_stock') {
      where.stockQuantity = { gt: 0 };
    } else if (availability === 'out_of_stock') {
      where.OR = [
        { stockQuantity: 0 },
        { status: ProductStatus.OUT_OF_STOCK },
      ];
    } else if (availability === 'low_stock') {
      where.stockQuantity = { gt: 0 };
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (sort === 'stock_asc') {
      orderBy = { stockQuantity: 'asc' };
    } else if (sort === 'stock_desc') {
      orderBy = { stockQuantity: 'desc' };
    }

    let products = await prisma.product.findMany({
      where,
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { orderBy: { createdAt: 'asc' } },
      },
      orderBy,
    });

    if (availability === 'low_stock') {
      products = products.filter((p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold);
    }

    return successResponse(products);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to list vendor products:', err);
    return errorResponse('Failed to retrieve products', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    const { user, vendor } = await requireVendor(['ACTIVE', 'PENDING']);

    const body = await req.json();
    const result = productCreateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const {
      name,
      slug,
      sku,
      description,
      price,
      compareAtPrice,
      stockQuantity,
      lowStockThreshold,
      category,
      status,
      images,
      variants,
      imageUrl,
    } = result.data;

    // Pre-validate duplicate SKUs in the incoming variants array
    if (variants && variants.length > 0) {
      const skus = variants.map((v) => v.sku.trim().toLowerCase());
      const duplicateSku = skus.find((s, index) => skus.indexOf(s) !== index);
      if (duplicateSku) {
        return errorResponse('Validation failed', 409, {
          variants: [`Duplicate variant SKU "${duplicateSku}" provided for this product.`],
        });
      }
    }

    // Check slug uniqueness globally
    const existingSlug = await prisma.product.findUnique({
      where: { slug },
    });
    if (existingSlug) {
      return errorResponse('Validation failed', 409, {
        slug: ['A product with this slug already exists. Please choose a unique slug.'],
      });
    }

    // Check SKU uniqueness per vendor
    const existingSku = await prisma.product.findUnique({
      where: {
        vendorId_sku: {
          vendorId: vendor.id,
          sku,
        },
      },
    });
    if (existingSku) {
      return errorResponse('Validation failed', 409, {
        sku: [`A product with SKU "${sku}" already exists in your inventory.`],
      });
    }

    // Process images list
    const finalImages = [...(images || [])];
    if (imageUrl && !finalImages.some((img) => img.url === imageUrl)) {
      finalImages.unshift({
        url: imageUrl,
        isPrimary: true,
        order: 0,
      });
    }

    // Ensure exactly one primary image
    if (finalImages.length > 0) {
      const primaryCount = finalImages.filter((img) => img.isPrimary).length;
      if (primaryCount === 0) {
        finalImages[0].isPrimary = true;
      } else if (primaryCount > 1) {
        let firstPrimarySet = false;
        for (const img of finalImages) {
          if (img.isPrimary) {
            if (!firstPrimarySet) {
              firstPrimarySet = true;
            } else {
              img.isPrimary = false;
            }
          }
        }
      }
    }

    // Compute total stock if variants exist
    let effectiveStock = stockQuantity;
    if (variants && variants.length > 0) {
      effectiveStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
    }

    // If vendor is PENDING, product is strictly forced to DRAFT status until vendor approval
    let effectiveStatus = status;
    if (vendor.status === VendorStatus.PENDING) {
      effectiveStatus = ProductStatus.DRAFT;
    } else if (effectiveStock === 0 && status === ProductStatus.ACTIVE) {
      effectiveStatus = ProductStatus.OUT_OF_STOCK;
    }

    // Atomic creation via transaction
    const product = await prisma.$transaction(async (tx) => {
      const createdProduct = await tx.product.create({
        data: {
          name,
          slug,
          sku,
          description,
          price,
          compareAtPrice: compareAtPrice || null,
          stockQuantity: effectiveStock,
          lowStockThreshold: lowStockThreshold ?? 5,
          category,
          status: effectiveStatus,
          vendorId: vendor.id,
          images: {
            create: finalImages.map((img, index) => ({
              url: img.url,
              isPrimary: img.isPrimary ?? index === 0,
              order: img.order ?? index,
            })),
          },
          variants: {
            create: (variants || []).map((variant) => ({
              sku: variant.sku,
              options: variant.options,
              price: variant.price || null,
              stockQuantity: variant.stockQuantity,
              imageUrl: variant.imageUrl || null,
              status: vendor.status === VendorStatus.PENDING ? ProductStatus.DRAFT : (variant.status || ProductStatus.ACTIVE),
            })),
          },
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          variants: { orderBy: { createdAt: 'asc' } },
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
      });

      // Write initial inventory adjustment if stock exists
      if (effectiveStock > 0) {
        await tx.inventoryAdjustment.create({
          data: {
            productId: createdProduct.id,
            vendorId: vendor.id,
            previousQuantity: 0,
            newQuantity: effectiveStock,
            quantityChanged: effectiveStock,
            adjustmentType: AdjustmentType.RESTOCK,
            reason: 'Initial product intake',
            changedByUserId: user.id,
          },
        });
      }

      return createdProduct;
    });

    revalidatePath('/products');
    revalidatePath(`/products/${product.slug}`);
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');
    revalidatePath('/vendor/inventory');
    revalidatePath('/vendor/dashboard');

    return successResponse(product, 201);
  } catch (err: unknown) {
    if (err && typeof err === 'object') {
      if ('code' in err && (err as { code: string }).code === 'P2002') {
        const target = (err as { meta?: { target?: string[] | string } }).meta?.target;
        const targetStr = Array.isArray(target) ? target.join(', ') : String(target || '');
        if (targetStr.includes('sku') || targetStr.includes('ProductVariant')) {
          return errorResponse('Validation failed', 409, {
            sku: ['A variant with this SKU already exists for this product.'],
          });
        }
        if (targetStr.includes('slug')) {
          return errorResponse('Validation failed', 409, {
            slug: ['A product with this slug already exists.'],
          });
        }
        return errorResponse('A unique constraint was violated.', 409);
      }

      if ('statusCode' in err && 'message' in err) {
        const appErr = err as { message: string; statusCode: number; details?: unknown };
        return errorResponse(appErr.message, appErr.statusCode, appErr.details);
      }
    }
    console.error('Product creation error:', err);
    return errorResponse('Failed to create product', 500);
  }
}
