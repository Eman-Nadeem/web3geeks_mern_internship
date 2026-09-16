'use client';

import React, { useState } from 'react';
import { ShoppingCart, Heart, Check, Plus, Minus } from 'lucide-react';
import { useCartWishlist } from './CartWishlistContext';

interface ProductDetailActionsProps {
  product: {
    id: string;
    name: string;
    slug?: string;
    price: number;
    imageUrl?: string | null;
    category?: string;
    stock: number;
    rating?: number;
    reviewsCount?: number;
    vendor: {
      id: string;
      name: string;
      slug: string;
    };
  };
}

export function ProductDetailActions({ product }: ProductDetailActionsProps) {
  const [quantity, setQuantity] = useState(1);
  const [added, setAdded] = useState(false);
  const { addToCart, toggleFavorite, isFavorite } = useCartWishlist();
  const favorited = isFavorite(product.id);

  const handleAddToCart = () => {
    if (product.stock <= 0) return;
    addToCart(
      {
        id: product.id,
        name: product.name,
        slug: product.slug,
        price: product.price,
        imageUrl: product.imageUrl,
        category: product.category,
        vendor: product.vendor,
      },
      quantity
    );
    setAdded(true);
    setTimeout(() => setAdded(false), 2000);
  };

  const handleToggleFavorite = () => {
    toggleFavorite({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: product.price,
      imageUrl: product.imageUrl,
      category: product.category,
      stock: product.stock,
      rating: product.rating || 4.8,
      reviewsCount: product.reviewsCount || 120,
      vendor: product.vendor,
    });
  };

  const isOutOfStock = product.stock <= 0;

  return (
    <div className="space-y-4 pt-2">
      {/* Quantity & Stock row */}
      {!isOutOfStock && (
        <div className="flex items-center gap-3">
          <span className="text-[13px] text-[var(--text-on-dark-muted)]">Quantity:</span>
          <div className="flex items-center border border-[var(--border-dark)] bg-[var(--bg-header)] rounded-lg overflow-hidden">
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.max(1, q - 1))}
              className="p-2 text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer disabled:opacity-40"
              disabled={quantity <= 1}
            >
              <Minus className="w-3.5 h-3.5" />
            </button>
            <span className="px-3.5 text-xs font-bold text-[var(--text-on-dark)] min-w-[32px] text-center">
              {quantity}
            </span>
            <button
              type="button"
              onClick={() => setQuantity((q) => Math.min(product.stock, q + 1))}
              className="p-2 text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] hover:bg-[var(--bg-canvas)] transition-colors cursor-pointer disabled:opacity-40"
              disabled={quantity >= product.stock}
            >
              <Plus className="w-3.5 h-3.5" />
            </button>
          </div>
          <span className="text-xs text-[var(--text-on-dark-muted)]">
            ({product.stock} available)
          </span>
        </div>
      )}

      {/* Primary Action Buttons */}
      <div className="flex items-center gap-3">
        <button
          type="button"
          disabled={isOutOfStock}
          onClick={handleAddToCart}
          className={`flex-1 py-3 px-6 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 shadow-xs cursor-pointer flex items-center justify-center gap-2 ${
            isOutOfStock
              ? 'bg-slate-700 cursor-not-allowed opacity-50'
              : added
              ? 'bg-[#186347]'
              : 'bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a]'
          }`}
        >
          {added ? (
            <>
              <Check className="w-4 h-4" />
              <span>Added to Cart!</span>
            </>
          ) : (
            <>
              <ShoppingCart className="w-4 h-4" />
              <span>{isOutOfStock ? 'Out of Stock' : 'Add to Cart'}</span>
            </>
          )}
        </button>

        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={favorited ? 'Remove from wishlist' : 'Save to wishlist'}
          title={favorited ? 'Remove from wishlist' : 'Save to wishlist'}
          className={`p-3 rounded-lg border transition-colors cursor-pointer flex items-center justify-center ${
            favorited
              ? 'bg-[var(--bg-header)] border-[#1E7A56] text-[#1E7A56]'
              : 'bg-[var(--bg-header)] border-[var(--border-dark)] text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] hover:border-[#1E7A56]'
          }`}
        >
          <Heart className={`w-5 h-5 ${favorited ? 'fill-[#1E7A56]' : ''}`} />
        </button>
      </div>
    </div>
  );
}
