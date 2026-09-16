'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams } from 'next/navigation';
import { 
  CheckCircle2, 
  Package, 
  Store, 
  Truck, 
  ArrowRight, 
  Clock, 
  CreditCard,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function OrderSuccessPage() {
  const params = useParams();
  const orderId = params?.id as string;
  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (!orderId) return;
    fetch(`/api/orders/${orderId}`)
      .then((res) => res.json())
      .then((json) => {
        if (json.success) {
          setOrder(json.data);
        } else {
          setError(json.error || 'Failed to load order confirmation.');
        }
      })
      .catch((err) => setError(err.message))
      .finally(() => setLoading(false));
  }, [orderId]);

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading your order confirmation...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark) px-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4">
          <h2 className="text-xl font-bold text-rose-400">Order Not Found</h2>
          <p className="text-xs text-(--text-on-dark-muted)">{error || 'Could not locate order details.'}</p>
          <Link
            href="/orders"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            Go to My Orders
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[90vh] bg-(--bg-canvas) text-(--text-on-dark) py-12 transition-colors duration-200">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Success Header Banner */}
        <div className="p-8 rounded-3xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 shadow-sm">
          <div className="w-16 h-16 rounded-full bg-emerald-500/10 text-emerald-400 flex items-center justify-center mx-auto border border-emerald-500/30">
            <CheckCircle2 className="w-8 h-8 stroke-[2.5]" />
          </div>
          <div className="space-y-1">
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight text-(--text-on-dark)">
              Thank You for Your Order!
            </h1>
            <p className="text-sm text-(--text-on-dark-muted)">
              Parent Order Reference: <strong className="text-(--text-on-dark) font-mono">{order.orderNumber}</strong>
            </p>
          </div>
          
          <div className="p-4 rounded-2xl bg-(--surface-card-subtle) border border-(--border-dark) text-xs text-(--text-on-dark-muted) max-w-xl mx-auto text-left flex items-start gap-3">
            <Store className="w-5 h-5 text-emerald-500 shrink-0 mt-0.5" />
            <div>
              <span className="font-bold text-(--text-on-dark) block">Multi-Vendor Order Splitting Notice</span>
              <span>
                Your purchase contains items from <strong className="text-(--text-on-dark)">{order.vendorOrders.length} independent {order.vendorOrders.length === 1 ? 'merchant' : 'merchants'}</strong>. 
                Each merchant will prepare, fulfill, and ship their respective items directly to your address.
              </span>
            </div>
          </div>
        </div>

        {/* Shipping & Payment Meta */}
        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-(--text-on-dark) text-sm">
              <Truck className="w-4 h-4 text-emerald-500" />
              <span>Shipping Destination</span>
            </div>
            <p className="text-(--text-on-dark) font-semibold">{order.shippingName}</p>
            <p className="text-(--text-on-dark-muted)">{order.shippingAddress}, {order.shippingCity} {order.shippingPostalCode || ''}</p>
            <p className="text-(--text-on-dark-muted)">Phone: {order.shippingPhone}</p>
            <p className="text-(--text-on-dark-muted)">Email: {order.shippingEmail}</p>
          </div>

          <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2 text-xs">
            <div className="flex items-center gap-2 font-bold text-(--text-on-dark) text-sm">
              <CreditCard className="w-4 h-4 text-emerald-500" />
              <span>Payment & Summary</span>
            </div>
            <div className="flex justify-between text-(--text-on-dark-muted)">
              <span>Payment Method:</span>
              <span className="font-semibold text-(--text-on-dark)">{order.paymentMethod}</span>
            </div>
            <div className="flex justify-between text-(--text-on-dark-muted)">
              <span>Payment Status:</span>
              <span className="font-bold text-emerald-400">{order.paymentStatus}</span>
            </div>
            <div className="flex justify-between text-(--text-on-dark-muted) pt-2 border-t border-(--border-dark)">
              <span className="font-bold text-(--text-on-dark)">Total Charged:</span>
              <span className="text-base font-extrabold text-emerald-500">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Vendor Orders Slices Breakdown */}
        <div className="space-y-4">
          <h2 className="text-lg font-bold text-(--text-on-dark) flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <span>Fulfillment Packages ({order.vendorOrders.length})</span>
          </h2>

          {order.vendorOrders.map((vo: any) => (
            <div
              key={vo.id}
              className="rounded-2xl bg-(--surface-card) border border-(--border-dark) overflow-hidden shadow-sm"
            >
              {/* Slice Header */}
              <div className="bg-(--surface-card-subtle) px-5 py-3.5 border-b border-(--border-dark) flex items-center justify-between flex-wrap gap-2">
                <div className="flex items-center gap-2.5">
                  <span className="font-mono text-xs font-bold px-2 py-0.5 rounded bg-emerald-500/10 text-emerald-400 border border-emerald-500/20">
                    {vo.vendorOrderNumber}
                  </span>
                  <span className="font-bold text-sm text-(--text-on-dark)">{vo.vendor.name}</span>
                </div>
                <div className="flex items-center gap-3">
                  <StatusBadge status={vo.status} />
                  <span className="text-xs font-bold text-(--text-on-dark)">${vo.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Items Table */}
              <div className="p-5 divide-y divide-(--border-dark)">
                {vo.items.map((item: any) => (
                  <div key={item.id} className="py-3 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-0.5 min-w-0">
                      <p className="font-bold text-(--text-on-dark) text-sm truncate">{item.productNameSnapshot}</p>
                      <p className="text-(--text-on-dark-muted) font-mono">SKU: {item.skuSnapshot}</p>
                      {item.variantOptionsSnapshot && (
                        <p className="text-cyan-400">
                          {Object.entries(item.variantOptionsSnapshot)
                            .map(([k, v]) => `${k}: ${v}`)
                            .join(', ')}
                        </p>
                      )}
                    </div>
                    <div className="text-right shrink-0">
                      <p className="font-bold text-(--text-on-dark) text-sm">${item.lineTotal.toFixed(2)}</p>
                      <p className="text-(--text-on-dark-muted)">${item.unitPriceSnapshot.toFixed(2)} × {item.quantity}</p>
                    </div>
                  </div>
                ))}
              </div>

              <div className="bg-(--surface-card-subtle)/40 px-5 py-2.5 border-t border-(--border-dark) flex justify-between text-[11px] text-(--text-on-dark-muted)">
                <span>Subtotal: ${vo.subtotal.toFixed(2)}</span>
                <span>Fulfillment & Shipping: ${vo.shippingAmount.toFixed(2)}</span>
                <span className="font-bold text-(--text-on-dark)">Slice Total: ${vo.total.toFixed(2)}</span>
              </div>
            </div>
          ))}
        </div>

        {/* Action Buttons */}
        <div className="flex flex-col sm:flex-row items-center justify-center gap-4 pt-4">
          <Link
            href="/orders"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-sm text-center transition-colors shadow-sm"
          >
            View Customer Order History
          </Link>
          <Link
            href="/products"
            className="w-full sm:w-auto px-6 py-3 rounded-xl bg-(--surface-card-subtle) hover:bg-(--border-dark) border border-(--border-dark) text-(--text-on-dark) font-semibold text-sm text-center transition-colors"
          >
            Continue Shopping
          </Link>
        </div>
      </div>
    </div>
  );
}
