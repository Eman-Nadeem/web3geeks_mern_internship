import { NextRequest } from 'next/server';
import prisma from '@/lib/prisma';
import { errorResponse, successResponse } from '@/lib/guards';
import { ProductStatus, VendorStatus, Prisma } from '@prisma/client';

export async function GET(req: NextRequest) {
  try {
    const { searchParams } = new URL(req.url);
    const vendorParam = searchParams.get('vendor') || searchParams.get('vendorId');
    const category = searchParams.get('category');
    const search = searchParams.get('search')?.trim();
    const minPrice = searchParams.get('minPrice');
    const maxPrice = searchParams.get('maxPrice');
    const availability = searchParams.get('availability');
    const sort = searchParams.get('sort') || 'newest';

    const where: Prisma.ProductWhereInput = {
      status: ProductStatus.ACTIVE,
      vendor: { status: VendorStatus.ACTIVE },
    };

    if (vendorParam) {
      where.vendor = {
        status: VendorStatus.ACTIVE,
        OR: [
          { id: vendorParam },
          { slug: vendorParam },
        ],
      };
    }

    if (category && category !== 'All' && category !== 'ALL') {
      where.category = category;
    }

    if (minPrice || maxPrice) {
      where.price = {};
      if (minPrice && !isNaN(parseFloat(minPrice))) {
        where.price.gte = parseFloat(minPrice);
      }
      if (maxPrice && !isNaN(parseFloat(maxPrice))) {
        where.price.lte = parseFloat(maxPrice);
      }
    }

    if (availability === 'in_stock') {
      where.stockQuantity = { gt: 0 };
    } else if (availability === 'out_of_stock') {
      where.stockQuantity = 0;
    }

    if (search) {
      where.OR = [
        { name: { contains: search, mode: 'insensitive' } },
        { description: { contains: search, mode: 'insensitive' } },
        { category: { contains: search, mode: 'insensitive' } },
      ];
    }

    let orderBy: Prisma.ProductOrderByWithRelationInput = { createdAt: 'desc' };
    if (sort === 'oldest') {
      orderBy = { createdAt: 'asc' };
    } else if (sort === 'price_asc') {
      orderBy = { price: 'asc' };
    } else if (sort === 'price_desc') {
      orderBy = { price: 'desc' };
    } else if (sort === 'stock_desc') {
      orderBy = { stockQuantity: 'desc' };
    }

    const products = await prisma.product.findMany({
      where,
      select: {
        id: true,
        name: true,
        slug: true,
        sku: true,
        description: true,
        price: true,
        compareAtPrice: true,
        stockQuantity: true,
        lowStockThreshold: true,
        category: true,
        status: true,
        createdAt: true,
        images: {
          select: {
            id: true,
            url: true,
            isPrimary: true,
            order: true,
          },
          orderBy: { order: 'asc' },
        },
        variants: {
          where: { status: ProductStatus.ACTIVE },
          select: {
            id: true,
            sku: true,
            options: true,
            price: true,
            stockQuantity: true,
            imageUrl: true,
          },
          orderBy: { createdAt: 'asc' },
        },
        vendor: {
          select: {
            id: true,
            name: true,
            slug: true,
            logoUrl: true,
            description: true,
            // Strictly EXCLUDE email and phone from public listings
          },
        },
      },
      orderBy,
    });

    // Normalize primary image for client consumption
    const formattedProducts = products.map((p) => {
      const primaryImg = p.images.find((img) => img.isPrimary) || p.images[0];
      return {
        ...p,
        stock: p.stockQuantity, // Backward compatibility alias
        imageUrl: primaryImg ? primaryImg.url : null,
      };
    });

    return successResponse(formattedProducts);
  } catch (err) {
    console.error('Failed to list public products:', err);
    return errorResponse('Failed to retrieve products', 500);
  }
}
