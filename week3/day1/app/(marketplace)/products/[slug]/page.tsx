import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { Store, ShieldCheck, ArrowLeft, CheckCircle2, Box, Mail, Phone } from 'lucide-react';
import { ProductStatus, VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductDetailPageProps {
  params: Promise<{ slug: string }>;
}

export default async function ProductDetailPage({ params }: ProductDetailPageProps) {
  const { slug } = await params;

  const product = await prisma.product.findFirst({
    where: {
      slug,
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

  return (
    <div className="max-w-6xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      {/* Back button */}
      <Link
        href="/products"
        className="inline-flex items-center gap-2 text-xs font-semibold text-slate-400 hover:text-white transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Products Catalog
      </Link>

      <div className="grid grid-cols-1 md:grid-cols-2 gap-10">
        {/* Product Image */}
        <div className="aspect-square rounded-3xl bg-slate-900 border border-slate-800 overflow-hidden flex items-center justify-center relative shadow-2xl">
          {product.imageUrl ? (
            <img
              src={product.imageUrl}
              alt={product.name}
              className="w-full h-full object-cover"
            />
          ) : (
            <div className="text-slate-600 flex flex-col items-center gap-2">
              <Box className="w-16 h-16" />
              <span className="text-xs">No image provided</span>
            </div>
          )}
          <div className="absolute top-4 left-4">
            <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-950/80 text-slate-200 border border-slate-700/80 backdrop-blur-sm">
              {product.category}
            </span>
          </div>
        </div>

        {/* Product Details & Vendor Attribution */}
        <div className="flex flex-col justify-between space-y-6">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <span className="text-xs text-slate-400">Merchant:</span>
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="text-xs font-semibold text-emerald-400 hover:underline flex items-center gap-1"
              >
                <Store className="w-3.5 h-3.5" />
                {product.vendor.name}
              </Link>
            </div>

            <h1 className="text-3xl sm:text-4xl font-extrabold text-white tracking-tight">
              {product.name}
            </h1>

            <div className="flex items-center gap-4">
              <span className="text-3xl font-extrabold text-emerald-400">
                ${product.price.toFixed(2)}
              </span>
              <div className="flex items-center gap-1 text-xs text-slate-300 px-2.5 py-1 rounded-full bg-slate-900 border border-slate-800">
                <CheckCircle2 className="w-3.5 h-3.5 text-emerald-400" />
                <span>{product.stock > 0 ? `${product.stock} Units In Stock` : 'Currently Out of Stock'}</span>
              </div>
            </div>

            <div className="border-t border-slate-800 pt-4">
              <h2 className="text-xs font-semibold text-slate-300 uppercase tracking-wider mb-2">Description</h2>
              <p className="text-sm text-slate-300 leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>
          </div>

          {/* Owning Vendor Info Card (Phase 5 requirement) */}
          <div className="p-5 rounded-2xl bg-slate-900/80 border border-slate-800 space-y-3">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="w-10 h-10 rounded-xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-emerald-400">
                  {product.vendor.logoUrl ? (
                    <img
                      src={product.vendor.logoUrl}
                      alt={product.vendor.name}
                      className="w-full h-full object-cover"
                    />
                  ) : (
                    product.vendor.name.charAt(0)
                  )}
                </div>
                <div>
                  <h3 className="text-sm font-bold text-white">{product.vendor.name}</h3>
                  <span className="text-[11px] text-slate-400">Verified Marketplace Vendor</span>
                </div>
              </div>
              <StatusBadge status={product.vendor.status} />
            </div>

            {product.vendor.description && (
              <p className="text-xs text-slate-400 line-clamp-2">
                {product.vendor.description}
              </p>
            )}

            <div className="pt-2 border-t border-slate-800/60 flex items-center justify-between text-xs">
              <div className="text-slate-400 flex items-center gap-2">
                <Mail className="w-3.5 h-3.5 text-slate-500" />
                <span>{product.vendor.email}</span>
              </div>
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="font-semibold text-emerald-400 hover:text-emerald-300 hover:underline flex items-center gap-1"
              >
                Visit Storefront &rarr;
              </Link>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
