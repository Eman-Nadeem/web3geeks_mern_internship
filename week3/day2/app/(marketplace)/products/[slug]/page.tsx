import React from 'react';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ProductDetailClient } from '@/components/ProductDetailClient';
import { ProductStatus, VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      OR: [{ slug }, { id: slug }],
      status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] },
      vendor: { status: VendorStatus.ACTIVE },
    },
    include: {
      images: { orderBy: { order: 'asc' } },
      variants: {
        where: { status: { in: [ProductStatus.ACTIVE, ProductStatus.OUT_OF_STOCK] } },
        orderBy: { createdAt: 'asc' },
      },
      vendor: {
        select: {
          id: true,
          name: true,
          slug: true,
          logoUrl: true,
          description: true,
          status: true,
          // Explicitly do NOT query or leak email or phone
        },
      },
    },
  });

  if (!product) {
    notFound();
  }

  return <ProductDetailClient product={product as any} />;
}
