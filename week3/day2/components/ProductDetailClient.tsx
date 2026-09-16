'use client';

import React, { useState, useMemo } from 'react';
import Link from 'next/link';
import {
  Store,
  ArrowLeft,
  CheckCircle2,
  AlertCircle,
  Box,
  Star,
  ShieldCheck,
  Truck,
  Heart,
  ShoppingCart,
  Check,
  Layers,
} from 'lucide-react';
import { useCartWishlist } from './CartWishlistContext';

export interface ProductVariantData {
  id: string;
  sku: string;
  options: Record<string, string>;
  price?: number | null;
  stockQuantity: number;
  imageUrl?: string | null;
  status: string;
}

export interface ProductImageData {
  id: string;
  url: string;
  isPrimary: boolean;
  order: number;
}

export interface ProductDetailProps {
  product: {
    id: string;
    name: string;
    slug: string;
    sku: string;
    description: string;
    price: number;
    compareAtPrice?: number | null;
    stockQuantity: number;
    lowStockThreshold: number;
    category: string;
    status: string;
    images: ProductImageData[];
    variants: ProductVariantData[];
    vendor: {
      id: string;
      name: string;
      slug: string;
      logoUrl?: string | null;
      description?: string | null;
      status: string;
    };
  };
}

export function ProductDetailClient({ product }: ProductDetailProps) {
  const { addToCart, toggleFavorite, isFavorite } = useCartWishlist();
  const favorited = isFavorite(product.id);
  const [added, setAdded] = useState(false);

  // Derive initial primary image
  const initialPrimary =
    product.images.find((img) => img.isPrimary)?.url ||
    (product.images.length > 0 ? product.images[0].url : null);
  const [selectedImage, setSelectedImage] = useState<string | null>(initialPrimary);

  // Variant options state
  // Gather all unique option keys across variants (e.g. ['Switch', 'Color'])
  const optionKeys = useMemo(() => {
    const keys = new Set<string>();
    product.variants.forEach((v) => {
      if (v.options && typeof v.options === 'object') {
        Object.keys(v.options).forEach((k) => keys.add(k));
      }
    });
    return Array.from(keys);
  }, [product.variants]);

  // Initial selected options (default to first active variant)
  const [selectedOptions, setSelectedOptions] = useState<Record<string, string>>(() => {
    if (product.variants.length > 0) {
      return (product.variants[0].options as Record<string, string>) || {};
    }
    return {};
  });

  // Find currently matched variant
  const currentVariant = useMemo(() => {
    if (product.variants.length === 0) return null;
    return product.variants.find((v) => {
      const opts = v.options as Record<string, string>;
      return optionKeys.every((key) => opts[key] === selectedOptions[key]);
    }) || product.variants[0];
  }, [product.variants, optionKeys, selectedOptions]);

  // Derived effective values based on variant selection
  const effectivePrice = currentVariant?.price ?? product.price;
  const effectiveStock = currentVariant ? currentVariant.stockQuantity : product.stockQuantity;
  const effectiveSku = currentVariant?.sku || product.sku;
  const isOutOfStock = effectiveStock === 0;
  const isLowStock = effectiveStock > 0 && effectiveStock <= product.lowStockThreshold;

  // Active display image: if current variant has image, show it, otherwise selected gallery image
  const displayImage = currentVariant?.imageUrl || selectedImage || initialPrimary;

  const formattedPrice = new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
  }).format(effectivePrice);

  const formattedComparePrice = product.compareAtPrice
    ? new Intl.NumberFormat('en-US', {
        style: 'currency',
        currency: 'USD',
      }).format(product.compareAtPrice)
    : null;

  const discountPercent = product.compareAtPrice && product.compareAtPrice > effectivePrice
    ? Math.round(((product.compareAtPrice - effectivePrice) / product.compareAtPrice) * 100)
    : null;

  const handleOptionChange = (key: string, value: string) => {
    setSelectedOptions((prev) => ({ ...prev, [key]: value }));
  };

  const handleAddToCart = () => {
    if (isOutOfStock) return;
    addToCart({
      id: currentVariant ? `${product.id}-${currentVariant.id}` : product.id,
      name: currentVariant
        ? `${product.name} (${Object.values(currentVariant.options).join(' / ')})`
        : product.name,
      slug: product.slug,
      price: effectivePrice,
      imageUrl: displayImage,
      category: product.category,
      vendor: {
        id: product.vendor.id,
        name: product.vendor.name,
        slug: product.vendor.slug,
      },
    });
    setAdded(true);
    setTimeout(() => setAdded(false), 1500);
  };

  const handleToggleFavorite = () => {
    toggleFavorite({
      id: product.id,
      name: product.name,
      slug: product.slug,
      price: effectivePrice,
      imageUrl: displayImage,
      category: product.category,
      stock: effectiveStock,
      rating: 4.8,
      reviewsCount: 120,
      vendor: product.vendor,
    });
  };

  return (
    <div className="w-full min-h-[85vh] bg-[var(--bg-canvas)] text-[var(--text-on-dark)] py-8 pb-16 transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-6">
        {/* Navigation Breadcrumb */}
        <div className="flex items-center gap-2 text-[13px] text-[var(--text-on-dark-muted)]">
          <Link
            href="/products"
            className="inline-flex items-center gap-1.5 hover:text-[var(--text-on-dark)] transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            <span>Catalog</span>
          </Link>
          <span>/</span>
          <Link
            href={`/products?category=${encodeURIComponent(product.category)}`}
            className="hover:text-[var(--text-on-dark)] transition-colors"
          >
            {product.category}
          </Link>
          <span>/</span>
          <span className="text-[var(--text-on-dark)] font-medium truncate max-w-[200px] sm:max-w-md">
            {product.name}
          </span>
        </div>

        {/* Main Product Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-12 gap-8 items-start">
          {/* Left Column: Image Gallery (5 cols) */}
          <div className="lg:col-span-5 space-y-4">
            <div className="rounded-2xl bg-white border border-[#E5E7EB] p-8 shadow-sm flex flex-col items-center justify-center relative min-h-[380px] sm:min-h-[440px] overflow-hidden">
              {displayImage ? (
                <img
                  src={displayImage}
                  alt={product.name}
                  className="w-full h-80 object-contain transition-transform duration-200"
                />
              ) : (
                <div className="text-slate-400 flex flex-col items-center gap-3">
                  <Box className="w-16 h-16 stroke-1" />
                  <span className="text-xs">No image provided</span>
                </div>
              )}

              {/* Badges */}
              <div className="absolute top-4 left-4 flex flex-col gap-1.5">
                <span className="px-3 py-1 rounded-full text-xs font-semibold bg-slate-100 text-[#151A24] border border-[#E5E7EB]">
                  {product.category}
                </span>
                {discountPercent && (
                  <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-rose-600 text-white shadow-xs">
                    Save {discountPercent}%
                  </span>
                )}
              </div>
            </div>

            {/* Thumbnails Row */}
            {product.images.length > 1 && (
              <div className="flex items-center gap-3 overflow-x-auto pb-2">
                {product.images.map((img) => (
                  <button
                    key={img.id}
                    type="button"
                    onClick={() => setSelectedImage(img.url)}
                    className={`w-16 h-16 rounded-xl bg-white border p-1 shrink-0 transition-all cursor-pointer overflow-hidden ${
                      selectedImage === img.url
                        ? 'border-[#1E7A56] ring-2 ring-[#1E7A56]/30'
                        : 'border-[#E5E7EB] hover:border-slate-400 opacity-80'
                    }`}
                  >
                    <img src={img.url} alt="" className="w-full h-full object-contain" />
                  </button>
                ))}
              </div>
            )}
          </div>

          {/* Right Column: Specs, Variants & Actions (7 cols) */}
          <div className="lg:col-span-7 space-y-6">
            {/* Vendor attribution badge */}
            <div className="flex items-center gap-2">
              <span className="text-xs text-[var(--text-on-dark-muted)]">Sold by:</span>
              <Link
                href={`/vendors/${product.vendor.slug}`}
                className="text-xs font-semibold text-[var(--text-on-dark)] hover:text-[#1E7A56] flex items-center gap-1.5 transition-colors bg-[var(--bg-header)] px-2.5 py-1 rounded border border-[var(--border-dark)]"
              >
                <Store className="w-3.5 h-3.5 text-[#1E7A56]" />
                {product.vendor.name}
              </Link>
            </div>

            {/* Title & SKU */}
            <div>
              <h1 className="text-2xl sm:text-3xl font-bold text-[var(--text-on-dark)] tracking-tight leading-snug">
                {product.name}
              </h1>
              <div className="flex items-center gap-3 text-xs text-[var(--text-on-dark-muted)] mt-1 font-mono">
                <span>SKU: {effectiveSku}</span>
              </div>
            </div>

            {/* Rating row */}
            <div className="flex items-center gap-3 text-xs text-[var(--text-on-dark-muted)]">
              <div className="flex items-center gap-1">
                {[...Array(5)].map((_, i) => (
                  <Star key={i} className="w-4 h-4 fill-[#F5A623] text-[#F5A623]" />
                ))}
              </div>
              <span className="font-semibold text-[var(--text-on-dark)]">4.8</span>
              <span>•</span>
              <span>120 ratings</span>
              <span>•</span>
              <span className="text-[#1E7A56] font-semibold">Verified Merchant</span>
            </div>

            {/* Price & Stock status */}
            <div className="flex items-baseline gap-4 pt-2 border-t border-[var(--border-dark)]">
              <span className="text-3xl font-bold text-[var(--text-on-dark)]">
                {formattedPrice}
              </span>
              {formattedComparePrice && (
                <span className="text-lg text-[var(--text-on-dark-muted)] line-through">
                  {formattedComparePrice}
                </span>
              )}
              <div className="flex items-center gap-1.5 text-xs text-[var(--text-on-dark-muted)] ml-auto sm:ml-0">
                {isOutOfStock ? (
                  <span className="text-rose-500 font-bold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Out of Stock
                  </span>
                ) : isLowStock ? (
                  <span className="text-amber-500 font-semibold flex items-center gap-1">
                    <AlertCircle className="w-4 h-4" /> Low Stock ({effectiveStock} remaining)
                  </span>
                ) : (
                  <span className="text-emerald-500 font-medium flex items-center gap-1">
                    <CheckCircle2 className="w-4 h-4" /> In Stock ({effectiveStock} available)
                  </span>
                )}
              </div>
            </div>

            {/* Variant Selectors */}
            {product.variants.length > 0 && optionKeys.length > 0 && (
              <div className="p-4 rounded-xl bg-[var(--surface-card)] border border-[var(--border-dark)] space-y-4">
                <div className="flex items-center gap-2 text-xs font-semibold text-[var(--text-on-dark)] uppercase tracking-wider">
                  <Layers className="w-3.5 h-3.5 text-[#1E7A56]" />
                  <span>Choose Variant Options</span>
                </div>

                {optionKeys.map((key) => {
                  const values = Array.from(
                    new Set(
                      product.variants
                        .map((v) => (v.options as Record<string, string>)[key])
                        .filter(Boolean)
                    )
                  );

                  return (
                    <div key={key} className="space-y-1.5">
                      <label className="text-xs text-[var(--text-on-dark-muted)] font-medium">
                        {key}: <span className="font-bold text-[var(--text-on-dark)]">{selectedOptions[key] || 'Select'}</span>
                      </label>
                      <div className="flex flex-wrap gap-2">
                        {values.map((val) => {
                          const isSelected = selectedOptions[key] === val;
                          return (
                            <button
                              key={val}
                              type="button"
                              onClick={() => handleOptionChange(key, val)}
                              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition-all cursor-pointer ${
                                isSelected
                                  ? 'bg-[#1E7A56] text-white shadow-xs ring-2 ring-[#1E7A56]/50'
                                  : 'bg-[var(--surface-card-subtle)] text-[var(--text-on-dark)] hover:border-emerald-500 border border-[var(--border-dark)]'
                              }`}
                            >
                              {val}
                            </button>
                          );
                        })}
                      </div>
                    </div>
                  );
                })}
              </div>
            )}

            {/* CTAs: Add to Cart & Wishlist */}
            <div className="flex items-center gap-3 pt-2">
              <button
                type="button"
                onClick={handleAddToCart}
                disabled={isOutOfStock}
                className={`flex-1 py-3.5 px-6 rounded-xl text-white font-semibold text-sm transition-all shadow-md flex items-center justify-center gap-2 ${
                  isOutOfStock
                    ? 'bg-slate-700 text-slate-400 cursor-not-allowed shadow-none'
                    : added
                    ? 'bg-[#186347]'
                    : 'bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] cursor-pointer'
                }`}
              >
                {isOutOfStock ? (
                  <span>Currently Unavailable</span>
                ) : added ? (
                  <>
                    <Check className="w-5 h-5 text-white" />
                    <span>Added to Cart</span>
                  </>
                ) : (
                  <>
                    <ShoppingCart className="w-5 h-5" />
                    <span>Add to Cart</span>
                  </>
                )}
              </button>

              <button
                type="button"
                onClick={handleToggleFavorite}
                aria-label={favorited ? 'Remove from favorites' : 'Add to favorites'}
                className="p-3.5 rounded-xl bg-[var(--surface-card-subtle)] hover:bg-[var(--surface-card)] border border-[var(--border-dark)] text-[var(--text-on-dark)] transition-colors cursor-pointer"
              >
                <Heart
                  className={`w-5 h-5 ${
                    favorited ? 'fill-[#1E7A56] text-[#1E7A56]' : 'text-[var(--text-on-dark-muted)]'
                  }`}
                />
              </button>
            </div>

            {/* Description */}
            <div className="pt-4 border-t border-[var(--border-dark)] space-y-2">
              <h2 className="text-xs font-semibold text-[var(--text-on-dark)] uppercase tracking-wider">
                Product Details
              </h2>
              <p className="text-[14px] text-[var(--text-on-dark-muted)] leading-relaxed whitespace-pre-line">
                {product.description}
              </p>
            </div>

            {/* Trust & Guarantee Perks */}
            <div className="grid grid-cols-2 gap-3 pt-2">
              <div className="p-3 rounded-lg bg-[var(--bg-header)] border border-[var(--border-dark)] flex items-center gap-2.5">
                <Truck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                <div className="text-xs leading-tight">
                  <div className="font-semibold text-[var(--text-on-dark)]">Free Standard Delivery</div>
                  <div className="text-[11px] text-[var(--text-on-dark-muted)]">Direct from verified seller</div>
                </div>
              </div>
              <div className="p-3 rounded-lg bg-[var(--bg-header)] border border-[var(--border-dark)] flex items-center gap-2.5">
                <ShieldCheck className="w-4 h-4 text-[#1E7A56] shrink-0" />
                <div className="text-xs leading-tight">
                  <div className="font-semibold text-[var(--text-on-dark)]">Marketplace Guarantee</div>
                  <div className="text-[11px] text-[var(--text-on-dark-muted)]">Direct seller warranty</div>
                </div>
              </div>
            </div>

            {/* Owning Vendor Info Card (SAFE: strictly NO vendor email/phone) */}
            <div className="rounded-xl bg-[var(--surface-card)] p-5 border border-[var(--border-dark)] text-[var(--text-on-dark)] space-y-3 shadow-xs">
              <div className="flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-10 h-10 rounded-lg bg-[var(--bg-header)] text-[var(--text-on-dark)] border border-[var(--border-dark)] flex items-center justify-center font-bold text-sm shrink-0">
                    {product.vendor.logoUrl ? (
                      <img src={product.vendor.logoUrl} alt={product.vendor.name} className="w-full h-full object-cover rounded-lg" />
                    ) : (
                      product.vendor.name.slice(0, 2).toUpperCase()
                    )}
                  </div>
                  <div>
                    <h3 className="text-[14px] font-bold text-[var(--text-on-dark)]">
                      {product.vendor.name}
                    </h3>
                    <span className="text-[11px] text-[var(--text-on-dark-muted)]">
                      Verified Independent Merchant
                    </span>
                  </div>
                </div>
              </div>

              {product.vendor.description && (
                <p className="text-[12px] text-[var(--text-on-dark-muted)] line-clamp-2">
                  {product.vendor.description}
                </p>
              )}

              <div className="pt-2 border-t border-[var(--border-dark)] flex items-center justify-between text-xs">
                <span className="text-[var(--text-on-dark-muted)]">Independent Seller Catalog</span>
                <Link
                  href={`/vendors/${product.vendor.slug}`}
                  className="font-semibold text-[#1E7A56] hover:text-[#186347] transition-colors"
                >
                  Visit Storefront &rarr;
                </Link>
              </div>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
