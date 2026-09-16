'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { 
  ShieldCheck, 
  Truck, 
  Store, 
  CreditCard, 
  Banknote, 
  Lock, 
  ArrowLeft, 
  AlertCircle, 
  CheckCircle2, 
  RefreshCw,
  ShoppingBag
} from 'lucide-react';
import { AuthGuardPrompt } from '@/components/AuthGuardPrompt';
import { useCartWishlist } from '@/components/CartWishlistContext';

export default function CheckoutPage() {
  const router = useRouter();
  const { refreshCart } = useCartWishlist();
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [cartData, setCartData] = useState<any | null>(null);
  const [loadingCart, setLoadingCart] = useState(true);

  // Form State
  const [formData, setFormData] = useState({
    shippingName: '',
    shippingEmail: '',
    shippingPhone: '',
    shippingAddress: '',
    shippingCity: '',
    shippingPostalCode: '',
    paymentMethod: 'CARD',
  });

  const [submitting, setSubmitting] = useState(false);
  const [errorMessage, setErrorMessage] = useState<string | null>(null);
  const [validationErrors, setValidationErrors] = useState<any>({});

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          setUser(data.data);
          setFormData((prev) => ({
            ...prev,
            shippingName: data.data.name || '',
            shippingEmail: data.data.email || '',
          }));
          fetchCart();
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

  const fetchCart = async () => {
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
      console.error('Error loading cart:', err);
    } finally {
      setLoadingCart(false);
    }
  };

  const handleInputChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement>) => {
    const { name, value } = e.target;
    setFormData((prev) => ({ ...prev, [name]: value }));
    if (validationErrors[name]) {
      setValidationErrors((prev: any) => ({ ...prev, [name]: undefined }));
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);
    setErrorMessage(null);
    setValidationErrors({});

    try {
      const res = await fetch('/api/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(formData),
      });

      const json = await res.json();

      if (!res.ok || !json.success) {
        if (json.details) {
          setValidationErrors(json.details);
        }
        setErrorMessage(json.error || 'Checkout failed. Please review your details.');
        setSubmitting(false);
        return;
      }

      // Order success!
      await refreshCart();
      const orderId = json.data.id;
      router.push(`/order-success/${orderId}`);
    } catch (err: any) {
      setErrorMessage(err.message || 'A network error occurred during checkout.');
      setSubmitting(false);
    }
  };

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Preparing secure checkout...</span>
        </div>
      </div>
    );
  }

  if (!user) {
    return (
      <AuthGuardPrompt
        title="Sign in to checkout"
        description="Please sign in to place your order with verified marketplace merchants."
        icon={<Lock className="w-6 h-6" />}
      />
    );
  }

  const vendorGroups = cartData?.vendorGroups || [];
  const subtotal = cartData?.subtotal || 0;
  const shippingTotal = cartData?.shippingTotal || 0;
  const grandTotal = cartData?.grandTotal || 0;

  if (!loadingCart && vendorGroups.length === 0) {
    return (
      <div className="min-h-[70vh] flex flex-col items-center justify-center bg-(--bg-canvas) text-(--text-on-dark) px-4">
        <div className="max-w-md w-full p-8 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-4 shadow-sm">
          <ShoppingBag className="w-12 h-12 text-emerald-500 mx-auto" />
          <h2 className="text-xl font-bold">Your cart is empty</h2>
          <p className="text-xs text-(--text-on-dark-muted)">
            Add items to your cart from verified sellers before proceeding to checkout.
          </p>
          <Link
            href="/products"
            className="inline-block px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-sm transition-colors"
          >
            Browse Products
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="w-full min-h-[90vh] bg-(--bg-canvas) text-(--text-on-dark) py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Breadcrumb / Back */}
        <div className="flex items-center justify-between border-b border-(--border-dark) pb-4">
          <Link
            href="/cart"
            className="text-xs text-(--text-on-dark-muted) hover:text-(--text-on-dark) flex items-center gap-1.5 transition-colors"
          >
            <ArrowLeft className="w-3.5 h-3.5" />
            <span>Back to Shopping Cart</span>
          </Link>
          <div className="flex items-center gap-2 text-xs text-emerald-600 dark:text-emerald-400 font-semibold">
            <Lock className="w-3.5 h-3.5" />
            <span>256-Bit Encrypted Multi-Vendor Checkout</span>
          </div>
        </div>

        {errorMessage && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-start gap-3">
            <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
            <div>
              <p className="font-bold">Checkout Could Not Be Completed</p>
              <p className="text-xs text-rose-300/90 mt-0.5">{errorMessage}</p>
            </div>
          </div>
        )}

        <form onSubmit={handleSubmit} className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Customer & Shipping Form (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* 1. Shipping Details */}
            <div className="rounded-2xl bg-(--surface-card) border border-(--border-dark) p-6 space-y-5 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-(--text-on-dark) border-b border-(--border-dark) pb-3 flex items-center gap-2">
                <Truck className="w-5 h-5 text-emerald-500" />
                <span>1. Shipping & Contact Information</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">Full Name *</label>
                  <input
                    type="text"
                    name="shippingName"
                    value={formData.shippingName}
                    onChange={handleInputChange}
                    placeholder="e.g. Sarah Jenkins"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                  {validationErrors.shippingName && (
                    <p className="text-xs text-rose-400">{validationErrors.shippingName[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">Email Address *</label>
                  <input
                    type="email"
                    name="shippingEmail"
                    value={formData.shippingEmail}
                    onChange={handleInputChange}
                    placeholder="sarah@example.com"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                  {validationErrors.shippingEmail && (
                    <p className="text-xs text-rose-400">{validationErrors.shippingEmail[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">Phone Number *</label>
                  <input
                    type="tel"
                    name="shippingPhone"
                    value={formData.shippingPhone}
                    onChange={handleInputChange}
                    placeholder="+1 (555) 000-0000"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                  {validationErrors.shippingPhone && (
                    <p className="text-xs text-rose-400">{validationErrors.shippingPhone[0]}</p>
                  )}
                </div>

                <div className="sm:col-span-2 space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">Street Address *</label>
                  <input
                    type="text"
                    name="shippingAddress"
                    value={formData.shippingAddress}
                    onChange={handleInputChange}
                    placeholder="742 Evergreen Terrace, Suite 101"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                  {validationErrors.shippingAddress && (
                    <p className="text-xs text-rose-400">{validationErrors.shippingAddress[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">City / District *</label>
                  <input
                    type="text"
                    name="shippingCity"
                    value={formData.shippingCity}
                    onChange={handleInputChange}
                    placeholder="San Francisco"
                    required
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                  {validationErrors.shippingCity && (
                    <p className="text-xs text-rose-400">{validationErrors.shippingCity[0]}</p>
                  )}
                </div>

                <div className="space-y-1.5">
                  <label className="text-xs font-semibold text-(--text-on-dark)">Postal / ZIP Code</label>
                  <input
                    type="text"
                    name="shippingPostalCode"
                    value={formData.shippingPostalCode}
                    onChange={handleInputChange}
                    placeholder="94107"
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) text-sm text-(--text-on-dark) focus:outline-none focus:border-emerald-500"
                  />
                </div>
              </div>
            </div>

            {/* 2. Payment Method */}
            <div className="rounded-2xl bg-(--surface-card) border border-(--border-dark) p-6 space-y-4 shadow-sm">
              <h2 className="text-lg font-bold tracking-tight text-(--text-on-dark) border-b border-(--border-dark) pb-3 flex items-center gap-2">
                <CreditCard className="w-5 h-5 text-emerald-500" />
                <span>2. Payment Method</span>
              </h2>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  formData.paymentMethod === 'CARD'
                    ? 'border-emerald-500 bg-emerald-500/10 text-(--text-on-dark)'
                    : 'border-(--border-dark) bg-(--surface-card-subtle) text-(--text-on-dark-muted)'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="CARD"
                    checked={formData.paymentMethod === 'CARD'}
                    onChange={handleInputChange}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <CreditCard className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-(--text-on-dark)">Card / Instant Pay</span>
                    <span className="text-[11px] opacity-75">Simulated instant authorization</span>
                  </div>
                </label>

                <label className={`p-4 rounded-xl border flex items-center gap-3 cursor-pointer transition-colors ${
                  formData.paymentMethod === 'COD'
                    ? 'border-emerald-500 bg-emerald-500/10 text-(--text-on-dark)'
                    : 'border-(--border-dark) bg-(--surface-card-subtle) text-(--text-on-dark-muted)'
                }`}>
                  <input
                    type="radio"
                    name="paymentMethod"
                    value="COD"
                    checked={formData.paymentMethod === 'COD'}
                    onChange={handleInputChange}
                    className="text-emerald-500 focus:ring-emerald-500"
                  />
                  <Banknote className="w-5 h-5 text-emerald-500 shrink-0" />
                  <div>
                    <span className="text-xs font-bold block text-(--text-on-dark)">Cash On Delivery</span>
                    <span className="text-[11px] opacity-75">Pay upon package arrival</span>
                  </div>
                </label>
              </div>
            </div>
          </div>

          {/* Right Column: Order Review & Splitting Summary (5 cols) */}
          <div className="lg:col-span-5 space-y-6">
            <div className="rounded-2xl bg-(--surface-card) border border-(--border-dark) p-6 space-y-5 shadow-sm sticky top-24">
              <h2 className="text-lg font-bold tracking-tight text-(--text-on-dark) border-b border-(--border-dark) pb-3">
                Order Review ({vendorGroups.length} {vendorGroups.length === 1 ? 'Store' : 'Stores'})
              </h2>

              {/* Vendor Slices Accordion/List */}
              <div className="space-y-4 max-h-95 overflow-y-auto pr-1">
                {vendorGroups.map((group: any, idx: number) => {
                  const suffix = String.fromCharCode(65 + idx);
                  return (
                    <div
                      key={group.vendor.id}
                      className="rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) p-4 space-y-3"
                    >
                      <div className="flex items-center justify-between border-b border-(--border-dark) pb-2">
                        <div className="flex items-center gap-2">
                          <Store className="w-3.5 h-3.5 text-emerald-500" />
                          <span className="text-xs font-bold text-(--text-on-dark)">{group.vendor.name}</span>
                          <span className="text-[10px] px-1.5 py-0.5 rounded bg-emerald-500/10 text-emerald-400 font-mono font-bold">
                            Slice -{suffix}
                          </span>
                        </div>
                        <span className="text-xs font-semibold text-(--text-on-dark)">
                          ${group.vendorTotal.toFixed(2)}
                        </span>
                      </div>

                      <div className="space-y-2">
                        {group.items.map((item: any) => (
                          <div key={item.id} className="flex items-center justify-between text-xs text-(--text-on-dark-muted)">
                            <div className="truncate max-w-50">
                              <span className="text-(--text-on-dark) font-medium">{item.productName}</span>
                              <span className="text-[11px] opacity-75"> × {item.quantity}</span>
                            </div>
                            <span className="font-semibold text-(--text-on-dark)">${item.lineTotal.toFixed(2)}</span>
                          </div>
                        ))}
                      </div>

                      <div className="pt-2 border-t border-(--border-dark) flex justify-between text-[11px] text-(--text-on-dark-muted)">
                        <span>Fulfillment & Shipping:</span>
                        <span className="text-emerald-400 font-medium">${group.shippingAmount.toFixed(2)}</span>
                      </div>
                    </div>
                  );
                })}
              </div>

              {/* Total Calculation */}
              <div className="space-y-2.5 text-xs pt-3 border-t border-(--border-dark)">
                <div className="flex justify-between text-(--text-on-dark-muted)">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-(--text-on-dark)">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-(--text-on-dark-muted)">
                  <span>Merchant Shipping Total</span>
                  <span className="font-semibold text-(--text-on-dark)">${shippingTotal.toFixed(2)}</span>
                </div>
                <div className="pt-2 border-t border-(--border-dark) flex justify-between items-baseline">
                  <span className="text-sm font-bold text-(--text-on-dark)">Grand Total</span>
                  <span className="text-2xl font-extrabold text-emerald-500">${grandTotal.toFixed(2)}</span>
                </div>
              </div>

              {/* Submit CTA */}
              <button
                type="submit"
                disabled={submitting || vendorGroups.length === 0}
                className="w-full py-3.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 active:bg-emerald-700 text-white text-sm font-bold transition-all shadow-md shadow-emerald-950/30 cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
              >
                {submitting ? (
                  <>
                    <RefreshCw className="w-4 h-4 animate-spin" />
                    <span>Processing & Splitting Orders...</span>
                  </>
                ) : (
                  <>
                    <Lock className="w-4 h-4" />
                    <span>Place Multi-Vendor Order (${grandTotal.toFixed(2)})</span>
                  </>
                )}
              </button>

              <div className="space-y-2 pt-2 text-[11px] text-(--text-on-dark-muted) border-t border-(--border-dark)">
                <div className="flex items-center gap-2">
                  <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>One single payment automatically split per merchant</span>
                </div>
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-emerald-500 shrink-0" />
                  <span>Transactional inventory reservation protection</span>
                </div>
              </div>
            </div>
          </div>
        </form>
      </div>
    </div>
  );
}
