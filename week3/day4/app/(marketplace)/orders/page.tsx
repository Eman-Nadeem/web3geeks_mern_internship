'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingBag, 
  Store, 
  ArrowRight, 
  Clock, 
  Package, 
  Truck, 
  RefreshCw,
  Search
} from 'lucide-react';
import { AuthGuardPrompt } from '@/components/AuthGuardPrompt';
import { StatusBadge } from '@/components/StatusBadge';

export default function CustomerOrdersPage() {
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [orders, setOrders] = useState<any[]>([]);
  const [loadingOrders, setLoadingOrders] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          setUser(data.data);
          fetchOrders();
        } else {
          setUser(null);
          setLoadingOrders(false);
        }
      })
      .catch(() => {
        setUser(null);
        setLoadingOrders(false);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const fetchOrders = async () => {
    try {
      setLoadingOrders(true);
      const res = await fetch('/api/orders');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setOrders(json.data || []);
        }
      }
    } catch (err) {
      console.error('Error loading customer orders:', err);
    } finally {
      setLoadingOrders(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading your order history...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGuardPrompt
        title="Sign in to view your orders"
        description="Access your complete order history, track multi-vendor shipments, and download receipts."
        icon={<ShoppingBag className="w-6 h-6" />}
      />
    );
  }

  const filteredOrders = orders.filter((o) => {
    if (!searchQuery.trim()) return true;
    const q = searchQuery.toLowerCase();
    return (
      o.orderNumber.toLowerCase().includes(q) ||
      o.vendorNames?.some((name: string) => name.toLowerCase().includes(q))
    );
  });

  return (
    <div className="w-full min-h-[85vh] bg-(--bg-canvas) text-(--text-on-dark) py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-(--border-dark) pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text-on-dark) flex items-center gap-3">
              <span>My Order History</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-(--surface-card-subtle) text-emerald-600 dark:text-emerald-400 border border-(--border-dark) font-bold">
                {orders.length} {orders.length === 1 ? 'order' : 'orders'}
              </span>
            </h1>
            <p className="text-[13px] text-(--text-on-dark-muted) mt-1">
              Track independent vendor packages and fulfillment progress.
            </p>
          </div>

          {orders.length > 0 && (
            <div className="relative max-w-xs w-full">
              <input
                type="text"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                placeholder="Search by order # or store..."
                className="w-full pl-9 pr-4 py-2 rounded-xl bg-(--surface-card) border border-(--border-dark) text-xs text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
              />
              <Search className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
            </div>
          )}
        </div>

        {/* Orders List */}
        {loadingOrders ? (
          <div className="py-20 text-center text-sm text-(--text-on-dark-muted) flex items-center justify-center gap-2">
            <RefreshCw className="w-4 h-4 animate-spin text-emerald-500" />
            <span>Fetching order records...</span>
          </div>
        ) : filteredOrders.length === 0 ? (
          <div className="py-20 px-4 max-w-md mx-auto rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-(--surface-card-subtle) text-(--text-on-dark-muted) flex items-center justify-center mx-auto border border-(--border-dark)">
              <Package className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-(--text-on-dark)">
              {searchQuery ? 'No Matching Orders' : 'No Orders Placed Yet'}
            </h2>
            <p className="text-[13px] text-(--text-on-dark-muted)">
              {searchQuery
                ? 'Try searching with a different order number or merchant name.'
                : 'Your multi-vendor purchases and package tracking will appear here.'}
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-semibold transition-colors shadow-sm"
              >
                Browse Marketplace Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="space-y-4">
            {filteredOrders.map((order) => {
              const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
                month: 'short',
                day: 'numeric',
                year: 'numeric',
              });

              return (
                <div
                  key={order.id}
                  className="rounded-2xl bg-(--surface-card) border border-(--border-dark) overflow-hidden shadow-sm hover:border-slate-500/50 transition-colors"
                >
                  {/* Top Bar */}
                  <div className="bg-(--surface-card-subtle) px-6 py-4 border-b border-(--border-dark) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                    <div className="flex items-center gap-4 flex-wrap">
                      <div>
                        <span className="text-[11px] text-(--text-on-dark-muted) block uppercase tracking-wider">Order Reference</span>
                        <span className="text-base font-extrabold text-(--text-on-dark) font-mono">{order.orderNumber}</span>
                      </div>
                      <div className="h-6 w-px bg-(--border-dark) hidden sm:block" />
                      <div>
                        <span className="text-[11px] text-(--text-on-dark-muted) block uppercase tracking-wider">Date Placed</span>
                        <span className="text-xs font-semibold text-(--text-on-dark)">{formattedDate}</span>
                      </div>
                      <div className="h-6 w-px bg-(--border-dark) hidden sm:block" />
                      <div>
                        <span className="text-[11px] text-(--text-on-dark-muted) block uppercase tracking-wider">Total Amount</span>
                        <span className="text-xs font-bold text-emerald-400">${order.totalAmount.toFixed(2)}</span>
                      </div>
                    </div>

                    <div className="flex items-center gap-3 self-start sm:self-auto">
                      <StatusBadge status={order.status} />
                      <Link
                        href={`/orders/${order.id}`}
                        className="px-3.5 py-1.5 rounded-lg bg-(--bg-canvas) hover:bg-(--border-dark) text-xs font-bold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
                      >
                        <span>View Details</span>
                        <ArrowRight className="w-3 h-3" />
                      </Link>
                    </div>
                  </div>

                  {/* Merchant Slices Overview */}
                  <div className="p-6 space-y-3">
                    <div className="text-xs text-(--text-on-dark-muted) flex items-center gap-2">
                      <Store className="w-4 h-4 text-emerald-500" />
                      <span>
                        Contains <strong className="text-(--text-on-dark)">{order.totalItemCount} items</strong> across{' '}
                        <strong className="text-(--text-on-dark)">{order.vendorCount} independent {order.vendorCount === 1 ? 'store' : 'stores'}</strong>:
                      </span>
                    </div>

                    <div className="flex flex-wrap gap-2 pt-1">
                      {order.vendorOrders.map((vo: any) => (
                        <div
                          key={vo.id}
                          className="px-3 py-1.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-xs flex items-center gap-2"
                        >
                          <span className="font-mono text-[11px] text-emerald-400 font-bold">{vo.vendorOrderNumber}</span>
                          <span className="font-semibold text-(--text-on-dark)">{vo.vendor.name}</span>
                          <span className="opacity-40">•</span>
                          <span className="text-[11px] text-(--text-on-dark-muted)">{vo.status}</span>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
