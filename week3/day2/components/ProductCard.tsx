'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { Star, Check, Heart, AlertCircle } from 'lucide-react';
import { useCartWishlist } from './CartWishlistContext';

export interface ProductCardProps {
  id: string;
  name: string;
  slug?: string;
  price: number;
  compareAtPrice?: number | null;
  imageUrl?: string | null;
  images?: Array<{ url: string; isPrimary?: boolean; order?: number }>;
  category?: string;
  stock?: number;
  stockQuantity?: number;
  lowStockThreshold?: number;
  rating?: number;
  reviewsCount?: number;
  vendor: {
    id: string;
    name: string;
    slug: string;
  };
}

export function ProductCard({
  id,
  name,
  slug,
  price,
  compareAtPrice,
  imageUrl,
  images,
  category,
  stock,
  stockQuantity,
  lowStockThreshold = 5,
  rating = 4.8,
  reviewsCount = 120,
  vendor,
}: ProductCardProps) {
  const [added, setAdded] = useState(false);
  const { addToCart, toggleFavorite, isFavorite } = useCartWishlist();
  const favorited = isFavorite(id);

  const effectiveStock = stockQuantity !== undefined ? stockQuantity : (stock !== undefined ? stock : 0);
  const isOutOfStock = effectiveStock === 0;
  const isLowStock = effectiveStock > 0 && effectiveStock <= lowStockThreshold;

  // Derive primary image from images array or fallback to imageUrl
  const primaryImage = images?.find((img) => img.isPrimary)?.url || imageUrl || (images && images.length > 0 ? images[0].url : null);

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(price);

  const formattedComparePrice = compareAtPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(compareAtPrice)
    : null;

  const discountPercent = compareAtPrice && compareAtPrice > price
    ? Math.round(((compareAtPrice - price) / compareAtPrice) * 100)
    : null;

  const productTarget = slug ? `/products/${slug}` : `/products/${id}`;

  const handleAddToCart = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    if (isOutOfStock) return;

    addToCart({
      id,
      name,
      slug,
      price,
      imageUrl: primaryImage,
      category,
      vendor,
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleFavorite = (e: React.MouseEvent) => {
    e.preventDefault();
    e.stopPropagation();
    toggleFavorite({
      id,
      name,
      slug,
      price,
      imageUrl: primaryImage,
      category,
      stock: effectiveStock,
      rating,
      reviewsCount,
      vendor,
    });
  };

  return (
    <div className="flex flex-col rounded-xl bg-white border border-[#E5E7EB] shadow-xs hover:shadow-md transition-shadow overflow-hidden text-left relative group/card">
      {/* Product Image on White Canvas */}
      <div className="relative w-full h-52 bg-white p-4 overflow-hidden">
        <Link href={productTarget} className="block w-full h-full">
          {primaryImage ? (
            <img
              src={primaryImage}
              alt={name}
              className={`w-full h-full object-contain group-hover/card:scale-105 transition-transform duration-200 ${
                isOutOfStock ? 'grayscale opacity-60' : ''
              }`}
              loading="lazy"
            />
          ) : (
            <div className="w-full h-full flex items-center justify-center text-slate-300 text-sm">
              No Image
            </div>
          )}
        </Link>

        {/* Wishlist toggle button */}
        <button
          type="button"
          onClick={handleToggleFavorite}
          aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
          title={favorited ? 'Remove from favorites' : 'Add to favorites'}
          className="absolute top-2.5 right-2.5 w-8 h-8 rounded-full bg-white/90 hover:bg-white shadow-xs border border-[#E5E7EB] flex items-center justify-center transition-colors cursor-pointer z-10"
        >
          <Heart
            className={`w-4 h-4 transition-colors ${
              favorited
                ? 'fill-[#1E7A56] text-[#1E7A56]'
                : 'text-[#6B7280] hover:text-[#1E7A56]'
            }`}
          />
        </button>

        {/* Discount Badge */}
        {discountPercent && (
          <span className="absolute top-2.5 left-2.5 px-2 py-0.5 rounded text-[11px] font-bold bg-rose-600 text-white shadow-xs">
            -{discountPercent}%
          </span>
        )}

        {/* Category tag */}
        {category && (
          <span className="absolute bottom-2 left-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-[#6B7280] border border-slate-200 pointer-events-none">
            {category}
          </span>
        )}

        {/* Stock Status Pill */}
        {isOutOfStock ? (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold uppercase tracking-wider bg-rose-100 text-rose-700 border border-rose-200">
            Out of Stock
          </span>
        ) : isLowStock ? (
          <span className="absolute bottom-2 right-2 px-2 py-0.5 rounded text-[10px] font-bold bg-amber-100 text-amber-800 border border-amber-200 flex items-center gap-1">
            <AlertCircle className="w-3 h-3 text-amber-600" />
            Only {effectiveStock} left
          </span>
        ) : null}
      </div>

      {/* Card Body */}
      <div className="p-4 flex flex-col flex-1 justify-between gap-3">
        <div className="space-y-1.5">
          {/* Product Name */}
          <Link href={productTarget}>
            <h3 
              className="text-[15px] font-medium text-[#151A24] line-clamp-2 hover:text-[#1E7A56] transition-colors leading-snug"
              title={name}
            >
              {name}
            </h3>
          </Link>

          {/* Price & Compare-At Row */}
          <div className="flex items-baseline gap-2 pt-0.5">
            <span className="text-[17px] font-bold text-[#151A24]">
              {formattedPrice}
            </span>
            {formattedComparePrice && (
              <span className="text-[13px] text-[#9CA3AF] line-through">
                {formattedComparePrice}
              </span>
            )}
          </div>

          {/* Seller Row + Star Rating */}
          <div className="flex items-center justify-between gap-2 pt-1 text-[13px] text-[#6B7280]">
            <Link 
              href={`/vendors/${vendor.slug}`}
              className="flex items-center gap-1.5 truncate hover:text-[#1E7A56] transition-colors"
              title={`Sold by ${vendor.name}`}
            >
              <span className="w-5 h-5 rounded-full bg-slate-100 text-[#1E7A56] font-bold text-[10px] flex items-center justify-center shrink-0 border border-slate-200">
                {vendor.name.charAt(0).toUpperCase()}
              </span>
              <span className="truncate">Sold by {vendor.name}</span>
            </Link>

            {/* Star Rating Right-Aligned */}
            <div className="flex items-center gap-1 shrink-0 font-medium text-[#151A24]">
              <Star className="w-3.5 h-3.5 fill-[#F5A623] text-[#F5A623]" />
              <span className="text-[12px]">{rating.toFixed(1)}</span>
              <span className="text-[11px] text-[#6B7280]">({reviewsCount})</span>
            </div>
          </div>
        </div>

        {/* Full-width green "Add to Cart" button pinned to card bottom */}
        <button
          type="button"
          onClick={handleAddToCart}
          disabled={isOutOfStock}
          className={`w-full mt-2 py-2.5 px-4 rounded-lg text-white text-[14px] font-semibold transition-all duration-150 shadow-xs flex items-center justify-center gap-1.5 ${
            isOutOfStock
              ? 'bg-slate-300 text-slate-500 cursor-not-allowed shadow-none'
              : added 
                ? 'bg-[#186347]' 
                : 'bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] cursor-pointer'
          }`}
        >
          {isOutOfStock ? (
            <span>Unavailable</span>
          ) : added ? (
            <>
              <Check className="w-4 h-4 text-white" />
              <span>Added to Cart</span>
            </>
          ) : (
            <span>Add to Cart</span>
          )}
        </button>
      </div>
    </div>
  );
}
