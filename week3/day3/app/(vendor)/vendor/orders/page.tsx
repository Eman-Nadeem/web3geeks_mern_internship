'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Search, 
  Filter, 
  ArrowRight, 
  Clock, 
  CheckCircle2, 
  Truck, 
  Package, 
  DollarSign, 
  XCircle,
  RefreshCw
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function VendorOrdersDashboardPage() {
  const [orders, setOrders] = useState<any[]>([]);
  const [stats, setStats] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [statusFilter, setStatusFilter] = useState('ALL');
  const [searchQuery, setSearchQuery] = useState('');

  const fetchVendorOrders = async () => {
    try {
      setLoading(true);
      const url = statusFilter !== 'ALL' 
        ? `/api/vendor/orders?status=${statusFilter}`
        : '/api/vendor/orders';
      const res = await fetch(url);
      const json = await res.json();
      if (json.success) {
        setOrders(json.data.orders || []);
        setStats(json.data.stats || null);
      }
    } catch (err) {
      console.error('Error fetching vendor orders:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendorOrders();
  }, [statusFilter]);

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.vendorOrderNumber.toLowerCase().includes(q) ||
      o.parentOrderNumber.toLowerCase().includes(q) ||
      o.customerName.toLowerCase().includes(q) ||
      o.customerEmail?.toLowerCase().includes(q)
    );
  });

  return (
    <div className="space-y-6">
      {/* Top Banner */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-xl sm:text-2xl font-extrabold tracking-tight text-(--text-on-dark) flex items-center gap-2.5">
            <ShoppingBag className="w-6 h-6 text-amber-500" />
            <span>Store Orders & Fulfillment</span>
          </h2>
          <p className="text-xs text-(--text-on-dark-muted) mt-1">
            Manage your store's isolated slice of multi-vendor customer checkouts.
          </p>
        </div>

        <button
          onClick={fetchVendorOrders}
          className="px-3.5 py-1.5 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) border border-(--border-dark) text-xs font-semibold text-(--text-on-dark) flex items-center gap-1.5 self-start sm:self-auto cursor-pointer transition-colors"
        >
          <RefreshCw className={`w-3.5 h-3.5 ${loading ? 'animate-spin text-emerald-500' : ''}`} />
          <span>Refresh</span>
        </button>
      </div>

      {/* KPI Stats Grid */}
      {stats && (
        <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-3">
          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-(--text-on-dark-muted) uppercase tracking-wider font-bold block">Total Orders</span>
            <span className="text-xl font-extrabold text-(--text-on-dark)">{stats.totalOrders}</span>
          </div>

          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-amber-400 uppercase tracking-wider font-bold block">Confirmed</span>
            <span className="text-xl font-extrabold text-amber-400">{stats.confirmedCount + stats.pendingCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-sky-400 uppercase tracking-wider font-bold block">Processing</span>
            <span className="text-xl font-extrabold text-sky-400">{stats.processingCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-indigo-400 uppercase tracking-wider font-bold block">Shipped</span>
            <span className="text-xl font-extrabold text-indigo-400">{stats.shippedCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-emerald-400 uppercase tracking-wider font-bold block">Delivered</span>
            <span className="text-xl font-extrabold text-emerald-400">{stats.deliveredCount}</span>
          </div>

          <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-1">
            <span className="text-[10px] text-emerald-500 uppercase tracking-wider font-bold block">Store Revenue</span>
            <span className="text-xl font-extrabold text-emerald-500">${stats.totalRevenue.toFixed(2)}</span>
          </div>
        </div>
      )}

      {/* Filter Tabs & Search Bar */}
      <div className="p-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) flex flex-col md:flex-row items-center justify-between gap-4">
        {/* Status Pills */}
        <div className="flex items-center gap-1.5 overflow-x-auto w-full md:w-auto no-scrollbar">
          {['ALL', 'CONFIRMED', 'PROCESSING', 'SHIPPED', 'DELIVERED', 'CANCELLED'].map((tab) => {
            const isActive = statusFilter === tab;
            return (
              <button
                key={tab}
                onClick={() => setStatusFilter(tab)}
                className={`px-3 py-1.5 rounded-lg text-xs font-bold transition-colors cursor-pointer shrink-0 ${
                  isActive
                    ? 'bg-emerald-600 text-white shadow-sm'
                    : 'bg-(--surface-card-subtle) text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--border-dark)'
                }`}
              >
                {tab === 'ALL' ? 'All Orders' : tab}
              </button>
            );
          })}
        </div>

        {/* Search */}
        <div className="relative w-full md:max-w-xs">
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search order #, customer..."
            className="w-full pl-9 pr-4 py-1.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-xs text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
          />
          <Search className="w-3.5 h-3.5 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
        </div>
      </div>

      {/* Orders Table */}
      <div className="rounded-2xl bg-(--surface-card) border border-(--border-dark) overflow-hidden shadow-sm">
        {loading ? (
          <div className="py-20 text-center text-sm text-(--text-on-dark-muted) flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Loading store orders...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 text-center space-y-3 px-4">
            <Package className="w-10 h-10 text-(--text-on-dark-muted) mx-auto opacity-50" />
            <h3 className="text-sm font-bold text-(--text-on-dark)">No Store Orders Found</h3>
            <p className="text-xs text-(--text-on-dark-muted)">
              {statusFilter !== 'ALL'
                ? `There are currently no orders in ${statusFilter} status.`
                : 'Customer orders containing your products will appear here.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--surface-card-subtle) text-(--text-on-dark-muted) uppercase tracking-wider font-semibold border-b border-(--border-dark) text-[11px]">
                <tr>
                  <th className="py-3 px-4">Order Slice #</th>
                  <th className="py-3 px-4">Customer</th>
                  <th className="py-3 px-4">Items / Qty</th>
                  <th className="py-3 px-4">Slice Revenue</th>
                  <th className="py-3 px-4">Fulfillment Status</th>
                  <th className="py-3 px-4">Date</th>
                  <th className="py-3 px-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-dark)">
                {filteredOrders.map((vo) => {
                  const dateStr = new Date(vo.createdAt).toLocaleDateString('en-US', {
                    month: 'short',
                    day: 'numeric',
                    year: 'numeric',
                  });

                  return (
                    <tr key={vo.id} className="hover:bg-(--surface-card-subtle)/50 transition-colors">
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-mono font-bold text-(--text-on-dark) block text-sm">
                            {vo.vendorOrderNumber}
                          </span>
                          <span className="text-[10px] text-(--text-on-dark-muted) font-mono">
                            Parent: {vo.parentOrderNumber}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-semibold text-(--text-on-dark) block truncate max-w-40">
                            {vo.customerName}
                          </span>
                          <span className="text-[11px] text-(--text-on-dark-muted) truncate max-w-40 block">
                            {vo.shippingAddress}
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <span className="font-medium text-(--text-on-dark)">
                          {vo.itemsCount} {vo.itemsCount === 1 ? 'unit' : 'units'}
                        </span>
                      </td>
                      <td className="py-3.5 px-4">
                        <div className="space-y-0.5">
                          <span className="font-extrabold text-(--text-on-dark) text-sm">
                            ${vo.subtotal.toFixed(2)}
                          </span>
                          <span className="text-[10px] text-emerald-400 block font-medium">
                            +${vo.shippingAmount.toFixed(2)} shipping
                          </span>
                        </div>
                      </td>
                      <td className="py-3.5 px-4">
                        <StatusBadge status={vo.status} />
                      </td>
                      <td className="py-3.5 px-4 text-(--text-on-dark-muted)">
                        {dateStr}
                      </td>
                      <td className="py-3.5 px-4 text-right">
                        <Link
                          href={`/vendor/orders/${vo.id}`}
                          className="inline-flex items-center gap-1 px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-bold text-(--text-on-dark) border border-(--border-dark) transition-colors"
                        >
                          <span>Manage</span>
                          <ArrowRight className="w-3 h-3" />
                        </Link>
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
