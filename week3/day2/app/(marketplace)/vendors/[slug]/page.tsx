import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ArrowLeft, CheckCircle2, ShoppingBag, Mail, Phone, Store } from 'lucide-react';
import { VendorStatus, ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface VendorStorefrontPageProps {
  params: Promise<{ slug: string }>;
}

export default async function VendorStorefrontPage({ params }: VendorStorefrontPageProps) {
  const { slug } = await params;

  const vendor = await prisma.vendor.findUnique({
    where: { slug },
    include: {
      products: {
        where: { status: ProductStatus.ACTIVE },
        include: {
          images: { orderBy: { order: 'asc' } },
        },
        orderBy: { createdAt: 'desc' },
      },
    },
  });

  // Strict 404 security cloaking for non-active vendors
  if (!vendor || vendor.status !== VendorStatus.ACTIVE) {
    notFound();
  }

  return (
    <div className="w-full space-y-10 pb-20 bg-[var(--bg-canvas)] text-[var(--text-on-dark)] min-h-[85vh] transition-colors duration-200">
      {/* 1. Hero Banner Pattern */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="mb-3">
          <Link
            href="/vendors"
            className="inline-flex items-center gap-1.5 text-xs font-semibold text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            Back to All Stores
          </Link>
        </div>

        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E2B24] to-[#153229] border border-[#1E4338] min-h-[260px] flex items-center p-8 sm:p-12 shadow-lg">
          {/* Vendor Brand / Logo Graphic */}
          <div className="absolute -right-8 top-1/2 -translate-y-1/2 w-64 h-64 rounded-full overflow-hidden opacity-20 lg:opacity-85 pointer-events-none border-4 border-[#1E4338] shadow-2xl">
            {vendor.logoUrl ? (
              <img
                src={vendor.logoUrl}
                alt={vendor.name}
                className="w-full h-full object-cover"
              />
            ) : (
              <div className="w-full h-full bg-[#12192A] flex items-center justify-center font-bold text-6xl text-[#1E7A56]">
                {vendor.name.charAt(0)}
              </div>
            )}
          </div>

          {/* Left Column: Vendor Headline & Description */}
          <div className="relative z-10 max-w-xl space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-2.5 h-2.5 rounded-full bg-[#1E7A56] animate-pulse" />
              <span className="text-[12px] font-bold tracking-wider uppercase text-[#1E7A56] bg-white/90 px-2.5 py-0.5 rounded-full">
                Verified Merchant Store
              </span>
            </div>

            <h1 className="text-2xl sm:text-4xl font-bold text-white tracking-tight flex items-center gap-2">
              {vendor.name}
              <CheckCircle2 className="w-6 h-6 text-[#1E7A56]" />
            </h1>

            <p className="text-[14px] sm:text-[15px] text-[#A9B2C3] leading-relaxed">
              {vendor.description || 'Independent approved merchant offering direct warranty & high-quality goods.'}
            </p>

            <div className="pt-2 flex flex-wrap items-center gap-4 text-xs text-[#A9B2C3]">
              <span className="flex items-center gap-1.5">
                <Mail className="w-3.5 h-3.5 text-[#1E7A56]" />
                {vendor.email}
              </span>
              {vendor.phone && (
                <span className="flex items-center gap-1.5">
                  <Phone className="w-3.5 h-3.5 text-[#1E7A56]" />
                  {vendor.phone}
                </span>
              )}
              <span className="px-2.5 py-1 rounded bg-[#12192A] text-white font-semibold">
                {vendor.products.length} Products in Store
              </span>
            </div>
          </div>
        </div>
      </section>

      {/* 2. Store Products Grid */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex items-center justify-between border-b border-[var(--border-dark)] pb-4">
          <h2 className="text-[20px] font-bold text-[var(--text-on-dark)] tracking-tight">
            Store Catalog
          </h2>
          <span className="text-xs text-[var(--text-on-dark-muted)]">
            Showing all active products by {vendor.name}
          </span>
        </div>

        {vendor.products.length === 0 ? (
          <div className="py-16 rounded-xl bg-white text-[#151A24] text-center border border-[#E5E7EB]">
            <ShoppingBag className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
            <h3 className="text-base font-semibold">No active products published</h3>
            <p className="text-xs text-[#6B7280] mt-1">This merchant has not listed active items yet.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {vendor.products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                compareAtPrice={product.compareAtPrice}
                images={product.images}
                category={product.category}
                stock={product.stockQuantity}
                stockQuantity={product.stockQuantity}
                lowStockThreshold={product.lowStockThreshold}
                rating={4.9}
                reviewsCount={product.stockQuantity + 20}
                vendor={{
                  id: vendor.id,
                  name: vendor.name,
                  slug: vendor.slug,
                }}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
