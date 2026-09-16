import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { 
  Laptop, 
  Armchair, 
  Speaker, 
  Briefcase, 
  Monitor, 
  ChevronLeft, 
  ChevronRight,
  Store,
  CheckCircle2
} from 'lucide-react';
import { VendorStatus, ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  // Fetch active vendors and active products for the marketplace storefront
  let vendors: any[] = [];
  let products: any[] = [];

  try {
    const [fetchedVendors, fetchedProducts] = await Promise.all([
      prisma.vendor.findMany({
        where: { status: VendorStatus.ACTIVE },
        include: {
          _count: {
            select: { products: { where: { status: ProductStatus.ACTIVE } } },
          },
        },
        take: 3,
        orderBy: { createdAt: 'desc' },
      }),
      prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          vendor: { status: VendorStatus.ACTIVE },
        },
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        take: 8,
        orderBy: { createdAt: 'desc' },
      }),
    ]);
    vendors = fetchedVendors;
    products = fetchedProducts;
  } catch (dbErr) {
    console.warn('Database connection warning during HomePage render:', dbErr);
  }

  // Popular Categories list with outline icons in accent color
  const POPULAR_CATEGORIES = [
    { name: 'Electronics', icon: Laptop, href: '/products?category=Electronics' },
    { name: 'Home', icon: Armchair, href: '/products?category=Home' },
    { name: 'Audio', icon: Speaker, href: '/products?category=Audio' },
    { name: 'Lifestyle', icon: Briefcase, href: '/products?category=Accessories' },
    { name: 'Computers', icon: Monitor, href: '/products?category=Displays' },
  ];

  return (
    <div className="w-full bg-[var(--bg-canvas)] text-[var(--text-on-dark)] space-y-10 pb-20 transition-colors duration-200">
      {/* 1. Hero Banner (bg-hero gradient with bleeding product photography) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-4">
        <div className="relative overflow-hidden rounded-2xl bg-gradient-to-r from-[#0E2B24] to-[#153229] border border-[#1E4338] min-h-[300px] sm:min-h-[340px] flex items-center shadow-lg">
          {/* Bleeding Product Images on Both Sides */}
          {/* Left Side Bleeding Product (Headphones) */}
          <div className="absolute -left-12 sm:-left-6 top-1/2 -translate-y-1/2 w-48 sm:w-64 h-48 sm:h-64 pointer-events-none opacity-40 lg:opacity-90 select-none">
            <img
              src="https://images.unsplash.com/photo-1505740420928-5e560c06d30e?auto=format&fit=crop&w=600&q=80"
              alt="Studio Headphones"
              className="w-full h-full object-contain drop-shadow-2xl -rotate-12"
            />
          </div>

          {/* Right Side Bleeding Products (Mechanical Keyboard & Gear) */}
          <div className="absolute -right-16 sm:-right-8 top-1/2 -translate-y-1/2 w-64 sm:w-80 h-64 sm:h-80 pointer-events-none opacity-30 lg:opacity-90 select-none">
            <img
              src="https://images.unsplash.com/photo-1587829741301-dc798b83add3?auto=format&fit=crop&w=800&q=80"
              alt="Mechanical Keyboard & Desk Gear"
              className="w-full h-full object-contain drop-shadow-2xl rotate-6"
            />
          </div>

          {/* Left/Right Carousel Edge Controls */}
          <button 
            type="button"
            aria-label="Previous slide"
            className="absolute left-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-20 cursor-pointer"
          >
            <ChevronLeft className="w-5 h-5" />
          </button>
          <button 
            type="button"
            aria-label="Next slide"
            className="absolute right-3 top-1/2 -translate-y-1/2 w-8 h-8 rounded-full bg-black/40 hover:bg-black/60 text-white flex items-center justify-center transition-colors z-20 cursor-pointer"
          >
            <ChevronRight className="w-5 h-5" />
          </button>

          {/* Center-Left Content Column (Exact Spec: One headline + One supporting sentence + One green CTA) */}
          <div className="relative z-10 max-w-xl mx-auto lg:mx-0 lg:ml-28 px-8 py-10 text-center lg:text-left space-y-4">
            <h1 className="text-2xl sm:text-4xl lg:text-[36px] font-bold text-white tracking-tight leading-tight">
              Discover Quality Products from Verified Independent Sellers
            </h1>

            <p className="text-[14px] sm:text-[15px] text-[#A9B2C3] leading-relaxed">
              Explore top brands and unique finds from trusted vendors.
            </p>

            <div className="pt-2">
              <Link
                href="/products"
                className="inline-flex items-center justify-center px-6 py-2.5 rounded-lg bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[14px] font-semibold transition-colors shadow-xs"
              >
                Shop Deals
              </Link>
            </div>
          </div>

          {/* Dot Pagination Bottom-Left */}
          <div className="absolute bottom-4 left-1/2 -translate-x-1/2 lg:translate-x-0 lg:left-28 flex items-center gap-1.5 z-20">
            <span className="w-6 h-1.5 rounded-full bg-[#1E7A56]" />
            <span className="w-2 h-1.5 rounded-full bg-white/40" />
            <span className="w-2 h-1.5 rounded-full bg-white/40" />
          </div>
        </div>
      </section>

      {/* 2. Popular Categories (Row of pill-shaped white buttons, equal width, outline icon in accent) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <h2 className="text-[20px] font-bold text-[var(--text-on-dark)] tracking-tight mb-4">
          Popular Categories
        </h2>

        <div className="flex items-center gap-4 overflow-x-auto no-scrollbar py-1">
          {POPULAR_CATEGORIES.map((category) => {
            const Icon = category.icon;
            return (
              <Link
                key={category.name}
                href={category.href}
                className="flex-1 min-w-[170px] py-3.5 px-4 rounded-full bg-white hover:bg-slate-50 text-[#151A24] font-medium text-[14px] flex items-center justify-center gap-2.5 shadow-xs transition-all shrink-0 group border border-[#E5E7EB]"
              >
                <Icon className="w-4 h-4 text-[#1E7A56] stroke-[2.2] shrink-0" />
                <span className="font-semibold text-[14px] text-[#151A24]">{category.name}</span>
              </Link>
            );
          })}
        </div>
      </section>

      {/* 3. Trending Products (The core repeating unit: ProductCard) */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-[var(--text-on-dark)] tracking-tight">
            Trending Products
          </h2>
          <Link
            href="/products"
            className="text-[13px] text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] transition-colors"
          >
            See all products →
          </Link>
        </div>

        {products.length === 0 ? (
          <div className="p-10 rounded-xl bg-white text-[#151A24] text-center">
            <h3 className="text-base font-semibold">No active products available yet</h3>
            <p className="text-xs text-[#6B7280] mt-1">Check back soon for new arrivals.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
            {products.map((product) => (
              <ProductCard
                key={product.id}
                id={product.id}
                name={product.name}
                slug={product.slug}
                price={product.price}
                imageUrl={product.imageUrl}
                category={product.category}
                stock={product.stock}
                rating={4.8}
                reviewsCount={product.stock + 45}
                vendor={product.vendor}
              />
            ))}
          </div>
        )}
      </section>

      {/* 4. Verified Stores / Merchant Spotlight */}
      <section className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between mb-4">
          <h2 className="text-[20px] font-bold text-[var(--text-on-dark)] tracking-tight">
            Verified Independent Stores
          </h2>
          <Link
            href="/vendors"
            className="text-[13px] text-[var(--text-on-dark-muted)] hover:text-[var(--text-on-dark)] transition-colors"
          >
            View all merchants →
          </Link>
        </div>

        {vendors.length === 0 ? (
          <div className="p-8 rounded-xl bg-white text-[#151A24] text-center">
            <h3 className="text-sm font-semibold">No active stores registered yet</h3>
          </div>
        ) : (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-5">
            {vendors.map((vendor) => (
              <div
                key={vendor.id}
                className="rounded-xl bg-white p-5 border border-[#E5E7EB] shadow-xs flex flex-col justify-between text-left"
              >
                <div>
                  <div className="flex items-center gap-3">
                    <div className="w-12 h-12 rounded-lg bg-[var(--bg-header)] text-[var(--text-on-dark)] border border-[var(--border-dark)] flex items-center justify-center font-bold text-sm shrink-0">
                      {vendor.name.slice(0, 2).toUpperCase()}
                    </div>
                    <div>
                      <h3 className="text-[15px] font-bold text-[#151A24] flex items-center gap-1">
                        {vendor.name}
                        <CheckCircle2 className="w-4 h-4 text-[#1E7A56]" />
                      </h3>
                      <span className="text-[12px] text-[#6B7280]">
                        {vendor._count?.products || 0} active products listed
                      </span>
                    </div>
                  </div>

                  <p className="text-[13px] text-[#6B7280] mt-3 line-clamp-2 leading-snug">
                    {vendor.description || 'Verified merchant offering high quality direct products.'}
                  </p>
                </div>

                <div className="mt-4 pt-3 border-t border-slate-100 flex items-center justify-between">
                  <span className="text-[12px] font-medium text-[#1E7A56]">
                    Verified Merchant
                  </span>
                  <Link
                    href={`/vendors/${vendor.slug}`}
                    className="text-[13px] font-semibold text-[#1E7A56] hover:text-[#186347] transition-colors"
                  >
                    Visit Store →
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
