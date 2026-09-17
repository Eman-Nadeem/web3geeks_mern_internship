import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ShoppingBag, Search, Filter, SlidersHorizontal, CheckCircle2, RotateCcw } from 'lucide-react';
import { ProductStatus, VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    vendor?: string;
    vendorId?: string;
    minPrice?: string;
    maxPrice?: string;
    availability?: string;
    sort?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const {
    category,
    search,
    vendor: vendorParam,
    vendorId,
    minPrice,
    maxPrice,
    availability,
    sort,
  } = await searchParams;

  const targetVendor = vendorParam || vendorId;

  const where: any = {
    status: ProductStatus.ACTIVE,
    vendor: { status: VendorStatus.ACTIVE },
  };

  if (category && category !== 'All' && category !== 'ALL') {
    where.category = category;
  }

  if (targetVendor) {
    where.vendor = {
      status: VendorStatus.ACTIVE,
      OR: [{ id: targetVendor }, { slug: targetVendor }],
    };
  }

  if (minPrice || maxPrice) {
    where.price = {};
    if (minPrice && !isNaN(parseFloat(minPrice))) {
      where.price.gte = parseFloat(minPrice);
    }
    if (maxPrice && !isNaN(parseFloat(maxPrice))) {
      where.price.lte = parseFloat(maxPrice);
    }
  }

  if (availability === 'in_stock') {
    where.stockQuantity = { gt: 0 };
  } else if (availability === 'out_of_stock') {
    where.stockQuantity = 0;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
      { category: { contains: search, mode: 'insensitive' } },
      { sku: { contains: search, mode: 'insensitive' } },
    ];
  }

  let orderBy: any = { createdAt: 'desc' };
  if (sort === 'oldest') {
    orderBy = { createdAt: 'asc' };
  } else if (sort === 'price_asc') {
    orderBy = { price: 'asc' };
  } else if (sort === 'price_desc') {
    orderBy = { price: 'desc' };
  } else if (sort === 'stock_desc') {
    orderBy = { stockQuantity: 'desc' };
  }

  let products: any[] = [];
  let categories: { category: string }[] = [];

  try {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          images: { orderBy: { order: 'asc' } },
          variants: {
            where: { status: ProductStatus.ACTIVE },
            orderBy: { createdAt: 'asc' },
          },
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
              logoUrl: true,
            },
          },
        },
        orderBy,
      }),
      prisma.product.findMany({
        where: {
          status: ProductStatus.ACTIVE,
          vendor: { status: VendorStatus.ACTIVE },
        },
        select: { category: true },
        distinct: ['category'],
      }),
    ]);
    products = fetchedProducts;
    categories = fetchedCategories;
  } catch (err) {
    console.warn('Database query error in ProductsPage:', err);
  }

  const uniqueCategories = ['All', ...categories.map((c) => c.category)];

  return (
    <div className="w-full bg-(--bg-canvas) text-(--text-on-dark) py-10 min-h-[85vh] transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 space-y-8">
        {/* Header */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-(--border-dark) pb-6">
          <div>
            <h1 className="text-2xl sm:text-3xl font-bold text-(--text-on-dark) tracking-tight">
              Marketplace Catalog
            </h1>
            <p className="text-[14px] text-(--text-on-dark-muted) mt-1">
              Browse authentic products from verified independent merchants
            </p>
          </div>

          {/* Search bar form */}
          <form method="GET" className="flex items-center gap-2">
            {category && <input type="hidden" name="category" value={category} />}
            {targetVendor && <input type="hidden" name="vendor" value={targetVendor} />}
            {minPrice && <input type="hidden" name="minPrice" value={minPrice} />}
            {maxPrice && <input type="hidden" name="maxPrice" value={maxPrice} />}
            {availability && <input type="hidden" name="availability" value={availability} />}
            {sort && <input type="hidden" name="sort" value={sort} />}
            <div className="relative w-full md:w-72">
              <Search className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="text"
                name="search"
                defaultValue={search || ''}
                placeholder="Search products or SKU..."
                className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] border border-[#E5E7EB] focus:outline-none focus:border-[#1E7A56]"
              />
            </div>
            <button
              type="submit"
              className="px-4 py-2 bg-[#1E7A56] hover:bg-[#186347] text-white rounded-lg text-[13px] font-semibold transition-colors cursor-pointer"
            >
              Search
            </button>
          </form>
        </div>

        {/* Filters Bar: Category Pills + Filter Form */}
        <div className="space-y-4">
          {/* Category Pills */}
          <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
            <span className="text-xs text-(--text-on-dark-muted) flex items-center gap-1 mr-2 shrink-0">
              <Filter className="w-3.5 h-3.5" /> Category:
            </span>
            {uniqueCategories.map((cat) => {
              const isActive = (!category && cat === 'All') || category === cat;
              const queryParams = new URLSearchParams();
              if (cat !== 'All') queryParams.set('category', cat);
              if (search) queryParams.set('search', search);
              if (targetVendor) queryParams.set('vendor', targetVendor);
              if (minPrice) queryParams.set('minPrice', minPrice);
              if (maxPrice) queryParams.set('maxPrice', maxPrice);
              if (availability) queryParams.set('availability', availability);
              if (sort) queryParams.set('sort', sort);

              return (
                <Link
                  key={cat}
                  href={`/products${queryParams.toString() ? `?${queryParams.toString()}` : ''}`}
                  className={`px-3.5 py-1.5 rounded-full text-[13px] font-medium whitespace-nowrap transition-colors ${
                    isActive
                      ? 'bg-[#1E7A56] text-white shadow-xs'
                      : 'bg-white text-[#151A24] hover:bg-slate-100 border border-[#E5E7EB]'
                  }`}
                >
                  {cat}
                </Link>
              );
            })}
          </div>

          {/* Secondary Filter Row: Price Range, Availability, Sort */}
          <form method="GET" className="p-4 rounded-xl bg-white border border-[#E5E7EB] shadow-xs flex flex-wrap items-center justify-between gap-4 text-xs text-[#151A24]">
            {category && <input type="hidden" name="category" value={category} />}
            {search && <input type="hidden" name="search" value={search} />}
            {targetVendor && <input type="hidden" name="vendor" value={targetVendor} />}

            <div className="flex flex-wrap items-center gap-4">
              {/* Price Filter */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Price ($):</span>
                <input
                  type="number"
                  name="minPrice"
                  defaultValue={minPrice || ''}
                  placeholder="Min"
                  step="1"
                  min="0"
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E7A56]"
                />
                <span className="text-slate-400">-</span>
                <input
                  type="number"
                  name="maxPrice"
                  defaultValue={maxPrice || ''}
                  placeholder="Max"
                  step="1"
                  min="0"
                  className="w-20 px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 placeholder-slate-400 focus:outline-none focus:border-[#1E7A56]"
                />
              </div>

              {/* Availability Filter */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Stock:</span>
                <select
                  name="availability"
                  defaultValue={availability || 'all'}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#1E7A56]"
                >
                  <option value="all">All Items</option>
                  <option value="in_stock">In Stock Only</option>
                  <option value="out_of_stock">Out of Stock</option>
                </select>
              </div>

              {/* Sort selector */}
              <div className="flex items-center gap-2">
                <span className="font-semibold text-slate-700">Sort By:</span>
                <select
                  name="sort"
                  defaultValue={sort || 'newest'}
                  className="px-2.5 py-1.5 rounded-lg border border-slate-300 text-xs text-slate-800 focus:outline-none focus:border-[#1E7A56]"
                >
                  <option value="newest">Newest First</option>
                  <option value="price_asc">Price: Low to High</option>
                  <option value="price_desc">Price: High to Low</option>
                  <option value="stock_desc">Most Stocked</option>
                  <option value="oldest">Oldest First</option>
                </select>
              </div>
            </div>

            <div className="flex items-center gap-2">
              <button
                type="submit"
                className="px-4 py-1.5 rounded-lg bg-[#1E7A56] hover:bg-[#186347] text-white font-semibold text-xs transition-colors cursor-pointer"
              >
                Apply Filters
              </button>
              {(category || search || minPrice || maxPrice || availability || sort || targetVendor) && (
                <Link
                  href="/products"
                  className="px-3 py-1.5 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  <RotateCcw className="w-3.5 h-3.5" />
                  Reset
                </Link>
              )}
            </div>
          </form>
        </div>

        {/* Products Grid */}
        {products.length === 0 ? (
          <div className="py-16 rounded-xl bg-white text-[#151A24] text-center border border-[#E5E7EB] space-y-3">
            <ShoppingBag className="w-12 h-12 text-[#9CA3AF] mx-auto" />
            <h3 className="text-base font-semibold">No products found</h3>
            <p className="text-xs text-[#6B7280]">Try adjusting your search criteria, price range, or category filter.</p>
            <Link
              href="/products"
              className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#1E7A56] hover:bg-[#186347] text-xs font-semibold text-white transition-colors"
            >
              Clear All Filters
            </Link>
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
                compareAtPrice={product.compareAtPrice}
                imageUrl={product.imageUrl}
                images={product.images}
                category={product.category}
                stock={product.stockQuantity}
                stockQuantity={product.stockQuantity}
                lowStockThreshold={product.lowStockThreshold}
                rating={4.8}
                reviewsCount={product.stockQuantity + 40}
                vendor={product.vendor}
              />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
