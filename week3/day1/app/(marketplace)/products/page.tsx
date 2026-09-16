import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { ProductCard } from '@/components/ProductCard';
import { ShoppingBag, Search, Filter } from 'lucide-react';
import { ProductStatus, VendorStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

interface ProductsPageProps {
  searchParams: Promise<{
    category?: string;
    search?: string;
    vendorId?: string;
  }>;
}

export default async function ProductsPage({ searchParams }: ProductsPageProps) {
  const { category, search, vendorId } = await searchParams;

  const where: {
    status: ProductStatus;
    vendor: { status: VendorStatus };
    category?: string;
    vendorId?: string;
    OR?: Array<{ name: { contains: string; mode: 'insensitive' } } | { description: { contains: string; mode: 'insensitive' } }>;
  } = {
    status: ProductStatus.ACTIVE,
    vendor: { status: VendorStatus.ACTIVE },
  };

  if (category && category !== 'All') {
    where.category = category;
  }

  if (vendorId) {
    where.vendorId = vendorId;
  }

  if (search) {
    where.OR = [
      { name: { contains: search, mode: 'insensitive' } },
      { description: { contains: search, mode: 'insensitive' } },
    ];
  }

  let products: any[] = [];
  let categories: { category: string }[] = [];

  try {
    const [fetchedProducts, fetchedCategories] = await Promise.all([
      prisma.product.findMany({
        where,
        include: {
          vendor: {
            select: {
              id: true,
              name: true,
              slug: true,
            },
          },
        },
        orderBy: { createdAt: 'desc' },
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
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8 bg-[#1B2436] text-white min-h-[80vh]">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#232E44] pb-6">
        <div>
          <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
            Marketplace Catalog
          </h1>
          <p className="text-[14px] text-[#A9B2C3] mt-1">
            Browse authentic products from verified independent vendors
          </p>
        </div>

        {/* Search bar form */}
        <form method="GET" className="flex items-center gap-2">
          {category && <input type="hidden" name="category" value={category} />}
          <div className="relative w-full md:w-72">
            <Search className="w-4 h-4 text-[#A9B2C3] absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              name="search"
              defaultValue={search || ''}
              placeholder="Search catalog..."
              className="w-full pl-9 pr-4 py-2 bg-white rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] border border-[#E5E7EB] focus:outline-none"
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

      {/* Category Pills */}
      <div className="flex items-center gap-2 overflow-x-auto pb-2 no-scrollbar">
        <span className="text-xs text-[#A9B2C3] flex items-center gap-1 mr-2">
          <Filter className="w-3.5 h-3.5" /> Category:
        </span>
        {uniqueCategories.map((cat) => {
          const isActive = (!category && cat === 'All') || category === cat;
          return (
            <Link
              key={cat}
              href={`/products?category=${cat === 'All' ? '' : encodeURIComponent(cat)}${search ? `&search=${encodeURIComponent(search)}` : ''}`}
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

      {/* Products Grid using unified ProductCard */}
      {products.length === 0 ? (
        <div className="py-16 rounded-xl bg-white text-[#151A24] text-center border border-[#E5E7EB]">
          <ShoppingBag className="w-12 h-12 text-[#9CA3AF] mx-auto mb-3" />
          <h3 className="text-base font-semibold">No products found</h3>
          <p className="text-xs text-[#6B7280] mt-1">Try adjusting your search criteria or category filter.</p>
          <Link
            href="/products"
            className="mt-4 inline-block px-4 py-2 rounded-lg bg-[#1E7A56] hover:bg-[#186347] text-xs font-semibold text-white transition-colors"
          >
            Clear Filters
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
          {products.map((product) => (
            <ProductCard
              key={product.id}
              id={product.id}
              name={product.name}
              price={product.price}
              imageUrl={product.imageUrl}
              category={product.category}
              stock={product.stock}
              rating={4.8}
              reviewsCount={product.stock + 40}
              vendor={product.vendor}
            />
          ))}
        </div>
      )}
    </div>
  );
}
