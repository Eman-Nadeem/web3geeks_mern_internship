import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { Package, Store, Box, ExternalLink } from 'lucide-react';

export const dynamic = 'force-dynamic';

export default async function AdminProductsPage() {
  const products = await prisma.product.findMany({
    include: {
      images: { orderBy: { order: 'asc' } },
      vendor: {
        select: {
          id: true,
          name: true,
          slug: true,
          status: true,
        },
      },
    },
    orderBy: { createdAt: 'desc' },
  });

  return (
    <div className="space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-on-dark)] tracking-tight">Marketplace Catalog Oversight</h2>
        <p className="text-xs text-[var(--text-on-dark-muted)] mt-1">
          Global inventory across all registered vendors with store attribution and visibility controls.
        </p>
      </div>

      <div className="overflow-hidden rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-sm">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-[var(--surface-card-subtle)] text-[11px] text-[var(--text-on-dark-muted)] uppercase tracking-wider border-b border-[var(--border-dark)]">
              <tr>
                <th className="p-4 font-semibold">Product</th>
                <th className="p-4 font-semibold">Owning Vendor</th>
                <th className="p-4 font-semibold">Vendor Status</th>
                <th className="p-4 font-semibold">Price</th>
                <th className="p-4 font-semibold">Stock</th>
                <th className="p-4 font-semibold">Status</th>
                <th className="p-4 font-semibold text-right">View</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[var(--border-dark)]">
              {products.map((product) => {
                const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
                return (
                  <tr key={product.id} className="hover:bg-[var(--surface-card-subtle)] transition-colors">
                    <td className="p-4 font-medium text-[var(--text-on-dark)] flex items-center gap-2.5">
                      <div className="w-8 h-8 rounded-lg bg-[var(--surface-card-subtle)] overflow-hidden flex items-center justify-center shrink-0 border border-[var(--border-dark)]">
                        {primaryImg ? (
                          <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                        ) : (
                          <Box className="w-4 h-4 text-[var(--text-on-dark-muted)]" />
                        )}
                      </div>
                      <div>
                        <div className="line-clamp-1">{product.name}</div>
                        <span className="text-[10px] text-[var(--text-on-dark-muted)] font-mono">{product.category}</span>
                      </div>
                    </td>

                    <td className="p-4">
                      <Link
                        href={`/vendors/${product.vendor.slug}`}
                        className="text-emerald-600 dark:text-emerald-400 hover:underline font-semibold flex items-center gap-1"
                      >
                        <Store className="w-3.5 h-3.5" />
                        {product.vendor.name}
                      </Link>
                    </td>

                    <td className="p-4">
                      <StatusBadge status={product.vendor.status} />
                    </td>

                    <td className="p-4 font-bold text-[var(--text-on-dark)]">
                      ${product.price.toFixed(2)}
                    </td>

                    <td className="p-4">
                      <span className={product.stockQuantity === 0 ? 'text-amber-500 font-bold' : 'text-[var(--text-on-dark-muted)]'}>
                        {product.stockQuantity} units
                      </span>
                    </td>

                    <td className="p-4">
                      <StatusBadge status={product.status} />
                    </td>

                    <td className="p-4 text-right">
                      <Link
                        href={`/products/${product.slug}`}
                        className="p-1.5 rounded-lg text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] hover:bg-[var(--surface-card-subtle)] inline-block transition-colors"
                        title="View public product details"
                      >
                        <ExternalLink className="w-3.5 h-3.5" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
