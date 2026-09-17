import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { productUpdateSchema } from '@/lib/validations';
import { requireVendor, assertProductOwnership, errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus } from '@prisma/client';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vendor } = await requireVendor();

    const product = await assertProductOwnership(id, vendor.id);

    return successResponse(product);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to get vendor product:', err);
    return errorResponse('Failed to retrieve product', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vendor } = await requireVendor(['ACTIVE', 'PENDING']);

    // Ensure product belongs to authenticated vendor (403 otherwise)
    const existing = await assertProductOwnership(id, vendor.id);

    const body = await req.json();
    const result = productUpdateSchema.safeParse(body);

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

    // Check duplicate SKUs in provided variants array
    if (variants && variants.length > 0) {
      const skus = variants.map((v) => v.sku.trim().toLowerCase());
      const duplicateSku = skus.find((s, index) => skus.indexOf(s) !== index);
      if (duplicateSku) {
        return errorResponse('Validation failed', 409, {
          variants: [`Duplicate variant SKU "${duplicateSku}" provided for this product.`],
        });
      }
    }

    // Check slug uniqueness if changed
    if (slug && slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: { slug },
      });
      if (slugConflict) {
        return errorResponse('Validation failed', 409, {
          slug: ['A product with this slug already exists.'],
        });
      }
    }

    // Check SKU uniqueness if changed
    if (sku && sku !== existing.sku) {
      const skuConflict = await prisma.product.findUnique({
        where: {
          vendorId_sku: {
            vendorId: vendor.id,
            sku,
          },
        },
      });
      if (skuConflict) {
        return errorResponse('Validation failed', 409, {
          sku: [`A product with SKU "${sku}" already exists in your store.`],
        });
      }
    }

    const updated = await prisma.$transaction(async (tx) => {
      // Handle images update if provided
      if (images !== undefined || imageUrl !== undefined) {
        let finalImages = images ? [...images] : [];
        if (imageUrl && !finalImages.some((img) => img.url === imageUrl)) {
          finalImages.unshift({ url: imageUrl, isPrimary: true, order: 0 });
        }

        // Enforce exactly one primary image
        if (finalImages.length > 0) {
          const primaryCount = finalImages.filter((img) => img.isPrimary).length;
          if (primaryCount === 0) {
            finalImages[0].isPrimary = true;
          } else if (primaryCount > 1) {
            let firstPrimary = false;
            for (const img of finalImages) {
              if (img.isPrimary) {
                if (!firstPrimary) firstPrimary = true;
                else img.isPrimary = false;
              }
            }
          }
        }

        // Replace images atomically
        await tx.productImage.deleteMany({ where: { productId: id } });
        if (finalImages.length > 0) {
          await tx.productImage.createMany({
            data: finalImages.map((img, idx) => ({
              productId: id,
              url: img.url,
              isPrimary: img.isPrimary ?? idx === 0,
              order: img.order ?? idx,
            })),
          });
        }
      }

      // Handle variants update if provided
      if (variants !== undefined) {
        await tx.productVariant.deleteMany({ where: { productId: id } });
        if (variants.length > 0) {
          await tx.productVariant.createMany({
            data: variants.map((v) => ({
              productId: id,
              sku: v.sku,
              options: v.options,
              price: v.price ?? null,
              stockQuantity: v.stockQuantity,
              imageUrl: v.imageUrl ?? null,
              status: vendor.status === 'PENDING' ? ProductStatus.DRAFT : (v.status || ProductStatus.ACTIVE),
            })),
          });
        }
      }

      // Compute total stock if variants provided
      let effectiveStock = stockQuantity;
      if (variants !== undefined && variants.length > 0) {
        effectiveStock = variants.reduce((sum, v) => sum + (v.stockQuantity || 0), 0);
      }

      let effectiveStatus = status;
      if (vendor.status === 'PENDING') {
        effectiveStatus = ProductStatus.DRAFT;
      } else if (effectiveStock === 0 && (status === ProductStatus.ACTIVE || (!status && existing.status === ProductStatus.ACTIVE))) {
        effectiveStatus = ProductStatus.OUT_OF_STOCK;
      }

      const updatedProduct = await tx.product.update({
        where: { id },
        data: {
          ...(name ? { name } : {}),
          ...(slug ? { slug } : {}),
          ...(sku ? { sku } : {}),
          ...(description ? { description } : {}),
          ...(price !== undefined ? { price } : {}),
          ...(compareAtPrice !== undefined ? { compareAtPrice } : {}),
          ...(effectiveStock !== undefined ? { stockQuantity: effectiveStock } : {}),
          ...(lowStockThreshold !== undefined ? { lowStockThreshold } : {}),
          ...(category ? { category } : {}),
          ...(effectiveStatus ? { status: effectiveStatus } : {}),
        },
        include: {
          images: { orderBy: { order: 'asc' } },
          variants: { orderBy: { createdAt: 'asc' } },
        },
      });

      return updatedProduct;
    });

    revalidatePath('/products');
    revalidatePath(`/products/${updated.slug}`);
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');
    revalidatePath('/vendor/inventory');
    revalidatePath('/vendor/dashboard');

    return successResponse(updated);
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
    console.error('Failed to update product:', err);
    return errorResponse('Failed to update product', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const { vendor } = await requireVendor(['ACTIVE', 'PENDING']);
    const { searchParams } = new URL(req.url);
    const permanent = searchParams.get('permanent') === 'true';

    // Verify ownership
    const product = await assertProductOwnership(id, vendor.id);

    if (permanent) {
      // Hard delete
      await prisma.product.delete({ where: { id } });
    } else {
      // Marketplace-standard soft delete / archive
      await prisma.product.update({
        where: { id },
        data: { status: ProductStatus.ARCHIVED },
      });
    }

    revalidatePath('/products');
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');
    revalidatePath('/vendor/inventory');
    revalidatePath('/vendor/dashboard');

    return successResponse({
      message: permanent ? 'Product permanently deleted' : 'Product archived successfully',
      status: permanent ? 'DELETED' : 'ARCHIVED',
    });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Failed to delete product:', err);
    return errorResponse('Failed to delete product', 500);
  }
}
