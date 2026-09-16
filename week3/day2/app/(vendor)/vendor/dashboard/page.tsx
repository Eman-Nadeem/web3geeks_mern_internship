import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import prisma from '@/lib/prisma';
import { getCurrentUser } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Package,
  PlusCircle,
  CheckCircle2,
  AlertTriangle,
  ExternalLink,
  ArrowRight,
  Box,
  Edit3,
  Layers,
  Boxes,
  TrendingDown,
  Archive,
} from 'lucide-react';
import { ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function VendorDashboardPage() {
  const user = await getCurrentUser();
  if (!user || !user.vendor) {
    redirect('/vendor/onboarding');
  }

  const vendor = user.vendor;

  // Real DB Aggregations scoped strictly to the authenticated vendor
  const [
    totalProducts,
    activeProducts,
    draftProducts,
    allVendorProducts,
    recentProducts,
  ] = await Promise.all([
    prisma.product.count({ where: { vendorId: vendor.id } }),
    prisma.product.count({ where: { vendorId: vendor.id, status: ProductStatus.ACTIVE } }),
    prisma.product.count({ where: { vendorId: vendor.id, status: ProductStatus.DRAFT } }),
    prisma.product.findMany({
      where: { vendorId: vendor.id },
      select: { id: true, stockQuantity: true, lowStockThreshold: true, status: true },
    }),
    prisma.product.findMany({
      where: { vendorId: vendor.id },
      include: {
        images: { orderBy: { order: 'asc' } },
        variants: { select: { id: true } },
      },
      orderBy: { createdAt: 'desc' },
      take: 6,
    }),
  ]);

  const lowStockCount = allVendorProducts.filter(
    (p) => p.stockQuantity > 0 && p.stockQuantity <= p.lowStockThreshold
  ).length;

  const outOfStockCount = allVendorProducts.filter(
    (p) => p.stockQuantity === 0 || p.status === ProductStatus.OUT_OF_STOCK
  ).length;

  const totalInventoryUnits = allVendorProducts.reduce((sum, p) => sum + p.stockQuantity, 0);

  return (
    <div className="space-y-8">
      {/* Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6 gap-4">
        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Catalog</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-2xl font-extrabold text-white">{totalProducts}</div>
          <span className="text-[11px] text-slate-500 block">Total products</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-400">{activeProducts}</div>
          <span className="text-[11px] text-slate-500 block">Live on storefront</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Draft Items</span>
            <Archive className="w-4 h-4 text-slate-400" />
          </div>
          <div className="text-2xl font-extrabold text-slate-300">{draftProducts}</div>
          <span className="text-[11px] text-slate-500 block">Unpublished drafts</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock</span>
            <TrendingDown className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-2xl font-extrabold text-amber-400">{lowStockCount}</div>
          <span className="text-[11px] text-slate-500 block">At or below threshold</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-400" />
          </div>
          <div className="text-2xl font-extrabold text-rose-400">{outOfStockCount}</div>
          <span className="text-[11px] text-slate-500 block">Requires restock</span>
        </div>

        <div className="p-4 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-1.5">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Units</span>
            <Boxes className="w-4 h-4 text-cyan-400" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-400">{totalInventoryUnits}</div>
          <span className="text-[11px] text-slate-500 block">Sum of active inventory</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-6 rounded-2xl bg-gradient-to-r from-slate-900 via-indigo-950/20 to-slate-900 border border-slate-800 flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-white">Vendor Catalog & Inventory Center</h3>
          <p className="text-xs text-slate-400 mt-0.5">
            Add new products, adjust stock with audit trails, or manage product variants.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto">
          <Link
            href="/vendor/products/new"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-md shadow-emerald-600/20 w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </Link>
          <Link
            href="/vendor/inventory"
            className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto border border-slate-700"
          >
            <Boxes className="w-4 h-4 text-cyan-400" />
            Inventory Manager
          </Link>
          {vendor.status === 'ACTIVE' && (
            <Link
              href={`/vendors/${vendor.slug}`}
              target="_blank"
              className="px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto"
            >
              <ExternalLink className="w-4 h-4" />
              Storefront
            </Link>
          )}
        </div>
      </div>

      {/* Recent Catalog Table */}
      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-4">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-white tracking-tight">Recent Products</h3>
          <div className="flex items-center gap-4">
            <Link
              href="/vendor/inventory"
              className="text-xs font-semibold text-cyan-400 hover:text-cyan-300 flex items-center gap-1"
            >
              Manage Inventory
            </Link>
            <Link
              href="/vendor/products"
              className="text-xs font-semibold text-emerald-400 hover:text-emerald-300 flex items-center gap-1"
            >
              View all products
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {recentProducts.length === 0 ? (
          <div className="py-12 text-center text-slate-500 space-y-2">
            <Box className="w-8 h-8 mx-auto text-slate-600" />
            <p className="text-xs">No products in your store yet.</p>
            <Link
              href="/vendor/products/new"
              className="inline-block mt-2 text-xs text-emerald-400 hover:underline font-semibold"
            >
              Add your first product &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-slate-400 uppercase tracking-wider border-b border-slate-800">
                <tr>
                  <th className="pb-3 font-semibold">Product</th>
                  <th className="pb-3 font-semibold">SKU</th>
                  <th className="pb-3 font-semibold">Category</th>
                  <th className="pb-3 font-semibold">Price</th>
                  <th className="pb-3 font-semibold">Stock</th>
                  <th className="pb-3 font-semibold">Status</th>
                  <th className="pb-3 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/60">
                {recentProducts.map((product) => {
                  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
                  const isLow = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
                  const isOut = product.stockQuantity === 0;

                  return (
                    <tr key={product.id} className="hover:bg-slate-800/30 transition-colors">
                      <td className="py-3 font-medium text-white flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-slate-800 overflow-hidden flex items-center justify-center shrink-0 border border-slate-700">
                          {primaryImg ? (
                            <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-4 h-4 text-slate-500" />
                          )}
                        </div>
                        <div>
                          <span className="line-clamp-1">{product.name}</span>
                          {product.variants.length > 0 && (
                            <span className="text-[10px] text-slate-400 flex items-center gap-1 font-mono">
                              <Layers className="w-3 h-3 text-indigo-400" />
                              {product.variants.length} variants
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-slate-400">{product.sku}</td>
                      <td className="py-3 text-slate-400">{product.category}</td>
                      <td className="py-3 text-emerald-400 font-semibold">${product.price.toFixed(2)}</td>
                      <td className="py-3">
                        <span
                          className={`font-medium ${
                            isOut
                              ? 'text-rose-400 font-bold'
                              : isLow
                              ? 'text-amber-400 font-semibold'
                              : 'text-slate-300'
                          }`}
                        >
                          {product.stockQuantity} units
                        </span>
                      </td>
                      <td className="py-3">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="py-3 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          <Link
                            href={`/vendor/products/${product.id}/edit`}
                            className="p-1.5 rounded-lg text-slate-400 hover:text-white hover:bg-slate-800 inline-block transition-colors"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
