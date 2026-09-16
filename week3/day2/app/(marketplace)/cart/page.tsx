'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { 
  ShoppingCart, 
  Trash2, 
  Plus, 
  Minus, 
  ArrowRight, 
  ShieldCheck, 
  Truck, 
  Check, 
  Store 
} from 'lucide-react';
import { useCartWishlist } from '@/components/CartWishlistContext';
import { AuthGuardPrompt } from '@/components/AuthGuardPrompt';

export default function CartPage() {
  const { cart, removeFromCart, updateQuantity, clearCart } = useCartWishlist();
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);
  const [checkoutComplete, setCheckoutComplete] = useState(false);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => (res.ok ? res.json() : null))
      .then((data) => {
        if (data?.success && data.data) {
          setUser(data.data);
        } else {
          setUser(null);
        }
      })
      .catch(() => setUser(null))
      .finally(() => setAuthLoading(false));
  }, []);

  if (authLoading) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-[var(--bg-canvas)] text-[var(--text-on-dark-muted)]">
        <div className="flex items-center gap-2 text-sm">
          <div className="w-5 h-5 border-2 border-[#1E7A56] border-t-transparent rounded-full animate-spin" />
          <span>Loading your cart...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Guard Prompt
  if (!user) {
    return (
      <AuthGuardPrompt
        title="Sign in to view your shopping cart"
        description="Sign in to synchronize your items, view vendor shipping options, and proceed to secure marketplace checkout."
        icon={<ShoppingCart className="w-6 h-6" />}
      />
    );
  }

  const subtotal = cart.reduce((sum, item) => sum + item.price * item.quantity, 0);
  const shipping = subtotal > 50 || subtotal === 0 ? 0 : 9.99;
  const estimatedTax = subtotal * 0.08;
  const total = subtotal + shipping + estimatedTax;

  const handleCheckout = () => {
    setCheckoutComplete(true);
    setTimeout(() => {
      clearCart();
    }, 2000);
  };

  return (
    <div className="w-full min-h-[85vh] bg-[var(--bg-canvas)] text-[var(--text-on-dark)] py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-[var(--border-dark)] pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-on-dark)] flex items-center gap-3">
              <span>Shopping Cart</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-header)] text-[#1E7A56] border border-[var(--border-dark)] font-semibold">
                {cart.length} {cart.length === 1 ? 'item' : 'items'}
              </span>
            </h1>
            <p className="text-[13px] text-[var(--text-on-dark-muted)] mt-1">
              Review your items and complete your multi-vendor purchase.
            </p>
          </div>

          {cart.length > 0 && (
            <button
              onClick={clearCart}
              className="text-xs text-[#A9B2C3] hover:text-rose-400 transition-colors flex items-center gap-1 cursor-pointer"
            >
              <Trash2 className="w-3.5 h-3.5" />
              <span>Clear Cart</span>
            </button>
          )}
        </div>

        {checkoutComplete ? (
          <div className="py-16 px-6 max-w-lg mx-auto rounded-2xl bg-white text-[#151A24] border border-[#E5E7EB] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-emerald-50 text-[#1E7A56] flex items-center justify-center mx-auto border border-emerald-100">
              <Check className="w-8 h-8 stroke-[2.5]" />
            </div>
            <h2 className="text-2xl font-bold tracking-tight">Order Placed Successfully!</h2>
            <p className="text-[13px] text-[#6B7280] leading-relaxed">
              Thank you for shopping at Nexus Market. Each independent vendor has received your order and will dispatch your items directly.
            </p>
            <div className="pt-3">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#1E7A56] hover:bg-[#186347] text-white text-[14px] font-semibold transition-colors"
              >
                Continue Shopping
              </Link>
            </div>
          </div>
        ) : cart.length === 0 ? (
          <div className="py-20 px-4 max-w-md mx-auto rounded-2xl bg-white text-[#151A24] border border-[#E5E7EB] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-slate-100 text-[#6B7280] flex items-center justify-center mx-auto">
              <ShoppingCart className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">Your Cart is Empty</h2>
            <p className="text-[13px] text-[#6B7280]">
              Discover quality tech, keyboards, audio, and displays from verified sellers.
            </p>
            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#1E7A56] hover:bg-[#186347] text-white text-[14px] font-semibold transition-colors shadow-xs"
              >
                Explore Marketplace Catalog
              </Link>
            </div>
          </div>
        ) : (
          <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
            {/* Cart Items Column (8 cols) */}
            <div className="lg:col-span-8 space-y-4">
              {cart.map((item) => {
                const targetUrl = item.slug ? `/products/${item.slug}` : `/products/${item.id}`;
                return (
                  <div
                    key={item.id}
                    className="rounded-xl bg-white border border-[#E5E7EB] p-4 sm:p-5 text-[#151A24] shadow-xs flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4"
                  >
                    {/* Image & Title */}
                    <div className="flex items-center gap-4 flex-1 min-w-0">
                      <Link
                        href={targetUrl}
                        className="w-20 h-20 rounded-lg bg-white border border-[#E5E7EB] p-2 shrink-0 flex items-center justify-center overflow-hidden hover:opacity-90"
                      >
                        {item.imageUrl ? (
                          <img
                            src={item.imageUrl}
                            alt={item.name}
                            className="w-full h-full object-contain"
                          />
                        ) : (
                          <div className="text-slate-300 text-xs">No image</div>
                        )}
                      </Link>

                      <div className="space-y-1 min-w-0">
                        <Link href={targetUrl}>
                          <h3 className="text-[15px] font-bold text-[#151A24] hover:text-[#1E7A56] transition-colors truncate">
                            {item.name}
                          </h3>
                        </Link>
                        <div className="flex items-center gap-2 text-xs text-[#6B7280]">
                          <Store className="w-3.5 h-3.5 text-[#1E7A56]" />
                          <span>Sold by {item.vendor.name}</span>
                        </div>
                        <div className="text-sm font-bold text-[#151A24] sm:hidden">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                      </div>
                    </div>

                    {/* Quantity controls & Price */}
                    <div className="flex items-center justify-between w-full sm:w-auto gap-6 shrink-0 pt-2 sm:pt-0 border-t sm:border-0 border-slate-100">
                      {/* Stepper */}
                      <div className="flex items-center border border-[#E5E7EB] rounded-lg overflow-hidden bg-slate-50">
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity - 1)}
                          className="p-1.5 text-[#6B7280] hover:text-[#151A24] hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Minus className="w-3.5 h-3.5" />
                        </button>
                        <span className="px-3 text-xs font-bold text-[#151A24] min-w-[28px] text-center">
                          {item.quantity}
                        </span>
                        <button
                          type="button"
                          onClick={() => updateQuantity(item.id, item.quantity + 1)}
                          className="p-1.5 text-[#6B7280] hover:text-[#151A24] hover:bg-slate-200 transition-colors cursor-pointer"
                        >
                          <Plus className="w-3.5 h-3.5" />
                        </button>
                      </div>

                      {/* Line total */}
                      <div className="hidden sm:block text-right min-w-[80px]">
                        <div className="text-[16px] font-bold text-[#151A24]">
                          ${(item.price * item.quantity).toFixed(2)}
                        </div>
                        <div className="text-[11px] text-[#6B7280]">
                          ${item.price.toFixed(2)} each
                        </div>
                      </div>

                      {/* Delete */}
                      <button
                        type="button"
                        onClick={() => removeFromCart(item.id)}
                        aria-label="Remove item"
                        className="p-1.5 text-[#9CA3AF] hover:text-rose-600 transition-colors cursor-pointer"
                      >
                        <Trash2 className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                );
              })}
            </div>

            {/* Order Summary Sidebar (4 cols) */}
            <div className="lg:col-span-4 rounded-xl bg-white border border-[#E5E7EB] p-6 text-[#151A24] shadow-xs space-y-5 sticky top-24">
              <h2 className="text-[18px] font-bold tracking-tight text-[#151A24] border-b border-[#E5E7EB] pb-3">
                Order Summary
              </h2>

              <div className="space-y-3 text-[13px]">
                <div className="flex justify-between text-[#6B7280]">
                  <span>Items Subtotal</span>
                  <span className="font-semibold text-[#151A24]">${subtotal.toFixed(2)}</span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Estimated Shipping</span>
                  <span className="font-semibold text-[#151A24]">
                    {shipping === 0 ? (
                      <span className="text-[#1E7A56] font-bold">FREE</span>
                    ) : (
                      `$${shipping.toFixed(2)}`
                    )}
                  </span>
                </div>
                <div className="flex justify-between text-[#6B7280]">
                  <span>Estimated Sales Tax</span>
                  <span className="font-semibold text-[#151A24]">${estimatedTax.toFixed(2)}</span>
                </div>

                <div className="pt-3 border-t border-[#E5E7EB] flex justify-between items-baseline">
                  <span className="text-base font-bold text-[#151A24]">Order Total</span>
                  <span className="text-2xl font-extrabold text-[#151A24]">
                    ${total.toFixed(2)}
                  </span>
                </div>
              </div>

              {/* Checkout Button */}
              <button
                type="button"
                onClick={handleCheckout}
                className="w-full py-3 px-4 rounded-lg bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[14px] font-semibold transition-colors duration-150 shadow-xs cursor-pointer flex items-center justify-center gap-2"
              >
                <span>Proceed to Checkout</span>
                <ArrowRight className="w-4 h-4" />
              </button>

              {/* Trust badges */}
              <div className="space-y-2 pt-2 text-[11px] text-[#6B7280]">
                <div className="flex items-center gap-2">
                  <ShieldCheck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                  <span>Encrypted 256-bit secure checkout</span>
                </div>
                <div className="flex items-center gap-2">
                  <Truck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                  <span>Direct delivery from verified independent merchants</span>
                </div>
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
