'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  Truck, 
  CheckCircle2, 
  Clock, 
  XCircle, 
  AlertTriangle, 
  RefreshCw,
  ShoppingBag,
  Send,
  Boxes
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { OrderStatus } from '@prisma/client';

export default function VendorOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [updatingStatus, setUpdatingStatus] = useState(false);
  const [statusFeedback, setStatusFeedback] = useState<string | null>(null);

  const fetchVendorOrder = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/vendor/orders/${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      } else {
        setError(json.error || 'Failed to fetch vendor order.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchVendorOrder();
    }
  }, [orderId]);

  const handleStatusTransition = async (nextStatus: OrderStatus) => {
    if (nextStatus === 'CANCELLED') {
      if (!confirm('Are you sure you want to cancel this order slice? Stock will be restored to your inventory.')) {
        return;
      }
    }

    try {
      setUpdatingStatus(true);
      setStatusFeedback(null);
      const res = await fetch(`/api/vendor/orders/${orderId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });
      const json = await res.json();
      if (json.success) {
        setStatusFeedback(`Order status successfully updated to ${nextStatus}.`);
        await fetchVendorOrder();
      } else {
        alert(json.error || 'Failed to update order status.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating status.');
    } finally {
      setUpdatingStatus(false);
    }
  };

  if (loading) {
    return (
      <div className="py-20 text-center text-sm text-(--text-on-dark-muted) flex items-center justify-center gap-3">
        <RefreshCw className="w-5 h-5 animate-spin text-emerald-500" />
        <span>Loading store order details...</span>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="p-8 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 max-w-md mx-auto">
        <AlertTriangle className="w-10 h-10 text-rose-400 mx-auto" />
        <h2 className="text-lg font-bold text-(--text-on-dark)">Access Restricted</h2>
        <p className="text-xs text-(--text-on-dark-muted)">{error || 'This order does not belong to your vendor store.'}</p>
        <Link
          href="/vendor/orders"
          className="inline-block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold transition-colors"
        >
          Back to Store Orders
        </Link>
      </div>
    );
  }

  const allowedNextStatuses: OrderStatus[] = order.allowedNextStatuses || [];
  const parent = order.order;

  return (
    <div className="space-y-6">
      {/* Header & Back */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-dark) pb-4">
        <Link
          href="/vendor/orders"
          className="text-xs text-(--text-on-dark-muted) hover:text-(--text-on-dark) flex items-center gap-1.5 transition-colors"
        >
          <ArrowLeft className="w-3.5 h-3.5" />
          <span>Back to Store Orders</span>
        </Link>

        <div className="flex items-center gap-2">
          <span className="text-xs text-(--text-on-dark-muted)">Parent Order:</span>
          <span className="font-mono text-xs font-bold text-(--text-on-dark) bg-(--surface-card-subtle) px-2.5 py-1 rounded border border-(--border-dark)">
            {parent.orderNumber}
          </span>
        </div>
      </div>

      {statusFeedback && (
        <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
          {statusFeedback}
        </div>
      )}

      {/* Main Order Card */}
      <div className="p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-6 shadow-sm">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-dark) pb-5">
          <div>
            <div className="flex items-center gap-3">
              <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-(--text-on-dark) font-mono">
                {order.vendorOrderNumber}
              </h1>
              <StatusBadge status={order.status} />
            </div>
            <p className="text-xs text-(--text-on-dark-muted) mt-1">
              Order Slice ID: <span className="font-mono">{order.id}</span>
            </p>
          </div>

          <div className="text-right">
            <span className="text-xs text-(--text-on-dark-muted) block">Your Store's Revenue</span>
            <span className="text-2xl font-extrabold text-emerald-400">${order.total.toFixed(2)}</span>
          </div>
        </div>

        {/* State Machine Transition Actions */}
        {allowedNextStatuses.length > 0 && order.status !== 'DELIVERED' && order.status !== 'CANCELLED' && (
          <div className="p-4 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) space-y-3">
            <span className="text-xs font-bold text-(--text-on-dark) block">
              Fulfillment Status Actions (Strict State Machine):
            </span>
            <div className="flex flex-wrap gap-2.5">
              {allowedNextStatuses.includes('CONFIRMED' as OrderStatus) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition('CONFIRMED' as OrderStatus)}
                  className="px-4 py-2 rounded-xl bg-amber-600 hover:bg-amber-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Order Slice</span>
                </button>
              )}

              {allowedNextStatuses.includes('PROCESSING' as OrderStatus) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition('PROCESSING' as OrderStatus)}
                  className="px-4 py-2 rounded-xl bg-sky-600 hover:bg-sky-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Clock className="w-3.5 h-3.5" />
                  <span>Start Processing & Packing</span>
                </button>
              )}

              {allowedNextStatuses.includes('SHIPPED' as OrderStatus) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition('SHIPPED' as OrderStatus)}
                  className="px-4 py-2 rounded-xl bg-indigo-600 hover:bg-indigo-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <Truck className="w-3.5 h-3.5" />
                  <span>Mark as Dispatched / Shipped</span>
                </button>
              )}

              {allowedNextStatuses.includes('DELIVERED' as OrderStatus) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition('DELIVERED' as OrderStatus)}
                  className="px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <CheckCircle2 className="w-3.5 h-3.5" />
                  <span>Confirm Customer Delivery</span>
                </button>
              )}

              {allowedNextStatuses.includes('CANCELLED' as OrderStatus) && (
                <button
                  type="button"
                  disabled={updatingStatus}
                  onClick={() => handleStatusTransition('CANCELLED' as OrderStatus)}
                  className="px-4 py-2 rounded-xl bg-rose-600/20 hover:bg-rose-600/30 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
                >
                  <XCircle className="w-3.5 h-3.5" />
                  <span>Cancel Slice & Restock Inventory</span>
                </button>
              )}
            </div>
          </div>
        )}

        {/* Customer Shipping & Contact Meta */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
          <div className="p-4 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) space-y-1.5">
            <span className="font-bold text-(--text-on-dark) uppercase tracking-wider text-[11px] flex items-center gap-1.5">
              <Truck className="w-3.5 h-3.5 text-emerald-500" />
              Recipient Shipping Address
            </span>
            <p className="text-(--text-on-dark) font-semibold text-sm">{parent.shippingName}</p>
            <p className="text-(--text-on-dark-muted)">{parent.shippingAddress}, {parent.shippingCity} {parent.shippingPostalCode || ''}</p>
            <p className="text-(--text-on-dark-muted)">Contact Phone: {parent.shippingPhone}</p>
            <p className="text-(--text-on-dark-muted)">Customer Email: {parent.shippingEmail}</p>
          </div>

          <div className="p-4 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) space-y-1.5">
            <span className="font-bold text-(--text-on-dark) uppercase tracking-wider text-[11px] block">
              Financial Breakdown
            </span>
            <div className="flex justify-between text-(--text-on-dark-muted)">
              <span>Items Subtotal:</span>
              <span className="font-semibold text-(--text-on-dark)">${order.subtotal.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-(--text-on-dark-muted)">
              <span>Merchant Shipping Fee:</span>
              <span className="font-semibold text-emerald-400">${order.shippingAmount.toFixed(2)}</span>
            </div>
            <div className="flex justify-between text-(--text-on-dark-muted) pt-2 border-t border-(--border-dark)">
              <span className="font-bold text-(--text-on-dark)">Net Slice Total:</span>
              <span className="text-base font-extrabold text-emerald-400">${order.total.toFixed(2)}</span>
            </div>
          </div>
        </div>

        {/* Ordered Items Table */}
        <div className="space-y-3">
          <h3 className="text-sm font-bold text-(--text-on-dark) flex items-center gap-2">
            <Package className="w-4 h-4 text-emerald-500" />
            <span>Items in this Fulfillment Package ({order.items.length})</span>
          </h3>

          <div className="rounded-xl border border-(--border-dark) overflow-hidden">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--surface-card-subtle) text-(--text-on-dark-muted) uppercase tracking-wider font-semibold border-b border-(--border-dark) text-[11px]">
                <tr>
                  <th className="py-3 px-4">Item Snapshot Name</th>
                  <th className="py-3 px-4">SKU</th>
                  <th className="py-3 px-4">Options</th>
                  <th className="py-3 px-4 text-right">Unit Price</th>
                  <th className="py-3 px-4 text-center">Qty</th>
                  <th className="py-3 px-4 text-right">Line Total</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-dark)">
                {order.items.map((item: any) => (
                  <tr key={item.id} className="hover:bg-(--surface-card-subtle)/50 transition-colors">
                    <td className="py-3.5 px-4 font-bold text-(--text-on-dark)">
                      {item.productNameSnapshot}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-(--text-on-dark-muted)">
                      {item.skuSnapshot}
                    </td>
                    <td className="py-3.5 px-4 text-cyan-400">
                      {item.variantOptionsSnapshot
                        ? Object.entries(item.variantOptionsSnapshot).map(([k, v]) => `${k}: ${v}`).join(', ')
                        : '—'}
                    </td>
                    <td className="py-3.5 px-4 text-right text-(--text-on-dark-muted)">
                      ${item.unitPriceSnapshot.toFixed(2)}
                    </td>
                    <td className="py-3.5 px-4 text-center font-bold text-(--text-on-dark)">
                      {item.quantity}
                    </td>
                    <td className="py-3.5 px-4 text-right font-bold text-emerald-400">
                      ${item.lineTotal.toFixed(2)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      </div>
    </div>
  );
}
