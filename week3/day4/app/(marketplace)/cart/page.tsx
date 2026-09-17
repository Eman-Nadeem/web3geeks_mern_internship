'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Store,
  AlertTriangle,
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { AuthGuardPrompt } from '@/components/AuthGuardPrompt';
import { useCartWishlist } from '@/components/CartWishlistContext';

export default function CartPage() {
  const router = useRouter();
  const { cart, removeFromCart, updateQuantity, clearCart, refreshCart } = useCartWishlist();
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartData, setCartData] = useState<any | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);
  const [validating, setValidating] = useState(false);
  const [validationResult, setValidationResult] = useState<any | null>(null);

  const fetchServerCart = async () => {
    try {
      setLoadingCart(true);
      const res = await fetch('/api/cart');
      if (res.ok) {
        const json = await res.json();
        if (json.success) {
          setCartData(json.data);
        }
      }
    } catch (err) {
      console.error('Failed to fetch server cart:', err);
    } finally {
      setLoadingCart(false);
    }
  };

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          setUser(data.data);
          fetchServerCart();
        } else {
          setUser(null);
          setLoadingCart(false);
        }
      })
      .catch(() => {
        setUser(null);
        setLoadingCart(false);
      })
      .finally(() => setAuthLoading(false));
  }, []);

  const handleUpdateQty = async (itemId: string, newQty: number) => {
    await updateQuantity(itemId, newQty);
    await fetchServerCart();
  };

  const handleRemove = async (itemId: string) => {
    await removeFromCart(itemId);
    await fetchServerCart();
  };

  const handleClear = async () => {
    await clearCart();
    await fetchServerCart();
  };

  const validateCartBeforeCheckout = async () => {
    try {
      setValidating(true);
      const res = await fetch('/api/checkout/validate', { method: 'POST' });
      const json = await res.json();
      if (json.success) {
        setValidationResult(json.data);
        if (json.data.isValid) {
          router.push('/checkout');
        }
      }
    } catch (err) {
      console.error('Validation error:', err);
    } finally {
      setValidating(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading your shopping cart...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Guard Prompt
  if (!user) {
    return (
      <AuthGuardPrompt
        title="Sign in to view your shopping cart"
        description="Sign in to synchronize your items across sessions, calculate vendor shipping rates, and proceed to multi-vendor checkout."
        icon={<ShoppingCart className="w-6 h-6" />}
      />
    );
  }

  const vendorGroups = cartData?.vendorGroups || [];
  const totalItems = cartData?.totalItems ?? cart.reduce((sum, item) => sum + item.quantity, 0);
  const subtotal = cartData?.subtotal ?? cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shippingTotal = cartData?.shippingTotal ?? (vendorGroups.length > 0 ? vendorGroups.length * 10 : (cart.length > 0 ? 10 : 0));
  const grandTotal = cartData?.grandTotal ?? Number((subtotal + shippingTotal).toFixed(2));

  return (
    <div className="w-full min-h-[85vh] bg-(--bg-canvas) text-(--text-on-dark) py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-(--border-dark) pb-5 flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-(--text-on-dark) flex items-center gap-3">
              <span>Multi-Vendor Shopping Cart</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-(--surface-card-subtle) text-emerald-600 dark:text-emerald-400 border border-(--border-dark) font-bold">
                {totalItems} {totalItems === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <p className="text-[13px] text-(--text-on-dark-muted) mt-1">
              Items are grouped by merchant and will be fulfilled independently in one single checkout.
            </p>
          </div>

          {totalItems > 0 && (
            <div className="flex items-center gap-3">
              <button
                onClick={handleClear}
                className="text-xs text-(--text-on-dark-muted) hover:text-rose-400 transition-colors flex items-center gap-1.5 px-3 py-1.5 rounded-lg border border-(--border-dark) bg-(--surface-card) cursor-pointer"
              >
                <Trash2 className="w-3.5 h-3.5" />
                <span>Clear Cart</span>
              </button>
              <Link
                href="/products"
                className="text-xs text-emerald-600 dark:text-emerald-400 hover:underline flex items-center gap-1"
              >
                Continue Shopping
              </Link>
            </div>
          )}
        </div>

        {/* Validation Warning Alert (if any items failed) */}
        {validationResult && !validationResult.isValid && validationResult.invalidItems?.length > 0 && (
          <div className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-300 text-xs space-y-2">
            <div className="flex items-center gap-2 font-bold text-sm">
              <AlertTriangle className="w-4 h-4 text-amber-400 shrink-0" />
              <span>Cart items require your attention before checkout</span>
            </div>
            <ul className="list-disc list-inside space-y-1 text-amber-200/90 pl-1">
              {validationResult.invalidItems.map((inv: any, idx: number) => (
                <li key={idx}>
                  <span className="font-semibold">{inv.productName || 'Item'}:</span> {inv.message}
                </li>
              ))}
            </ul>
          </div>
        )}

        {totalItems === 0 ? (
          <div className="py-20 px-4 max-w-md mx-auto rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-(--surface-card-subtle) text-(--text-on-dark-muted) flex items-center justify-center mx-auto border border-(--border-dark)">
              <ShoppingCart className="w-8 h-8 text-emerald-500" />
            </div>
            <h2 className="text-xl font-bold tracking-tight text-(--text-on-dark)">Your Cart is Empty</h2>
            <p className="text-[13px] text-(--text-on-dark-muted) leading-relaxed">
              Explore verified independent vendor stores, artisan mechanical keyboards, and precision audio gear.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-semibold transition-colors shadow-sm"
              >
                Explore Marketplace Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Vendor-Grouped Items Column (8 cols) */}
            <div className="lg:col-span-8 space-y-6">
              {vendorGroups.map((group: any) => (
                <div
                  key={group.vendor.id}
                  className="rounded-2xl bg-(--surface-card) border border-(--border-dark) overflow-hidden shadow-sm"
                >
                  {/* Vendor Slice Header */}
                  <div className="bg-(--surface-card-subtle) px-5 py-3.5 border-b border-(--border-dark) flex items-center justify-between flex-wrap gap-2">
                    <div className="flex items-center gap-3">
                      <div className="w-7 h-7 rounded-md bg-(--bg-canvas) border border-(--border-dark) flex items-center justify-center text-xs font-bold text-emerald-500 overflow-hidden">
                        {group.vendor.logoUrl ? (
                          <img src={group.vendor.logoUrl} alt={group.vendor.name} className="w-full h-full object-cover" />
                        ) : (
                          group.vendor.name.charAt(0)
                        )}
                      </div>
                      <div>
                        <Link
                          href={`/vendors/${group.vendor.slug}`}
                          className="text-sm font-bold text-(--text-on-dark) hover:text-emerald-400 transition-colors flex items-center gap-1.5"
                        >
                          <Store className="w-3.5 h-3.5 text-emerald-500" />
                          <span>{group.vendor.name}</span>
                        </Link>
                      </div>
                    </div>

                    <div className="text-xs text-(--text-on-dark-muted) flex items-center gap-3">
                      <span>Slice Subtotal: <strong className="text-(--text-on-dark)">${group.vendorSubtotal.toFixed(2)}</strong></span>
                      <span className="opacity-40">•</span>
                      <span>Flat Shipping: <strong className="text-emerald-400">${group.shippingAmount.toFixed(2)}</strong></span>
                    </div>
                  </div>

                  {/* Vendor Items List */}
                  <div className="divide-y divide-(--border-dark)">
                    {group.items.map((item: any) => {
                      const targetUrl = item.productSlug ? `/products/${item.productSlug}` : `/products/${item.productId}`;
                      return (
                        <div
                          key={item.id}
                          className={`p-4 sm:p-5 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4 transition-colors ${
                            !item.isAvailable ? 'bg-rose-500/5' : 'hover:bg-(--surface-card-subtle)/40'
                          }`}
                        >
                          {/* Image & Info */}
                          <div className="flex items-center gap-4 flex-1 min-w-0">
                            <Link
                              href={targetUrl}
                              className="w-18 h-18 sm:w-20 sm:h-20 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) p-2 shrink-0 flex items-center justify-center overflow-hidden hover:opacity-90"
                            >
                              {item.imageUrl ? (
                                <img
                                  src={item.imageUrl}
                                  alt={item.productName}
                                  className="w-full h-full object-contain"
                                />
                              ) : (
                                <div className="text-(--text-on-dark-muted) text-xs">No image</div>
                              )}
                            </Link>

                            <div className="space-y-1 min-w-0 flex-1">
                              <Link href={targetUrl}>
                                <h3 className="text-[14px] sm:text-[15px] font-bold text-(--text-on-dark) hover:text-emerald-400 transition-colors truncate">
                                  {item.productName}
                                </h3>
                              </Link>
                              
                              <div className="flex items-center gap-2 text-xs text-(--text-on-dark-muted) flex-wrap">
                                <span className="font-mono text-[11px] opacity-75">SKU: {item.sku}</span>
                                {item.variantOptions && (
                                  <>
                                    <span>•</span>
                                    <span className="text-cyan-400">
                                      {Object.entries(item.variantOptions)
                                        .map(([k, v]) => `${k}: ${v}`)
                                        .join(', ')}
                                    </span>
                                  </>
                                )}
                              </div>

                              {!item.isAvailable && (
                                <div className="inline-flex items-center gap-1 text-[11px] font-bold text-rose-400 bg-rose-950/40 px-2 py-0.5 rounded border border-rose-800/60">
                                  <AlertTriangle className="w-3 h-3" />
                                  <span>{item.availabilityReason === 'OUT_OF_STOCK' ? 'Out of stock' : 'Unavailable'}</span>
                                </div>
                              )}

                              <div className="text-sm font-bold text-(--text-on-dark) sm:hidden">
                                ${item.lineTotal.toFixed(2)}
                              </div>
                            </div>
                          </div>

                          {/* Stepper, Unit Price & Line Total */}
                          <div className="flex items-center justify-between w-full sm:w-auto gap-5 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-(--border-dark)">
                            {/* Stepper */}
                            <div className="flex items-center border border-(--border-dark) rounded-lg overflow-hidden bg-(--surface-card-subtle)">
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.quantity - 1)}
                                className="p-1.5 text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--border-dark) transition-colors cursor-pointer"
                              >
                                <Minus className="w-3.5 h-3.5" />
                              </button>
                              <span className="px-3 text-xs font-bold text-(--text-on-dark) min-w-7 text-center">
                                {item.quantity}
                              </span>
                              <button
                                type="button"
                                onClick={() => handleUpdateQty(item.id, item.quantity + 1)}
                                className="p-1.5 text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--border-dark) transition-colors cursor-pointer"
                              >
                                <Plus className="w-3.5 h-3.5" />
                              </button>
                            </div>

                            {/* Price */}
                            <div className="hidden sm:block text-right min-w-20">
                              <div className="text-[15px] font-bold text-(--text-on-dark)">
                                ${item.lineTotal.toFixed(2)}
                              </div>
                              <div className="text-[11px] text-(--text-on-dark-muted)">
                                ${item.unitPrice.toFixed(2)} each
                              </div>
                            </div>

                            {/* Delete */}
                            <button
                              type="button"
                              onClick={() => handleRemove(item.id)}
                              aria-label="Remove item"
                              className="p-1.5 text-(--text-on-dark-muted) hover:text-rose-400 transition-colors cursor-pointer"
                            >
                              <Trash2 className="w-4 h-4" />
                            </button>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ))}
            </div>

            {/* Order Summary Sidebar (4 cols) */}
            <div className="lg:col-span-4 rounded-2xl bg-(--surface-card) border border-(--border-dark) p-6 text-(--text-on-dark) shadow-sm space-y-5 sticky top-24">
              <h2 className="text-[18px] font-bold tracking-tight text-(--text-on-dark) border-b border-(--border-dark) pb-3 flex items-center gap-2">
                <ShoppingBag className="w-5 h-5 text-emerald-500" />
                <span>Multi-Vendor Summary</span>
              </h2>

              {/* Vendor Slices Mini Breakdown */}
              <div className="space-y-2 text-xs border-b border-(--border-dark) pb-4">
                <span className="font-semibold text-(--text-on-dark-muted) uppercase tracking-wider text-[11px]">
                  Merchant Breakdown ({vendorGroups.length} {vendorGroups.length === 1 ? 'store' : 'stores'}):
                </span>
                {vendorGroups.map((g: any) => (
                  <div key={g.vendor.id} className="flex justify-between text-(--text-on-dark-muted) pl-2">
                    <span className="truncate max-w-40">{g.vendor.name}</span>
                    <span>${g.vendorSubtotal.toFixed(2)} + $10 shipping</span>
                  </div>
                ))}
              </div>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between text-(--text-on-dark-muted)">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-(--text-on-dark)">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-(--text-on-dark-muted)">
                  <span>Per-Merchant Shipping</span>
                  <span className="font-semibold text-(--text-on-dark)">${shippingTotal.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-(--border-dark) flex justify-between items-baseline">
                  <span className="text-base font-bold text-(--text-on-dark)">Grand Total</span>
                  <span className="text-2xl font-extrabold text-emerald-500">
                    ${grandTotal.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout CTA */}
              <button
                type="button"
                onClick={validateCartBeforeCheckout}
                disabled={validating || totalItems === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-[14px] font-bold transition-all shadow-md shadow-emerald-950/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {validating ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Validating Live Stock...</span>
                  </>
                ) : (
                  <>
                    <span>Proceed to Checkout</span>
                    <ArrowRight className="w-4 h-4" />
                  </>
                )}
              </button>

              {/* Trust Badges */}
              <div className="space-y-2.5 pt-2 text-[11px] text-(--text-on-dark-muted) border-t border-(--border-dark)">
                <div className="flex items-center gap-2.5">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Atomic order reservation with zero stock overdraft</span>
                </div>
                <div className="flex items-center gap-2.5">
                  <Truck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Independent fulfillment directly from each merchant</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
