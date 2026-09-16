import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { productUpdateSchema } from '@/lib/validations';
import { requireVendor, assertProductOwnership, errorResponse, successResponse } from '@/lib/guards';

export async function GET(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    const product = await prisma.product.findUnique({
      where: { id },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            status: true,
          },
        },
      },
    });

    if (!product) {
      return errorResponse('Product not found', 404);
    }

    // Hide inactive product or product from non-active vendor from public view
    if (product.status !== 'ACTIVE' || product.vendor.status !== 'ACTIVE') {
      return errorResponse('Product not found', 404);
    }

    return successResponse(product);
  } catch (err) {
    console.error('Failed to get product:', err);
    return errorResponse('Failed to retrieve product', 500);
  }
}

export async function PATCH(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Strictly derive vendor from authenticated user
    const { vendor } = await requireVendor();

    // Verify ownership: vendor can ONLY edit their own product (403 otherwise)
    const existing = await assertProductOwnership(id, vendor.id);

    const body = await req.json();
    const result = productUpdateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    // Check slug uniqueness if slug changed
    if (result.data.slug && result.data.slug !== existing.slug) {
      const slugConflict = await prisma.product.findUnique({
        where: {
          vendorId_slug: {
            vendorId: vendor.id,
            slug: result.data.slug,
          },
        },
      });

      if (slugConflict) {
        return errorResponse('A product with this slug already exists in your store.', 409);
      }
    }

    const updated = await prisma.product.update({
      where: { id },
      data: {
        ...(result.data.name ? { name: result.data.name } : {}),
        ...(result.data.slug ? { slug: result.data.slug } : {}),
        ...(result.data.description ? { description: result.data.description } : {}),
        ...(result.data.price !== undefined ? { price: result.data.price } : {}),
        ...(result.data.stock !== undefined ? { stock: result.data.stock } : {}),
        ...(result.data.category ? { category: result.data.category } : {}),
        ...(result.data.imageUrl !== undefined ? { imageUrl: result.data.imageUrl || null } : {}),
        ...(result.data.status ? { status: result.data.status } : {}),
      },
    });

    revalidatePath('/products');
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');

    return successResponse(updated);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Product update error:', err);
    return errorResponse('Failed to update product', 500);
  }
}

export async function DELETE(
  req: NextRequest,
  { params }: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await params;
    // Derive vendor from authenticated user
    const { vendor } = await requireVendor();

    // Verify ownership: vendor can ONLY delete their own product (403 otherwise)
    await assertProductOwnership(id, vendor.id);

    await prisma.product.delete({
      where: { id },
    });

    revalidatePath('/products');
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');

    return successResponse({ message: 'Product deleted successfully' });
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Product deletion error:', err);
    return errorResponse('Failed to delete product', 500);
  }
}
