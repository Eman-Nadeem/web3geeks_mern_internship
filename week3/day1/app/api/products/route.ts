import { NextRequest } from 'next/server';
import { revalidatePath } from 'next/cache';
import prisma from '@/lib/prisma';
import { productCreateSchema } from '@/lib/validations';
import { requireVendor, errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorId = searchParams.get('vendorId');
    const category = searchParams.get('category');
    const search = searchParams.get('search');

    const where: {
      status: ProductStatus;
      vendorId?: string;
      category?: string;
      OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>;
      vendor: { status: 'ACTIVE' };
    } = {
      status: ProductStatus.ACTIVE,
      vendor: { status: 'ACTIVE' },
    };

    if (vendorId) {
      where.vendorId = vendorId;
    }

    if (category && category !== 'All') {
      where.category = category;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
      ];
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        description: true,
        price: true,
        stock: true,
        category: true,
        imageUrl: true,
        status: true,
        createdAt: true,
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
          },
        },
      },
      orderBy: { createdAt: 'desc' },
    });

    return successResponse(products);
  } catch (err) {
    console.error('Failed to list products:', err);
    return errorResponse('Failed to retrieve products', 500);
  }
}

export async function POST(req: NextRequest) {
  try {
    // Phase 3 & 5: Authenticated vendor only with ACTIVE status
    // VendorId is strictly derived from the authenticated session
    const { vendor } = await requireVendor(['ACTIVE']);

    const body = await req.json();
    const result = productCreateSchema.safeParse(body);

    if (!result.success) {
      return errorResponse('Validation failed', 400, result.error.flatten().fieldErrors);
    }

    const { name, slug, description, price, stock, category, imageUrl, status } = result.data;

    // Check slug uniqueness within this vendor's catalog
    const existing = await prisma.product.findUnique({
      where: {
        vendorId_slug: {
          vendorId: vendor.id,
          slug,
        },
      },
    });

    if (existing) {
      return errorResponse('A product with this slug already exists in your store.', 409);
    }

    const product = await prisma.product.create({
      data: {
        name,
        slug,
        description,
        price,
        stock,
        category,
        imageUrl: imageUrl || null,
        status: status || ProductStatus.ACTIVE,
        vendorId: vendor.id, // Enforced server-side: NEVER client input
      },
      include: {
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
          },
        },
      },
    });

    revalidatePath('/products');
    revalidatePath(`/vendors/${vendor.slug}`);
    revalidatePath('/vendor/products');

    return successResponse(product, 201);
  } catch (err: unknown) {
    if (err && typeof err === 'object' && 'statusCode' in err && 'message' in err) {
      return errorResponse((err as { message: string }).message, (err as { statusCode: number }).statusCode);
    }
    console.error('Product creation error:', err);
    return errorResponse('Failed to create product', 500);
  }
}
