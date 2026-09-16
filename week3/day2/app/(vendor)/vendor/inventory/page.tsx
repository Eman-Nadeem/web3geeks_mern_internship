'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { StatusBadge } from '@/components/StatusBadge';
import {
  Boxes,
  Package,
  TrendingDown,
  AlertTriangle,
  ArrowLeft,
  Plus,
  Minus,
  History,
  Search,
  X,
  Layers,
  RefreshCw,
  Box,
} from 'lucide-react';

interface ProductImage {
  id: string;
  url: string;
  isPrimary: boolean;
}

interface ProductVariant {
  id: string;
  sku: string;
  options: Record<string, string>;
  price: number | null;
  stockQuantity: number;
  status: string;
}

interface InventoryProduct {
  id: string;
  name: string;
  slug: string;
  sku: string;
  price: number;
  stockQuantity: number;
  lowStockThreshold: number;
  category: string;
  status: string;
  images: ProductImage[];
  variants: ProductVariant[];
  _count: { adjustments: number; variants: number };
}

interface InventoryStats {
  totalProducts: number;
  activeProducts: number;
  draftProducts: number;
  lowStockCount: number;
  outOfStockCount: number;
  totalInventoryUnits: number;
}

export default function VendorInventoryPage() {
  const [products, setProducts] = useState<InventoryProduct[]>([]);
  const [stats, setStats] = useState<InventoryStats | null>(null);
  const [loading, setLoading] = useState(true);
  const [search, setSearch] = useState('');
  const [activeTab, setActiveTab] = useState<'ALL' | 'LOW_STOCK' | 'OUT_OF_STOCK' | 'IN_STOCK'>('ALL');
  const [updatingId, setUpdatingId] = useState<string | null>(null);

  // History Drawer State
  const [selectedProductHistory, setSelectedProductHistory] = useState<InventoryProduct | null>(null);
  const [historyLogs, setHistoryLogs] = useState<any[]>([]);
  const [historyLoading, setHistoryLoading] = useState(false);

  // Exact Set Modal State
  const [setStockModal, setSetStockModal] = useState<{
    product: InventoryProduct;
    variantId?: string;
    currentStock: number;
  } | null>(null);
  const [exactQtyInput, setExactQtyInput] = useState<string>('0');
  const [exactReasonInput, setExactReasonInput] = useState<string>('');

  const fetchInventory = async () => {
    setLoading(true);
    try {
      let endpoint = '/api/vendor/inventory';
      if (activeTab === 'LOW_STOCK') {
        const res = await fetch('/api/vendor/inventory/low-stock');
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        }
      } else if (activeTab === 'OUT_OF_STOCK') {
        const res = await fetch('/api/vendor/inventory/out-of-stock');
        const data = await res.json();
        if (data.success) {
          setProducts(data.data);
        }
      } else {
        const res = await fetch(`/api/vendor/inventory${search ? `?search=${encodeURIComponent(search)}` : ''}`);
        const data = await res.json();
        if (data.success) {
          setProducts(data.data.products);
          setStats(data.data.stats);
        }
      }

      // Also ensure stats are loaded
      if (activeTab !== 'ALL' && !stats) {
        const statsRes = await fetch('/api/vendor/inventory');
        const statsData = await statsRes.json();
        if (statsData.success) {
          setStats(statsData.data.stats);
        }
      }
    } catch (err) {
      console.error('Failed to load inventory:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInventory();
  }, [activeTab]);

  const handleQuickDelta = async (productId: string, delta: number, variantId?: string) => {
    const key = variantId ? `${productId}-${variantId}` : productId;
    setUpdatingId(key);
    try {
      const res = await fetch(`/api/vendor/products/${productId}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId,
          delta,
          reason: delta > 0 ? 'Quick Restock' : 'Quick Stock Decrease',
          adjustmentType: delta > 0 ? 'RESTOCK' : 'MANUAL_ADJUSTMENT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to adjust stock');
        return;
      }

      // Refresh inventory
      fetchInventory();
    } catch {
      alert('Error updating stock');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleExactSetSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!setStockModal) return;

    const qty = parseInt(exactQtyInput, 10);
    if (isNaN(qty) || qty < 0) {
      alert('Stock quantity must be a non-negative integer');
      return;
    }

    try {
      const res = await fetch(`/api/vendor/products/${setStockModal.product.id}/stock`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          variantId: setStockModal.variantId,
          exactQuantity: qty,
          reason: exactReasonInput || 'Exact stock count override',
          adjustmentType: 'MANUAL_ADJUSTMENT',
        }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.error || 'Failed to update stock');
        return;
      }

      setSetStockModal(null);
      setExactQtyInput('0');
      setExactReasonInput('');
      fetchInventory();
    } catch {
      alert('Failed to set exact stock');
    }
  };

  const openHistory = async (product: InventoryProduct) => {
    setSelectedProductHistory(product);
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

  const filteredProducts = products.filter((p) => {
    if (search) {
      const term = search.toLowerCase();
      return (
        p.name.toLowerCase().includes(term) ||
        p.sku.toLowerCase().includes(term) ||
        p.category.toLowerCase().includes(term)
      );
    }
    return true;
  });

  return (
    <div className="space-y-6">
      {/* Top Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <div className="flex items-center gap-2">
            <Link
              href="/vendor/products"
              className="text-xs font-semibold text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] flex items-center gap-1 transition-colors"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              Products
            </Link>
          </div>
          <h2 className="text-2xl font-bold text-[var(--text-on-dark)] tracking-tight mt-1">Inventory Management</h2>
          <p className="text-xs text-[var(--text-on-dark-muted)]">
            Real-time stock level controls, quick delta adjustments, low-stock thresholds, and immutable audit logs.
          </p>
        </div>
      </div>

      {/* Stats Summary */}
      {stats && (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Total Units in Stock</span>
              <Boxes className="w-4 h-4 text-cyan-500" />
            </div>
            <div className="text-2xl font-bold text-cyan-600 dark:text-cyan-400">{stats.totalInventoryUnits}</div>
            <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Across all catalog products</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Low Stock Warnings</span>
              <TrendingDown className="w-4 h-4 text-amber-500" />
            </div>
            <div className="text-2xl font-bold text-amber-500">{stats.lowStockCount}</div>
            <span className="text-[11px] text-[var(--text-on-dark-muted)] block">At or below product threshold</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Out of Stock</span>
              <AlertTriangle className="w-4 h-4 text-rose-500" />
            </div>
            <div className="text-2xl font-bold text-rose-500">{stats.outOfStockCount}</div>
            <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Requires restocking</span>
          </div>

          <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-1 shadow-sm">
            <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
              <span className="text-[11px] font-semibold uppercase tracking-wider">Active Products</span>
              <Package className="w-4 h-4 text-emerald-500" />
            </div>
            <div className="text-2xl font-bold text-emerald-600 dark:text-emerald-400">{stats.activeProducts}</div>
            <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Published live in store</span>
          </div>
        </div>
      )}

      {/* Filter and Search Tabs */}
      <div className="p-4 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-3 shadow-sm">
        <div className="flex flex-col sm:flex-row items-center justify-between gap-3">
          <div className="flex items-center gap-2 overflow-x-auto w-full sm:w-auto">
            <button
              onClick={() => setActiveTab('ALL')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors cursor-pointer ${
                activeTab === 'ALL'
                  ? 'bg-emerald-600 text-white shadow-xs'
                  : 'text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]'
              }`}
            >
              All Inventory
            </button>
            <button
              onClick={() => setActiveTab('LOW_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'LOW_STOCK'
                  ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                  : 'text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]'
              }`}
            >
              <TrendingDown className="w-3.5 h-3.5 text-amber-500" />
              Low Stock Alerts
            </button>
            <button
              onClick={() => setActiveTab('OUT_OF_STOCK')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-colors flex items-center gap-1.5 cursor-pointer ${
                activeTab === 'OUT_OF_STOCK'
                  ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                  : 'text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)]'
              }`}
            >
              <AlertTriangle className="w-3.5 h-3.5 text-rose-500" />
              Out of Stock
            </button>
          </div>

          <div className="relative w-full sm:w-64">
            <Search className="w-4 h-4 text-[var(--text-on-dark-muted)] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              placeholder="Filter by title or SKU..."
              className="w-full pl-9 pr-4 py-1.5 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-xs text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>
      </div>

      {/* Inventory Table */}
      {loading ? (
        <div className="py-20 text-center text-xs text-[var(--text-on-dark-muted)] flex items-center justify-center gap-2">
          <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
          Loading inventory...
        </div>
      ) : filteredProducts.length === 0 ? (
        <div className="py-16 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] text-center space-y-3">
          <Box className="w-10 h-10 text-[var(--text-on-dark-muted)] mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-[var(--text-on-dark)]">No inventory matches</h3>
          <p className="text-xs text-[var(--text-on-dark-muted)]">All products are healthy or match your current filter.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-[var(--surface-card-subtle)] text-[11px] text-[var(--text-on-dark-muted)] uppercase tracking-wider border-b border-[var(--border-dark)]">
                <tr>
                  <th className="p-4 font-semibold">Product / Variant</th>
                  <th className="p-4 font-semibold">SKU</th>
                  <th className="p-4 font-semibold">Current Stock</th>
                  <th className="p-4 font-semibold">Low Threshold</th>
                  <th className="p-4 font-semibold">Quick Delta Adjust</th>
                  <th className="p-4 font-semibold">Exact Set</th>
                  <th className="p-4 font-semibold text-right">Audit History</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[var(--border-dark)]">
                {filteredProducts.map((product) => {
                  const primaryImg = product.images.find((img) => img.isPrimary) || product.images[0];
                  const isLow = product.stockQuantity > 0 && product.stockQuantity <= product.lowStockThreshold;
                  const isOut = product.stockQuantity === 0 || product.status === 'OUT_OF_STOCK';
                  const hasVariants = product.variants && product.variants.length > 0;

                  return (
                    <React.Fragment key={product.id}>
                      <tr className="hover:bg-[var(--surface-card-subtle)] transition-colors">
                        <td className="p-4">
                          <div className="flex items-center gap-3">
                            <div className="w-10 h-10 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] overflow-hidden flex items-center justify-center shrink-0">
                              {primaryImg ? (
                                <img src={primaryImg.url} alt={product.name} className="w-full h-full object-cover" />
                              ) : (
                                <Box className="w-4 h-4 text-[var(--text-on-dark-muted)]" />
                              )}
                            </div>
                            <div>
                              <div className="font-bold text-[var(--text-on-dark)] text-xs">{product.name}</div>
                              <span className="text-[11px] text-[var(--text-on-dark-muted)]">{product.category}</span>
                              {hasVariants && (
                                <span className="text-[10px] text-indigo-500 flex items-center gap-1 font-mono">
                                  <Layers className="w-3 h-3" />
                                  Variant-level inventory tracking active
                                </span>
                              )}
                            </div>
                          </div>
                        </td>
                        <td className="p-4 font-mono text-[var(--text-on-dark-muted)]">{product.sku}</td>
                        <td className="p-4">
                          <span
                            className={`font-bold px-2.5 py-1 rounded-lg text-xs ${
                              isOut
                                ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                : isLow
                                ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                : 'bg-emerald-500/10 text-emerald-600 dark:text-emerald-400 border border-emerald-500/30'
                            }`}
                          >
                            {product.stockQuantity} units
                          </span>
                        </td>
                        <td className="p-4 text-[var(--text-on-dark-muted)]">{product.lowStockThreshold} units</td>
                        <td className="p-4">
                          {!hasVariants ? (
                            <div className="flex items-center gap-1.5">
                              <button
                                type="button"
                                disabled={updatingId === product.id || product.stockQuantity === 0}
                                onClick={() => handleQuickDelta(product.id, -5)}
                                className="px-2 py-1 bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] border border-[var(--border-dark)] rounded-lg text-[var(--text-on-dark)] font-bold text-[11px] disabled:opacity-40 cursor-pointer"
                              >
                                -5
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === product.id || product.stockQuantity === 0}
                                onClick={() => handleQuickDelta(product.id, -1)}
                                className="px-2 py-1 bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] border border-[var(--border-dark)] rounded-lg text-[var(--text-on-dark)] font-bold text-[11px] disabled:opacity-40 cursor-pointer"
                              >
                                -1
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === product.id}
                                onClick={() => handleQuickDelta(product.id, 1)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-[11px] cursor-pointer"
                              >
                                +1
                              </button>
                              <button
                                type="button"
                                disabled={updatingId === product.id}
                                onClick={() => handleQuickDelta(product.id, 5)}
                                className="px-2 py-1 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded-lg text-emerald-600 dark:text-emerald-400 font-bold text-[11px] cursor-pointer"
                              >
                                +5
                              </button>
                            </div>
                          ) : (
                            <span className="text-[11px] text-[var(--text-on-dark-muted)] italic">Adjust below per variant</span>
                          )}
                        </td>
                        <td className="p-4">
                          {!hasVariants && (
                            <button
                              type="button"
                              onClick={() => {
                                setSetStockModal({
                                  product,
                                  currentStock: product.stockQuantity,
                                });
                                setExactQtyInput(product.stockQuantity.toString());
                              }}
                              className="px-2.5 py-1 rounded-lg bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] text-xs font-semibold transition-colors cursor-pointer"
                            >
                              Set Exact
                            </button>
                          )}
                        </td>
                        <td className="p-4 text-right">
                          <button
                            type="button"
                            onClick={() => openHistory(product)}
                            className="p-1.5 rounded-lg text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] hover:bg-[var(--surface-card-subtle)] transition-colors cursor-pointer"
                            title="View Audit History"
                          >
                            <History className="w-4 h-4" />
                          </button>
                        </td>
                      </tr>

                      {/* Variant Subrows */}
                      {hasVariants &&
                        product.variants.map((variant) => {
                          const vKey = `${product.id}-${variant.id}`;
                          const isVLow = variant.stockQuantity > 0 && variant.stockQuantity <= product.lowStockThreshold;
                          const isVOut = variant.stockQuantity === 0;

                          return (
                            <tr key={variant.id} className="bg-[var(--surface-card-subtle)]/50 hover:bg-[var(--surface-card-subtle)] transition-colors">
                              <td className="py-2.5 pl-12 pr-4 text-[var(--text-on-dark)]">
                                <div className="flex items-center gap-2">
                                  <span className="opacity-40">&lfloor;</span>
                                  <span className="font-semibold text-[var(--text-on-dark)]">
                                    {Object.entries(variant.options).map(([k, v]) => `${k}: ${v}`).join(' | ')}
                                  </span>
                                </div>
                              </td>
                              <td className="py-2.5 px-4 font-mono text-[11px] text-indigo-500">{variant.sku}</td>
                              <td className="py-2.5 px-4">
                                <span
                                  className={`px-2 py-0.5 rounded text-[11px] font-bold ${
                                    isVOut
                                      ? 'bg-rose-500/10 text-rose-500 border border-rose-500/30'
                                      : isVLow
                                      ? 'bg-amber-500/10 text-amber-500 border border-amber-500/30'
                                      : 'text-[var(--text-on-dark)]'
                                  }`}
                                >
                                  {variant.stockQuantity} units
                                </span>
                              </td>
                              <td className="py-2.5 px-4 text-[var(--text-on-dark-muted)] text-[11px]">-</td>
                              <td className="py-2.5 px-4">
                                <div className="flex items-center gap-1.5">
                                  <button
                                    type="button"
                                    disabled={updatingId === vKey || variant.stockQuantity === 0}
                                    onClick={() => handleQuickDelta(product.id, -1, variant.id)}
                                    className="px-2 py-0.5 bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] border border-[var(--border-dark)] rounded text-[var(--text-on-dark)] font-bold text-[10px] disabled:opacity-40 cursor-pointer"
                                  >
                                    -1
                                  </button>
                                  <button
                                    type="button"
                                    disabled={updatingId === vKey}
                                    onClick={() => handleQuickDelta(product.id, 1, variant.id)}
                                    className="px-2 py-0.5 bg-emerald-500/10 hover:bg-emerald-500/20 border border-emerald-500/30 rounded text-emerald-600 dark:text-emerald-400 font-bold text-[10px] cursor-pointer"
                                  >
                                    +1
                                  </button>
                                </div>
                              </td>
                              <td className="py-2.5 px-4">
                                <button
                                  type="button"
                                  onClick={() => {
                                    setSetStockModal({
                                      product,
                                      variantId: variant.id,
                                      currentStock: variant.stockQuantity,
                                    });
                                    setExactQtyInput(variant.stockQuantity.toString());
                                  }}
                                  className="px-2 py-0.5 rounded bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] text-[11px] font-semibold cursor-pointer"
                                >
                                  Set
                                </button>
                              </td>
                              <td className="py-2.5 px-4 text-right">
                                <span className="text-[10px] text-[var(--text-on-dark-muted)]">variant level</span>
                              </td>
                            </tr>
                          );
                        })}
                    </React.Fragment>
                  );
                })}
              </tbody>
            </table>
          </div>
        </div>
      )}

      {/* Set Exact Stock Modal */}
      {setStockModal && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-sm bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-3xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-[var(--border-dark)] pb-3">
              <h3 className="text-sm font-bold text-[var(--text-on-dark)]">Set Exact Inventory Count</h3>
              <button onClick={() => setSetStockModal(null)} className="text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] cursor-pointer">
                <X className="w-4 h-4" />
              </button>
            </div>

            <form onSubmit={handleExactSetSubmit} className="space-y-4 text-xs">
              <div className="p-3 rounded-xl bg-[var(--surface-card-subtle)] border border-[var(--border-dark)]">
                <div className="text-[var(--text-on-dark-muted)] text-[11px]">Product:</div>
                <div className="font-bold text-[var(--text-on-dark)] truncate">{setStockModal.product.name}</div>
                <div className="text-[var(--text-on-dark-muted)] text-[11px] mt-1">Current Stock: {setStockModal.currentStock} units</div>
              </div>

              <div className="space-y-1.5">
                <label className="text-[var(--text-on-dark)] font-semibold">New Exact Quantity *</label>
                <input
                  type="number"
                  min="0"
                  required
                  value={exactQtyInput}
                  onChange={(e) => setExactQtyInput(e.target.value)}
                  className="w-full px-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-[var(--text-on-dark)] font-bold text-base focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="space-y-1.5">
                <label className="text-[var(--text-on-dark)] font-semibold">Reason (Audit Trail) *</label>
                <input
                  type="text"
                  required
                  value={exactReasonInput}
                  onChange={(e) => setExactReasonInput(e.target.value)}
                  placeholder="e.g. Physical inventory recount"
                  className="w-full px-3 py-2 bg-[var(--surface-card-subtle)] border border-[var(--border-dark)] rounded-xl text-[var(--text-on-dark)] placeholder:text-[var(--text-on-dark-muted)] focus:outline-none focus:border-emerald-500"
                />
              </div>

              <div className="flex items-center justify-end gap-2 pt-3 border-t border-[var(--border-dark)]">
                <button
                  type="button"
                  onClick={() => setSetStockModal(null)}
                  className="px-4 py-2 rounded-xl bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] font-semibold cursor-pointer"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold cursor-pointer shadow-sm"
                >
                  Save Stock Count
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* History Audit Drawer */}
      {selectedProductHistory && (
        <div className="fixed inset-0 z-50 bg-black/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="w-full max-w-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] rounded-3xl p-6 shadow-2xl space-y-4 max-h-[85vh] flex flex-col">
            <div className="flex items-center justify-between border-b border-[var(--border-dark)] pb-3 shrink-0">
              <div>
                <h3 className="text-sm font-bold text-[var(--text-on-dark)] flex items-center gap-2">
                  <History className="w-4 h-4 text-emerald-500" />
                  Inventory Audit History
                </h3>
                <p className="text-xs text-[var(--text-on-dark-muted)] truncate max-w-md">
                  {selectedProductHistory.name} ({selectedProductHistory.sku})
                </p>
              </div>
              <button
                onClick={() => setSelectedProductHistory(null)}
                className="p-1 rounded-lg text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] cursor-pointer"
              >
                <X className="w-4 h-4" />
              </button>
            </div>

            <div className="overflow-y-auto flex-1 pr-1">
              {historyLoading ? (
                <div className="py-12 text-center text-xs text-[var(--text-on-dark-muted)]">Loading audit history...</div>
              ) : historyLogs.length === 0 ? (
                <div className="py-12 text-center text-[var(--text-on-dark-muted)] text-xs">
                  No inventory adjustments recorded for this product yet.
                </div>
              ) : (
                <table className="w-full text-left text-xs">
                  <thead className="text-[11px] text-[var(--text-on-dark-muted)] uppercase tracking-wider border-b border-[var(--border-dark)]">
                    <tr>
                      <th className="pb-2 font-semibold">Date</th>
                      <th className="pb-2 font-semibold">Type</th>
                      <th className="pb-2 font-semibold">Delta</th>
                      <th className="pb-2 font-semibold">Resulting Stock</th>
                      <th className="pb-2 font-semibold">Reason</th>
                      <th className="pb-2 font-semibold">Actor</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-[var(--border-dark)]">
                    {historyLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[var(--surface-card-subtle)]">
                        <td className="py-2.5 text-[var(--text-on-dark-muted)] whitespace-nowrap">
                          {new Date(log.createdAt).toLocaleDateString()}{' '}
                          <span className="text-[10px] opacity-75">
                            {new Date(log.createdAt).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                          </span>
                        </td>
                        <td className="py-2.5">
                          <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase bg-[var(--surface-card-subtle)] text-[var(--text-on-dark)] border border-[var(--border-dark)]">
                            {log.adjustmentType}
                          </span>
                        </td>
                        <td className="py-2.5 font-bold">
                          <span className={log.quantityChanged > 0 ? 'text-emerald-600 dark:text-emerald-400' : 'text-rose-500'}>
                            {log.quantityChanged > 0 ? `+${log.quantityChanged}` : log.quantityChanged}
                          </span>
                        </td>
                        <td className="py-2.5 text-[var(--text-on-dark-muted)]">
                          {log.previousQuantity} &rarr; <span className="font-bold text-[var(--text-on-dark)]">{log.newQuantity}</span>
                        </td>
                        <td className="py-2.5 text-[var(--text-on-dark-muted)] max-w-[150px] truncate" title={log.reason || ''}>
                          {log.reason || '-'}
                          {log.variant && (
                            <span className="block text-[10px] text-indigo-500 font-mono">
                              var: {log.variant.sku}
                            </span>
                          )}
                        </td>
                        <td className="py-2.5 text-[var(--text-on-dark-muted)] text-[11px]">
                          {log.changedByUser?.name || 'System'}
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              )}
            </div>

            <div className="pt-3 border-t border-[var(--border-dark)] flex justify-end shrink-0">
              <button
                type="button"
                onClick={() => setSelectedProductHistory(null)}
                className="px-4 py-2 rounded-xl bg-[var(--surface-card-subtle)] hover:bg-[var(--border-dark)] text-[var(--text-on-dark)] border border-[var(--border-dark)] font-semibold text-xs cursor-pointer"
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
