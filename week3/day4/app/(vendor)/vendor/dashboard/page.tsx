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
        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Catalog</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-2xl font-extrabold text-(--text-on-dark)">{totalProducts}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">Total products</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Active Published</span>
            <CheckCircle2 className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-2xl font-extrabold text-emerald-600 dark:text-emerald-400">{activeProducts}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">Live on storefront</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Draft Items</span>
            <Archive className="w-4 h-4 text-(--text-on-dark-muted)" />
          </div>
          <div className="text-2xl font-extrabold text-(--text-on-dark)">{draftProducts}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">Unpublished drafts</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock</span>
            <TrendingDown className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-2xl font-extrabold text-amber-500">{lowStockCount}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">At or below threshold</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Out of Stock</span>
            <AlertTriangle className="w-4 h-4 text-rose-500" />
          </div>
          <div className="text-2xl font-extrabold text-rose-500">{outOfStockCount}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">Requires restock</span>
        </div>

        <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1.5 shadow-sm">
          <div className="flex items-center justify-between text-(--text-on-dark-muted)">
            <span className="text-[11px] font-semibold uppercase tracking-wider">Total Units</span>
            <Boxes className="w-4 h-4 text-cyan-500" />
          </div>
          <div className="text-2xl font-extrabold text-cyan-600 dark:text-cyan-400">{totalInventoryUnits}</div>
          <span className="text-[11px] text-(--text-on-dark-muted) block">Sum of active inventory</span>
        </div>
      </div>

      {/* Quick Action Bar */}
      <div className="p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) shadow-sm flex flex-col sm:flex-row items-center justify-between gap-4">
        <div>
          <h3 className="text-base font-bold text-(--text-on-dark)">Vendor Catalog & Inventory Center</h3>
          <p className="text-xs text-(--text-on-dark-muted) mt-0.5">
            Add new products, adjust stock with audit trails, or manage product variants.
          </p>
        </div>
        <div className="flex items-center gap-3 w-full sm:w-auto flex-wrap">
          <Link
            href="/vendor/products/new"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors flex items-center justify-center gap-1.5 shadow-sm w-full sm:w-auto"
          >
            <PlusCircle className="w-4 h-4" />
            Add Product
          </Link>
          <Link
            href="/vendor/inventory"
            className="px-4 py-2 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto border border-(--border-dark)"
          >
            <Boxes className="w-4 h-4 text-cyan-500" />
            Inventory Manager
          </Link>
          {vendor.status === 'ACTIVE' && (
            <Link
              href={`/vendors/${vendor.slug}`}
              target="_blank"
              className="px-4 py-2 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) text-xs font-semibold flex items-center justify-center gap-1.5 transition-colors w-full sm:w-auto border border-(--border-dark)"
            >
              <ExternalLink className="w-4 h-4" />
              Storefront
            </Link>
          )}
        </div>
      </div>

      {/* Recent Catalog Table */}
      <div className="p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-4 shadow-sm">
        <div className="flex items-center justify-between">
          <h3 className="text-base font-bold text-(--text-on-dark) tracking-tight">Recent Products</h3>
          <div className="flex items-center gap-4">
            <Link
              href="/vendor/inventory"
              className="text-xs font-semibold text-cyan-600 dark:text-cyan-400 hover:underline flex items-center gap-1"
            >
              Manage Inventory
            </Link>
            <Link
              href="/vendor/products"
              className="text-xs font-semibold text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
            >
              View all products
              <ArrowRight className="w-3.5 h-3.5" />
            </Link>
          </div>
        </div>

        {recentProducts.length === 0 ? (
          <div className="py-12 text-center text-(--text-on-dark-muted) space-y-2">
            <Box className="w-8 h-8 mx-auto opacity-40" />
            <p className="text-xs">No products in your store yet.</p>
            <Link
              href="/vendor/products/new"
              className="inline-block mt-2 text-xs text-emerald-600 dark:text-emerald-400 hover:underline font-semibold"
            >
              Add your first product &rarr;
            </Link>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="text-[11px] text-(--text-on-dark-muted) uppercase tracking-wider border-b border-(--border-dark)">
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
              <tbody className="divide-y divide-(--border-dark)">
                {recentProducts.map((product) => {
                  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
                  const isLow = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
                  const isOut = product.stockQuantity === 0;

                  return (
                    <tr key={product.id} className="hover:bg-(--surface-card-subtle) transition-colors">
                      <td className="py-3 font-medium text-(--text-on-dark) flex items-center gap-2.5">
                        <div className="w-8 h-8 rounded-lg bg-(--surface-card-subtle) overflow-hidden flex items-center justify-center shrink-0 border border-(--border-dark)">
                          {primaryImg ? (
                            <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                          ) : (
                            <Box className="w-4 h-4 text-(--text-on-dark-muted)" />
                          )}
                        </div>
                        <div>
                          <span className="line-clamp-1">{product.name}</span>
                          {product.variants.length > 0 && (
                            <span className="text-[10px] text-(--text-on-dark-muted) flex items-center gap-1 font-mono">
                              <Layers className="w-3 h-3 text-indigo-500" />
                              {product.variants.length} variants
                            </span>
                          )}
                        </div>
                      </td>
                      <td className="py-3 font-mono text-(--text-on-dark-muted)">{product.sku}</td>
                      <td className="py-3 text-(--text-on-dark-muted)">{product.category}</td>
                      <td className="py-3 text-emerald-600 dark:text-emerald-400 font-semibold">${product.price.toFixed(2)}</td>
                      <td className="py-3">
                        <span
                          className={`font-medium ${
                            isOut
                              ? 'text-rose-500 font-bold'
                              : isLow
                              ? 'text-amber-500 font-semibold'
                              : 'text-(--text-on-dark)'
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
                            className="p-1.5 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--surface-card-subtle) inline-block transition-colors"
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
