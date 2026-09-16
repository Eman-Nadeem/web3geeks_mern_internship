'use client';

import React, { useEffect, useState } from 'react';
import Link from 'next/link';
import { Heart, Trash2, ShoppingBag } from 'lucide-react';
import { useCartWishlist } from '@/components/CartWishlistContext';
import { ProductCard } from '@/components/ProductCard';
import { AuthGuardPrompt } from '@/components/AuthGuardPrompt';

export default function FavoritesPage() {
  const { favorites } = useCartWishlist();
  const [user, setUser] = useState<any | null>(null);
  const [authLoading, setAuthLoading] = useState(true);

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
          <span>Loading your favorites...</span>
        </div>
      </div>
    );
  }

  // Not logged in: Show Auth Guard Prompt
  if (!user) {
    return (
      <AuthGuardPrompt
        title="Sign in to view your saved favorites"
        description="Log in to access your saved tech, monitor availability, and easily move products to your shopping cart."
        icon={<Heart className="w-6 h-6" />}
      />
    );
  }

  return (
    <div className="w-full min-h-[85vh] bg-[var(--bg-canvas)] text-[var(--text-on-dark)] py-10 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="border-b border-[var(--border-dark)] pb-5 flex items-center justify-between">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold tracking-tight text-[var(--text-on-dark)] flex items-center gap-3">
              <span>Saved Favorites</span>
              <span className="text-xs px-2.5 py-1 rounded-full bg-[var(--bg-header)] text-[#1E7A56] border border-[var(--border-dark)] font-semibold">
                {favorites.length} {favorites.length === 1 ? 'product' : 'products'}
              </span>
            </h1>
            <p className="text-[13px] text-[var(--text-on-dark-muted)] mt-1">
              Your personal wishlist of curated items from verified merchants.
            </p>
          </div>

          <Link
            href="/products"
            className="text-xs text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] transition-colors"
          >
            Browse more products →
          </Link>
        </div>

        {/* Empty State or Grid */}
        {favorites.length === 0 ? (
          <div className="py-20 px-4 max-w-md mx-auto rounded-2xl bg-white text-[#151A24] border border-[#E5E7EB] text-center space-y-4 shadow-sm">
            <div className="w-16 h-16 rounded-full bg-rose-50 text-rose-500 flex items-center justify-center mx-auto border border-rose-100">
              <Heart className="w-8 h-8" />
            </div>
            <h2 className="text-xl font-bold tracking-tight">No Saved Favorites Yet</h2>
            <p className="text-[13px] text-[#6B7280]">
              Click the heart icon on any product card in the marketplace catalog to save it to your wishlist.
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
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {favorites.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                imageUrl={product.imageUrl}
                category={product.category}
                stock={product.stock}
                rating={product.rating || 4.8}
                reviewsCount={product.reviewsCount || 120}
                vendor={product.vendor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
