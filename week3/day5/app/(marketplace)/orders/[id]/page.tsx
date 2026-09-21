'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useParams, useRouter } from 'next/navigation';
import { 
  ArrowLeft, 
  Package, 
  Store, 
  Truck, 
  CreditCard, 
  AlertCircle, 
  XCircle, 
  RefreshCw,
  Clock
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmationModal } from '@/components/ConfirmationModal';

export default function CustomerOrderDetailPage() {
  const params = useParams();
  const router = useRouter();
  const orderId = params?.id as string;

  const [order, setOrder] = useState<any | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancelling, setCancelling] = useState(false);
  const [cancelMessage, setCancelMessage] = useState<string | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);

  const fetchOrderDetail = async () => {
    try {
      setLoading(true);
      const res = await fetch(`/api/orders/${orderId}`);
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
      } else {
        setError(json.error || 'Failed to load order details.');
      }
    } catch (err: any) {
      setError(err.message || 'Error loading order.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (orderId) {
      fetchOrderDetail();
    }
  }, [orderId]);

  const confirmCancelOrder = async () => {
    try {
      setCancelling(true);
      setCancelMessage(null);
      const res = await fetch(`/api/orders/${orderId}/cancel`, {
        method: 'PATCH',
      });
      const json = await res.json();
      if (json.success) {
        setOrder(json.data);
        setCancelMessage('Order has been cancelled successfully.');
        setShowCancelModal(false);
      } else {
        alert(json.error || 'Failed to cancel order.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error while cancelling order.');
    } finally {
      setCancelling(false);
    }
  };

  if (loading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading order #{orderId}...</span>
        </div>
      </div>
    );
  }

  if (error || !order) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark) px-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 shadow-sm">
          <AlertCircle className="w-12 h-12 text-rose-400 mx-auto" />
          <h2 className="text-xl font-bold">Unable to Load Order</h2>
          <p className="text-xs text-(--text-on-dark-muted)">{error || 'This order could not be found or you do not have permission to view it.'}</p>
          <Link
            href="/orders"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-sm font-semibold transition-colors"
          >
            Back to Orders
          </Link>
        </div>
      </div>
    );
  }

  const isCancellable = order.status !== 'CANCELLED' && order.status !== 'DELIVERED' &&
    !order.vendorOrders.some((vo: any) => vo.status === 'SHIPPED' || vo.status === 'DELIVERED');

  const formattedDate = new Date(order.createdAt).toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
  });

  return (
    <div className="w-full min-h-[90vh] bg-(--bg-canvas) text-(--text-on-dark) py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb & Navigation */}
        <div className="flex items-center justify-between border-b border-(--border-dark) pb-4">
          <Link
            href="/orders"
            className="text-xs text-(--text-on-dark-muted) hover:text-(--text-on-dark) flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to All Orders</span>
          </Link>

          {isCancellable && (
            <button
              onClick={() => setShowCancelModal(true)}
              disabled={cancelling}
              className="px-3.5 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-400 border border-rose-500/30 text-xs font-bold flex items-center gap-1.5 transition-colors cursor-pointer disabled:opacity-50"
            >
              <XCircle className="w-3.5 h-3.5" />
              <span>Cancel Full Order</span>
            </button>
          )}
        </div>

        {cancelMessage && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-xs font-semibold">
            {cancelMessage}
          </div>
        )}

        {/* Order Meta Card */}
        <div className="p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-6 shadow-sm">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-dark) pb-5">
            <div>
              <div className="flex items-center gap-3">
                <h1 className="text-xl sm:text-2xl font-extrabold tracking-tight text-(--text-on-dark) font-mono">
                  {order.orderNumber}
                </h1>
                <StatusBadge status={order.status} />
              </div>
              <p className="text-xs text-(--text-on-dark-muted) mt-1 flex items-center gap-1.5">
                <Clock className="w-3.5 h-3.5" />
                <span>Placed on {formattedDate}</span>
              </p>
            </div>

            <div className="text-right">
              <span className="text-xs text-(--text-on-dark-muted) block">Parent Order Total</span>
              <span className="text-2xl font-extrabold text-emerald-400">${order.totalAmount.toFixed(2)}</span>
            </div>
          </div>

          {/* Customer & Shipping Summary Grid */}
          <div className="grid grid-cols-1 md:grid-cols-3 gap-6 text-xs">
            <div className="space-y-1.5">
              <span className="font-bold text-(--text-on-dark) uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Truck className="w-3.5 h-3.5 text-emerald-500" />
                Shipping Destination
              </span>
              <p className="text-(--text-on-dark) font-semibold">{order.shippingName}</p>
              <p className="text-(--text-on-dark-muted)">{order.shippingAddress}, {order.shippingCity} {order.shippingPostalCode || ''}</p>
              <p className="text-(--text-on-dark-muted)">Phone: {order.shippingPhone}</p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-(--text-on-dark) uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <CreditCard className="w-3.5 h-3.5 text-emerald-500" />
                Payment & Billing
              </span>
              <p className="text-(--text-on-dark-muted)">Method: <strong className="text-(--text-on-dark)">{order.paymentMethod}</strong></p>
              <p className="text-(--text-on-dark-muted)">Status: <strong className="text-emerald-400">{order.paymentStatus}</strong></p>
              <p className="text-(--text-on-dark-muted)">Receipt: <span className="font-mono text-[11px]">{order.id}</span></p>
            </div>

            <div className="space-y-1.5">
              <span className="font-bold text-(--text-on-dark) uppercase tracking-wider text-[11px] flex items-center gap-1.5">
                <Store className="w-3.5 h-3.5 text-emerald-500" />
                Multi-Vendor Fulfillment
              </span>
              <p className="text-(--text-on-dark-muted)">
                Fulfillment is split into <strong className="text-(--text-on-dark)">{order.vendorOrders.length} packages</strong>. Each merchant manages tracking and shipping independently.
              </p>
            </div>
          </div>
        </div>

        {/* Vendor Packages Breakdown */}
        <div className="space-y-6">
          <h2 className="text-lg font-bold text-(--text-on-dark) flex items-center gap-2">
            <Package className="w-5 h-5 text-emerald-500" />
            <span>Fulfillment Packages ({order.vendorOrders.length})</span>
          </h2>

          {order.vendorOrders.map((vo: any) => (
            <div
              key={vo.id}
              className="rounded-2xl bg-(--surface-card) border border-(--border-dark) overflow-hidden shadow-sm"
            >
              {/* Package Header */}
              <div className="bg-(--surface-card-subtle) px-6 py-4 border-b border-(--border-dark) flex flex-col sm:flex-row sm:items-center justify-between gap-3">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-lg bg-(--bg-canvas) border border-(--border-dark) flex items-center justify-center font-bold text-emerald-500 text-xs overflow-hidden">
                    {vo.vendor.logoUrl ? (
                      <img src={vo.vendor.logoUrl} alt={vo.vendor.name} className="w-full h-full object-cover" />
                    ) : (
                      vo.vendor.name.charAt(0)
                    )}
                  </div>
                  <div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs font-bold text-emerald-400 bg-emerald-500/10 px-2 py-0.5 rounded border border-emerald-500/20">
                        {vo.vendorOrderNumber}
                      </span>
                      <Link
                        href={`/vendors/${vo.vendor.slug}`}
                        className="text-sm font-bold text-(--text-on-dark) hover:text-emerald-400 transition-colors"
                      >
                        {vo.vendor.name}
                      </Link>
                    </div>
                  </div>
                </div>

                <div className="flex items-center gap-3">
                  <StatusBadge status={vo.status} />
                  <span className="text-sm font-extrabold text-(--text-on-dark)">${vo.total.toFixed(2)}</span>
                </div>
              </div>

              {/* Items List */}
              <div className="p-6 divide-y divide-(--border-dark)">
                {vo.items.map((item: any) => (
                  <div key={item.id} className="py-4 first:pt-0 last:pb-0 flex items-center justify-between gap-4 text-xs">
                    <div className="space-y-1 min-w-0">
                      <p className="font-bold text-(--text-on-dark) text-sm">{item.productNameSnapshot}</p>
                      <p className="text-(--text-on-dark-muted) font-mono text-[11px]">SKU: {item.skuSnapshot}</p>
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

              {/* Package Financial Footer */}
              <div className="bg-(--surface-card-subtle)/40 px-6 py-3 border-t border-(--border-dark) flex flex-wrap justify-between text-xs text-(--text-on-dark-muted) gap-2">
                <span>Items Subtotal: <strong className="text-(--text-on-dark)">${vo.subtotal.toFixed(2)}</strong></span>
                <span>Fulfillment & Shipping: <strong className="text-emerald-400">${vo.shippingAmount.toFixed(2)}</strong></span>
                <span>Slice Total: <strong className="text-(--text-on-dark)">${vo.total.toFixed(2)}</strong></span>
              </div>
            </div>
          ))}
        </div>
      </div>

      <ConfirmationModal
        isOpen={showCancelModal}
        title="Cancel Order"
        message="Are you sure you want to cancel this entire order? Reserved inventory will be returned to merchants and payments will be refunded."
        confirmLabel="Cancel Order"
        variant="danger"
        isLoading={cancelling}
        onConfirm={confirmCancelOrder}
        onCancel={() => setShowCancelModal(false)}
      />
    </div>
  );
}
