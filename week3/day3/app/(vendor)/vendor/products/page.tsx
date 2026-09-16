'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Package,
  PlusCircle,
  Trash2,
  Edit3,
  AlertCircle,
  Box,
  Search,
  Filter,
  History,
  Boxes,
  Layers,
  ArrowUpDown,
  X,
  Check,
  Plus,
  Minus,
  RefreshCw,
} from 'lucide-react';

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

interface ProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number | null;
  stockQuantity: number;
  status: string;
}

interface Product {
  id: string;
  name: string;
  slug: string;
  sku: string;
  description: string;
  price: number;
  compareAtPrice: number | null;
  stockQuantity: number;
  lowStockThreshold: number;
  category: string;
  images: ProductImage[];
  variants: ProductVariant[];
  status: 'DRAFT' | 'ACTIVE' | 'OUT_OF_STOCK' | 'ARCHIVED';
  createdAt: string;
}

interface AdjustmentHistoryItem {
  id: string;
  previousQuantity: number;
  newQuantity: number;
  quantityChanged: number;
  adjustmentType: string;
  reason: string | null;
  createdAt: string;
  changedByUser: { name: string; email: string };
  variant?: { sku: string; options: Record<string, string> } | null;
}

export default function VendorProductsPage() {
  const [products, setProducts] = useState<Product[]>([]);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [categoryFilter, setCategoryFilter] = useState('ALL');
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [availabilityFilter, setAvailabilityFilter] = useState('ALL');
  const [sortField, setSortField] = useState('newest');
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);

  // Quick Stock Adjustment Modal State
  const [adjustingProduct, setAdjustingProduct] = useState<Product | null>(null);
  const [adjustDelta, setAdjustDelta] = useState<number>(0);
  const [adjustReason, setAdjustReason] = useState<string>('');
  const [selectedVariantId, setSelectedVariantId] = useState<string>('');
  const [adjustingLoading, setAdjustingLoading] = useState(false);

  // History Drawer State
  const [historyProduct, setHistoryProduct] = useState<Product | null>(null);
  const [historyLogs, setHistoryLogs] = useState<AdjustmentHistoryItem[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  const fetchProducts = async () => {
    setLoading(true);
    setError(null);
    try {
      const query = new URLSearchParams();
      if (search) query.set('search', search);
      if (categoryFilter !== 'ALL') query.set('category', categoryFilter);
      if (statusFilter !== 'ALL') query.set('status', statusFilter);
      if (availabilityFilter !== 'ALL') query.set('availability', availabilityFilter);
      if (sortField) query.set('sort', sortField);

      const res = await fetch(`/api/vendor/products?${query.toString()}`);
      const data = await res.json();

      if (data.success) {
        setProducts(data.data);
      } else {
        setError(data.error || 'Failed to fetch products');
      }
    } catch {
      setError('An error occurred while loading products');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchProducts();
  }, [categoryFilter, statusFilter, availabilityFilter, sortField]);

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    fetchProducts();
  };

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Are you sure you want to archive "${name}"? It will be safely hidden from your active store catalog.`)) {
      return;
    }

    setDeletingId(id);
    try {
      const res = await fetch(`/api/vendor/products/${id}`, { method: 'DELETE' });
      const data = await res.json();

      if (!res.ok) {
        alert(data.error || 'Failed to archive product.');
        setDeletingId(null);
        return;
      }

      // Update local status to ARCHIVED
      setProducts((prev) =>
        prev.map((p) => (p.id === id ? { ...p, status: 'ARCHIVED' } : p))
      );
    } catch {
      alert('An error occurred while archiving the product.');
    } finally {
      setDeletingId(null);
    }
  };

  // Stock Adjustment Submission
  const handleStockAdjustSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!adjustingProduct) return;

    setAdjustingLoading(true);
    try {
      const res = await fetch(`/api/vendor/products/${adjustingProduct.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: selectedVariantId || undefined,
          delta: adjustDelta,
          reason: adjustReason || 'Vendor manual stock adjustment',
          adjustmentType: adjustDelta > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to adjust stock');
        setAdjustingLoading(false);
        return;
      }

      // Update product in state
      if (data.data && data.data.product) {
        const updated = data.data.product;
        setProducts((prev) => prev.map((p) => (p.id === updated.id ? updated : p)));
      }

      setAdjustingProduct(null);
      setAdjustDelta(0);
      setAdjustReason('');
      setSelectedVariantId('');
    } catch {
      alert('Error adjusting stock');
    } finally {
      setAdjustingLoading(false);
    }
  };

  // Open History Drawer
  const openHistory = async (product: Product) => {
    setHistoryProduct(product);
    setHistoryLoading(true);
    try {
      const res = await fetch(`/api/vendor/products/${product.id}/inventory-history`);
      const data = await res.json();
      if (data.success) {
        setHistoryLogs(data.data);
      } else {
        setHistoryLogs([]);
      }
    } catch {
      setHistoryLogs([]);
    } finally {
      setHistoryLoading(false);
    }
  };

  // Extract unique categories
  const categories = Array.from(new Set(products.map((p) => p.category))).filter(Boolean);

  return (
    <div className="space-y-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-(--text-on-dark) tracking-tight">Product Catalog</h2>
          <p className="text-xs text-(--text-on-dark-muted) mt-1">
            Manage your store&apos;s product listings, SKU codes, stock levels, variants, and audit histories.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <Link
            href="/vendor/inventory"
            className="px-4 py-2 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) font-semibold text-xs flex items-center justify-center gap-2 border border-(--border-dark) transition-colors"
          >
            <Boxes className="w-4 h-4 text-cyan-500" />
            Inventory Manager
          </Link>
          <Link
            href="/vendor/products/new"
            className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs flex items-center justify-center gap-2 shadow-sm transition-colors"
          >
            <PlusCircle className="w-4 h-4" />
            Add New Product
          </Link>
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500">
          {error}
        </div>
      )}

      {/* Filter and Search Bar */}
      <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-3 shadow-sm">
        <form onSubmit={handleSearchSubmit} className="flex flex-wrap items-center justify-between gap-3">
          {/* Search box */}
          <div className="relative flex-1 min-w-60">
            <Search className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Search by title, SKU, or description..."
              className="w-full pl-9 pr-4 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
            />
          </div>

          {/* Category Filter */}
          <select
            value={categoryFilter}
            onChange={(e) => setCategoryFilter(e.target.value)}
            className="px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Categories</option>
            {categories.map((c) => (
              <option key={c} value={c}>
                {c}
              </option>
            ))}
          </select>

          {/* Availability Filter */}
          <select
            value={availabilityFilter}
            onChange={(e) => setAvailabilityFilter(e.target.value)}
            className="px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
          >
            <option value="ALL">All Stock Levels</option>
            <option value="in_stock">In Stock (&gt; 0)</option>
            <option value="low_stock">Low Stock (≤ Threshold)</option>
            <option value="out_of_stock">Out of Stock (= 0)</option>
          </select>

          {/* Sort Filter */}
          <select
            value={sortField}
            onChange={(e) => setSortField(e.target.value)}
            className="px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
          >
            <option value="newest">Newest First</option>
            <option value="oldest">Oldest First</option>
            <option value="price_asc">Price: Low to High</option>
            <option value="price_desc">Price: High to Low</option>
            <option value="stock_desc">Highest Stock</option>
            <option value="stock_asc">Lowest Stock</option>
          </select>

          <button
            type="submit"
            className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white rounded-xl text-xs font-semibold transition-colors cursor-pointer"
          >
            Search
          </button>
        </form>

        {/* Status Tabs */}
        <div className="flex items-center gap-2 pt-2 border-t border-(--border-dark) overflow-x-auto">
          {['ALL', 'ACTIVE', 'DRAFT', 'OUT_OF_STOCK', 'ARCHIVED'].map((st) => (
            <button
              key={st}
              onClick={() => setStatusFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold capitalize transition-colors whitespace-nowrap cursor-pointer ${
                statusFilter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--surface-card-subtle)'
              }`}
            >
              {st.toLowerCase().replace('_', ' ')}
            </button>
          ))}
        </div>
      </div>

      {/* Table Content */}
      {loading ? (
        <div className="py-20 text-center text-xs text-(--text-on-dark-muted) flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          Loading products...
        </div>
      ) : products.length === 0 ? (
        <div className="py-16 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-3">
          <Box className="w-10 h-10 text-(--text-on-dark-muted) mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-(--text-on-dark)">No products match your criteria</h3>
          <p className="text-xs text-(--text-on-dark-muted)">Add a new item to your catalog or clear filter options.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-(--surface-card) border border-(--border-dark) shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--surface-card-subtle) text-[11px] text-(--text-on-dark-muted) uppercase tracking-wider border-b border-(--border-dark)">
                <tr>
                  <th className="p-4 font-semibold">Product</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold">Category</th>
                  <th className="p-4 font-semibold">Price</th>
                  <th className="p-4 font-semibold">Stock Level</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-dark)">
                {products.map((product) => {
                  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
                  const isLow = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
                  const isOut = product.stockQuantity === 0 || product.status === 'OUT_OF_STOCK';

                  return (
                    <tr key={product.id} className="hover:bg-(--surface-card-subtle) transition-colors">
                      <td className="p-4">
                        <div className="flex items-center gap-3">
                          <div className="w-12 h-12 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) overflow-hidden flex items-center justify-center shrink-0">
                            {primaryImg ? (
                              <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                            ) : (
                              <Box className="w-5 h-5 text-(--text-on-dark-muted)" />
                            )}
                          </div>
                          <div>
                            <div className="font-bold text-(--text-on-dark) text-xs">{product.name}</div>
                            <span className="text-[11px] text-(--text-on-dark-muted) font-mono">slug: {product.slug}</span>
                            {product.variants && product.variants.length > 0 && (
                              <div className="text-[10px] text-indigo-500 flex items-center gap-1 mt-0.5 font-medium">
                                <Layers className="w-3 h-3" />
                                {product.variants.length} active variants
                              </div>
                            )}
                          </div>
                        </div>
                      </td>
                      <td className="p-4 font-mono text-(--text-on-dark-muted)">{product.sku}</td>
                      <td className="p-4 text-(--text-on-dark-muted) font-medium">{product.category}</td>
                      <td className="p-4">
                        <div className="font-bold text-emerald-600 dark:text-emerald-400">${product.price.toFixed(2)}</div>
                        {product.compareAtPrice && (
                          <div className="text-[11px] text-(--text-on-dark-muted) line-through">
                            ${product.compareAtPrice.toFixed(2)}
                          </div>
                        )}
                      </td>
                      <td className="p-4">
                        <div className="flex items-center gap-2">
                          <span
                            className={`font-semibold px-2 py-0.5 rounded text-[11px] ${
                              isOut
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                : isLow
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                : 'bg-(--surface-card-subtle) text-(--text-on-dark)'
                            }`}
                          >
                            {product.stockQuantity} units
                          </span>
                        </div>
                        <span className="text-[10px] text-(--text-on-dark-muted) block mt-0.5">
                          Threshold: {product.lowStockThreshold}
                        </span>
                      </td>
                      <td className="p-4">
                        <StatusBadge status={product.status} />
                      </td>
                      <td className="p-4 text-right">
                        <div className="flex items-center justify-end gap-1.5">
                          {/* Quick Stock Adjust */}
                          <button
                            type="button"
                            onClick={() => {
                              setAdjustingProduct(product);
                              setAdjustDelta(0);
                              setAdjustReason('');
                              setSelectedVariantId(product.variants.length > 0 ? product.variants[0].id : '');
                            }}
                            className="p-1.5 rounded-lg text-cyan-600 dark:text-cyan-400 hover:bg-(--surface-card-subtle) transition-colors cursor-pointer"
                            title="Quick Stock Adjust"
                          >
                            <Boxes className="w-4 h-4" />
                          </button>

                          {/* View Audit History */}
                          <button
                            type="button"
                            onClick={() => openHistory(product)}
                            className="p-1.5 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--surface-card-subtle) transition-colors cursor-pointer"
                            title="View Stock History"
                          >
                            <History className="w-4 h-4" />
                          </button>

                          {/* Edit */}
                          <Link
                            href={`/vendor/products/${product.id}/edit`}
                            className="p-1.5 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--surface-card-subtle) transition-colors inline-block"
                            title="Edit Product"
                          >
                            <Edit3 className="w-3.5 h-3.5" />
                          </Link>

                          {/* Delete/Archive */}
                          <button
                            onClick={() => handleDelete(product.id, product.name)}
                            disabled={deletingId === product.id || product.status === 'ARCHIVED'}
                            className="p-1.5 rounded-lg text-(--text-on-dark-muted) hover:text-rose-500 hover:bg-rose-500/10 transition-colors disabled:opacity-30 cursor-pointer"
                            title={product.status === 'ARCHIVED' ? 'Archived' : 'Archive Product'}
                          >
                            <Trash2 className="w-4 h-4" />
                          </button>
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Quick Stock Adjustment Modal */}
      {adjustingProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-(--surface-card) border border-(--border-dark) rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-(--border-dark) pb-3">
              <div>
                <h3 className="text-sm font-bold text-(--text-on-dark)">Adjust Stock Level</h3>
                <p className="text-xs text-(--text-on-dark-muted) truncate max-w-70">
                  {adjustingProduct.name} ({adjustingProduct.sku})
                </p>
              </div>
              <button
                onClick={() => setAdjustingProduct(null)}
                className="p-1 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleStockAdjustSubmit} className="space-y-4 text-xs">
              {/* Variant Selector if variants exist */}
              {adjustingProduct.variants && adjustingProduct.variants.length > 0 && (
                <div className="space-y-1.5">
                  <label className="text-(--text-on-dark) font-semibold">Select Variant</label>
                  <select
                    value={selectedVariantId}
                    onChange={(e) => setSelectedVariantId(e.target.value)}
                    className="w-full px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  >
                    {adjustingProduct.variants.map((v) => (
                      <option key={v.id} value={v.id}>
                        {v.sku} - {Object.entries(v.options).map(([k, val]) => `${k}: ${val}`).join(', ')} (Stock: {v.stockQuantity})
                      </option>
                    ))}
                  </select>
                </div>
              )}

              {/* Current Stock Preview */}
              <div className="p-3 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) flex items-center justify-between">
                <span className="text-(--text-on-dark-muted)">Current Stock:</span>
                <span className="font-bold text-(--text-on-dark) text-sm">
                  {selectedVariantId
                    ? adjustingProduct.variants.find((v) => v.id === selectedVariantId)?.stockQuantity || 0
                    : adjustingProduct.stockQuantity}{' '}
                  units
                </span>
              </div>

              {/* Stock Delta Quick Buttons */}
              <div className="space-y-1.5">
                <label className="text-(--text-on-dark) font-semibold">Adjustment Delta</label>
                <div className="flex items-center gap-2">
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => d - 5)}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-500 font-bold cursor-pointer"
                  >
                    -5
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => d - 1)}
                    className="px-2.5 py-1.5 bg-rose-500/10 hover:bg-rose-500/20 border border-rose-500/30 rounded-lg text-rose-500 font-bold cursor-pointer"
                  >
                    -1
                  </button>
                  <input
                    type="number"
                    value={adjustDelta}
                    onChange={(e) => setAdjustDelta(parseInt(e.target.value, 10) || 0)}
                    className="w-20 px-3 py-1.5 bg-(--surface-card-subtle) border border-(--border-dark) rounded-lg text-center font-bold text-(--text-on-dark) text-sm focus:outline-none focus:border-emerald-500"
                  />
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => d + 1)}
                    className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                  >
                    +1
                  </button>
                  <button
                    type="button"
                    onClick={() => setAdjustDelta((d) => d + 5)}
                    className="px-2.5 py-1.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold cursor-pointer"
                  >
                    +5
                  </button>
                </div>
              </div>

              {/* Reason for Audit Trail */}
              <div className="space-y-1.5">
                <label className="text-(--text-on-dark) font-semibold">Reason (Audit Trail) *</label>
                <input
                  type="text"
                  required
                  value={adjustReason}
                  onChange={(e) => setAdjustReason(e.target.value)}
                  placeholder="e.g. Warehouse restock, Damaged goods removal, Count audit"
                  className="w-full px-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-(--border-dark)">
                <button
                  type="button"
                  onClick={() => setAdjustingProduct(null)}
                  className="px-4 py-2 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) font-semibold cursor-pointer border border-(--border-dark)"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={adjustingLoading || adjustDelta === 0}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                >
                  {adjustingLoading ? 'Applying...' : 'Apply Stock Change'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* Stock Audit History Modal */}
      {historyProduct && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-(--surface-card) border border-(--border-dark) rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-(--border-dark) pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-(--text-on-dark) flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  Inventory Audit History
                </h3>
                <p className="text-xs text-(--text-on-dark-muted) truncate max-w-md">
                  {historyProduct.name} ({historyProduct.sku})
                </p>
              </div>
              <button
                onClick={() => setHistoryProduct(null)}
                className="p-1 rounded-lg text-(--text-on-dark-muted) hover:text-(--text-on-dark) cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-(--text-on-dark-muted)">Loading history logs...</div>
              ) : historyLogs.length === 0 ? (
                <div className="py-12 text-center text-(--text-on-dark-muted) text-xs">
                  No inventory adjustments recorded for this product yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-(--text-on-dark-muted) uppercase tracking-wider border-b border-(--border-dark)">
                    <tr>
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Type</th>
                      <th className="pb-2 font-semibold">Change</th>
                      <th className="pb-2 font-semibold">Stock</th>
                      <th className="pb-2 font-semibold">Reason</th>
                      <th className="pb-2 font-semibold">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-(--border-dark)">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-(--surface-card-subtle)">
                        <td className="py-2.5 text-(--text-on-dark-muted) whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString()}{' '}
                          <span className="text-[10px] opacity-75">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-(--surface-card-subtle) text-(--text-on-dark) border border-(--border-dark)">
                            {log.adjustmentType}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">
                          <span className={log.quantityChanged > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                          </span>
                        </td>
                        <td className="py-2.5 text-(--text-on-dark-muted)">
                          {log.previousQuantity} &rarr; <span className="font-bold text-(--text-on-dark)">{log.newQuantity}</span>
                        </td>
                        <td className="py-2.5 text-(--text-on-dark-muted) max-w-37.5 truncate" title={log.reason || ''}>
                          {log.reason || '-'}
                          {log.variant && (
                            <span className="block text-[10px] text-indigo-500 font-mono">
                              var: {log.variant.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-(--text-on-dark-muted) text-[11px]">
                          {log.changedByUser?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-(--border-dark) flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setHistoryProduct(null)}
                className="px-4 py-2 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) border border-(--border-dark) font-semibold text-xs cursor-pointer"
              >
                Close History
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
