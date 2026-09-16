import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { ProductDetailActions } from '@/components/ProductDetailActions';
import { Store, ArrowLeft, CheckCircle2, Box, Mail, Star, ShieldCheck, Truck } from 'lucide-react';
import { ProductStatus, VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      OR: [
        { slug },
        { id: slug },
      ],
      status: ProductStatus.ACTIVE,
      vendor: { status: VendorStatus.ACTIVE },
    },
    include: {
      vendor: true,
    },
  });

  if (!product) {
    notFound();
  }

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(product.price);

  return (
    <div className="w-full min-h-[85vh] bg-[var(--bg-canvas)] text-[var(--text-on-dark)] py-8 pb-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-on-dark-muted)]">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 hover:text-[var(--text-on-dark)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Catalog</span>
          </Link>
          <span>/</span>
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-[var(--text-on-dark)] transition-colors"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-[var(--text-on-dark)] font-medium truncate max-w-[200px] sm:max-w-md">
            {product.name}
          </span>
        </div>

        {/* Main Product Showcase Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Product Image on crisp white surface-card (5 cols) */}
          <div className="lg:col-span-5 rounded-2xl bg-white border border-[#E5E7EB] p-8 shadow-sm flex flex-col items-center justify-center relative min-h-[380px] sm:min-h-[440px]">
            {product.imageUrl ? (
              <img
                src={product.imageUrl}
                alt={product.name}
                className="w-full h-80 object-contain"
              />
            ) : (
              <div className="text-slate-400 flex flex-col items-center gap-3">
                <Box className="w-16 h-16 stroke-1" />
                <span className="text-xs">No image provided</span>
              </div>
            )}
            <div className="absolute top-4 left-4">
              <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#151A24] border border-[#E5E7EB]">
                {product.category}
              </span>
            </div>
          </div>

          {/* Center Column: Product Specs & CTAs (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Vendor attribution badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-on-dark-muted)]">Merchant:</span>
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="text-xs font-semibold text-[var(--text-on-dark)] hover:text-[#1E7A56] flex items-center gap-1.5 transition-colors bg-[var(--bg-header)] px-2.5 py-1 rounded border border-[var(--border-dark)]"
              >
                <Store className="w-3.5 h-3.5 text-[#1E7A56]" />
                {product.vendor.name}
              </Link>
            </div>

            {/* Title */}
            <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-on-dark)] tracking-tight leading-snug">
              {product.name}
            </h1>

            {/* Rating row */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-on-dark-muted)]">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star
                    key={i}
                    className="w-4 h-4 fill-[#F5A623] text-[#F5A623]"
                  />
                ))}
              </div>
              <span className="font-semibold text-[var(--text-on-dark)]">4.8</span>
              <span>•</span>
              <span>120 ratings</span>
              <span>•</span>
              <span className="text-[#1E7A56] font-semibold">Verified Merchant</span>
            </div>

            {/* Price & Stock status */}
            <div className="flex items-baseline gap-4 pt-2 border-t border-[var(--border-dark)]">
              <span className="text-3xl font-bold text-[var(--text-on-dark)]">
                {formattedPrice}
              </span>
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-on-dark-muted)]">
                <CheckCircle2 className="w-3.5 h-3.5 text-[#1E7A56]" />
                <span>
                  {product.stock > 0
                    ? `In Stock (${product.stock} available)`
                    : 'Currently Out of Stock'}
                </span>
              </div>
            </div>

            {/* Interactive Cart & Wishlist Actions */}
            <ProductDetailActions
              product={{
                id: product.id,
                name: product.name,
                slug: product.slug,
                price: product.price,
                imageUrl: product.imageUrl,
                category: product.category,
                stock: product.stock,
                vendor: {
                  id: product.vendor.id,
                  name: product.vendor.name,
                  slug: product.vendor.slug,
                },
              }}
            />

            {/* Description */}
            <div className="pt-4 border-t border-[var(--border-dark)] space-y-2">
              <h2 className="text-xs font-semibold text-[var(--text-on-dark)] uppercase tracking-wider">
                Product Details
              </h2>
              <p className="text-[14px] text-[var(--text-on-dark-muted)] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Trust & Guarantee Perks */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[var(--bg-header)] border border-[var(--border-dark)] flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                <div className="text-xs leading-tight">
                  <div className="font-semibold text-[var(--text-on-dark)]">Free Standard Delivery</div>
                  <div className="text-[11px] text-[var(--text-on-dark-muted)]">Direct from verified seller</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-header)] border border-[var(--border-dark)] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                <div className="text-xs leading-tight">
                  <div className="font-semibold text-[var(--text-on-dark)]">Marketplace Guarantee</div>
                  <div className="text-[11px] text-[var(--text-on-dark-muted)]">Direct seller warranty</div>
                </div>
              </div>
            </div>

            {/* Owning Vendor Info Card */}
            <div className="rounded-xl bg-white p-5 border border-[#E5E7EB] text-[#151A24] space-y-3">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-header)] text-[var(--text-on-dark)] border border-[var(--border-dark)] flex items-center justify-center font-bold text-sm shrink-0">
                    {product.vendor.name.slice(0, 2).toUpperCase()}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[#151A24]">
                      {product.vendor.name}
                    </h3>
                    <span className="text-[11px] text-[#6B7280]">
                      Verified Independent Merchant
                    </span>
                  </div>
                </div>
                <StatusBadge status={product.vendor.status} />
              </div>

              {product.vendor.description && (
                <p className="text-[12px] text-[#6B7280] line-clamp-2">
                  {product.vendor.description}
                </p>
              )}

              <div className="pt-2 border-t border-slate-100 flex items-center justify-between text-xs">
                <div className="text-[#6B7280] flex items-center gap-1.5">
                  <Mail className="w-3.5 h-3.5 text-[#1E7A56]" />
                  <span>{product.vendor.email}</span>
                </div>
                <Link
                  href={`/vendors/${product.vendor.slug}`}
                  className="font-semibold text-[#1E7A56] hover:text-[#186347] transition-colors"
                >
                  Visit Storefront →
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
