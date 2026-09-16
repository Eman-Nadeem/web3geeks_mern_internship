'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { useRouter, usePathname } from 'next/navigation';
import { 
  Search, 
  ShoppingCart, 
  Heart, 
  ChevronDown, 
  User, 
  Menu, 
  X,
  LogOut,
  LayoutDashboard,
  Store,
  ShieldCheck
} from 'lucide-react';

interface CurrentUser {
  id: string;
  name: string;
  email: string;
  role: 'CUSTOMER' | 'VENDOR' | 'ADMIN';
  vendor?: {
    id: string;
    name: string;
    slug: string;
    status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  } | null;
}

const CATEGORIES = [
  { id: 'all', name: 'All Categories' },
  { id: 'Electronics', name: 'Electronics' },
  { id: 'Displays', name: 'Displays' },
  { id: 'Audio', name: 'Audio' },
  { id: 'Accessories', name: 'Accessories' },
];

const CATEGORY_NAV_LINKS = [
  { name: 'All Products', href: '/products' },
  { name: 'Electronics', href: '/products?category=Electronics' },
  { name: 'Displays', href: '/products?category=Displays' },
  { name: 'Audio', href: '/products?category=Audio' },
  { name: 'Accessories', href: '/products?category=Accessories' },
  { name: 'Verified Stores', href: '/vendors' },
  { name: "Today's Deals", href: '/products?filter=deals' },
];

export function Navbar() {
  const router = useRouter();
  const pathname = usePathname();
  const [user, setUser] = useState<CurrentUser | null>(null);
  const [loading, setLoading] = useState(true);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchCategory, setSearchCategory] = useState('all');
  const [searchQuery, setSearchQuery] = useState('');

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
      .finally(() => setLoading(false));
  }, [pathname]);

  const handleLogout = async () => {
    await fetch('/api/auth/logout', { method: 'POST' });
    setUser(null);
    router.push('/login');
    router.refresh();
  };

  const handleSearch = (e: React.FormEvent) => {
    e.preventDefault();
    const params = new URLSearchParams();
    if (searchQuery.trim()) params.set('search', searchQuery.trim());
    if (searchCategory !== 'all') params.set('category', searchCategory);
    router.push(`/products${params.toString() ? `?${params.toString()}` : ''}`);
  };

  return (
    <header className="sticky top-0 z-50 bg-[#12192A] border-b border-[#232E44] text-white">
      {/* 1. Top Bar */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex items-center justify-between gap-4 h-16">
          {/* Logo: Green N Mark + Bold Uppercase NEXUS MARKET */}
          <Link href="/" className="flex items-center gap-2.5 shrink-0 group">
            <div className="w-8 h-8 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs overflow-hidden">
              <img 
                src="/logo.png" 
                alt="Nexus Market Logo" 
                className="w-full h-full object-contain"
              />
            </div>
            <span className="font-extrabold text-[17px] tracking-tight uppercase text-white font-sans">
              NEXUS MARKET
            </span>
          </Link>

          {/* Omnibar Search (Center, flex-grow) */}
          <form
            onSubmit={handleSearch}
            className="hidden md:flex flex-1 max-w-2xl mx-4 items-center rounded-lg bg-white overflow-hidden shadow-xs"
          >
            {/* Category Dropdown */}
            <div className="relative border-r border-[#E5E7EB] bg-[#F9FAFB]">
              <select
                value={searchCategory}
                onChange={(e) => setSearchCategory(e.target.value)}
                className="appearance-none bg-transparent py-2.5 pl-3 pr-7 text-[13px] font-medium text-[#151A24] focus:outline-none cursor-pointer"
              >
                {CATEGORIES.map((cat) => (
                  <option key={cat.id} value={cat.id} className="text-[#151A24]">
                    {cat.name}
                  </option>
                ))}
              </select>
              <ChevronDown className="w-3.5 h-3.5 absolute right-2 top-1/2 -translate-y-1/2 text-[#6B7280] pointer-events-none" />
            </div>

            {/* Search Input */}
            <input
              type="text"
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              placeholder="Search for electronics, home goods, more..."
              className="flex-1 bg-transparent px-3.5 py-2.5 text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none"
            />

            {/* Green Search Button */}
            <button
              type="submit"
              className="px-5 py-2.5 bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[13px] font-semibold flex items-center gap-1.5 transition-colors cursor-pointer"
            >
              <Search className="w-4 h-4" />
              <span>Search</span>
            </button>
          </form>

          {/* Right Utility: User Profile / Wishlist / Cart */}
          <div className="flex items-center gap-4 shrink-0">
            {/* Account / User Row */}
            {!loading && user ? (
              <div className="flex items-center gap-2.5 text-[13px]">
                <div className="flex items-center gap-2">
                  <div className="w-8 h-8 rounded-full bg-[#1B2436] border border-[#232E44] flex items-center justify-center text-[12px] font-bold text-[#1E7A56]">
                    {user.name.charAt(0).toUpperCase()}
                  </div>
                  <div className="hidden lg:flex flex-col text-left leading-tight">
                    <span className="text-[11px] text-[#A9B2C3]">Hello,</span>
                    <span className="font-semibold text-white truncate max-w-[100px]">{user.name}</span>
                  </div>
                </div>

                {/* Role shortcuts */}
                {user.role === 'VENDOR' && (
                  <Link
                    href="/vendor/dashboard"
                    className="hidden xl:inline-flex text-xs px-2.5 py-1 rounded bg-[#1B2436] text-[#A9B2C3] hover:text-white border border-[#232E44]"
                  >
                    Dashboard
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/vendors"
                    className="hidden xl:inline-flex text-xs px-2.5 py-1 rounded bg-[#1B2436] text-[#A9B2C3] hover:text-white border border-[#232E44]"
                  >
                    Admin
                  </Link>
                )}

                <button
                  onClick={handleLogout}
                  title="Sign Out"
                  className="p-1 text-[#A9B2C3] hover:text-white transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                className="hidden sm:flex items-center gap-2 text-[13px] text-white hover:text-[#A9B2C3] transition-colors"
              >
                <div className="w-8 h-8 rounded-full bg-[#1B2436] border border-[#232E44] flex items-center justify-center">
                  <User className="w-4 h-4 text-[#A9B2C3]" />
                </div>
                <div className="flex flex-col text-left leading-tight">
                  <span className="text-[11px] text-[#A9B2C3]">Sign In</span>
                  <span className="font-semibold">Account</span>
                </div>
              </Link>
            )}

            {/* Wishlist Icon with Green Count Badge */}
            <Link
              href="/products"
              title="Wishlist"
              className="relative p-1.5 text-white hover:text-[#A9B2C3] transition-colors"
            >
              <Heart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#1E7A56] text-white text-[10px] font-bold flex items-center justify-center">
                3
              </span>
            </Link>

            {/* Cart Icon with Green Count Badge */}
            <Link
              href="/products"
              title="Cart"
              className="relative p-1.5 text-white hover:text-[#A9B2C3] transition-colors"
            >
              <ShoppingCart className="w-5 h-5" />
              <span className="absolute -top-1 -right-1.5 w-4 h-4 rounded-full bg-[#1E7A56] text-white text-[10px] font-bold flex items-center justify-center">
                5
              </span>
            </Link>

            {/* Mobile Hamburger */}
            <button
              onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
              className="md:hidden p-1.5 text-[#A9B2C3] hover:text-white"
            >
              {mobileMenuOpen ? <X className="w-6 h-6" /> : <Menu className="w-6 h-6" />}
            </button>
          </div>
        </div>

        {/* Mobile Search Bar */}
        <form
          onSubmit={handleSearch}
          className="md:hidden pb-3 flex items-center rounded-lg bg-white overflow-hidden"
        >
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search electronics, home goods..."
            className="flex-1 px-3 py-2 text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none"
          />
          <button
            type="submit"
            className="px-4 py-2 bg-[#1E7A56] text-white text-[13px] font-semibold"
          >
            <Search className="w-4 h-4" />
          </button>
        </form>
      </div>

      {/* 2. Category Nav (Second row directly below top bar, same bg-header, plain text links) */}
      <div className="border-t border-[#232E44] bg-[#12192A]">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <nav className="flex items-center gap-6 sm:gap-8 overflow-x-auto py-2.5 no-scrollbar text-[13px]">
            {CATEGORY_NAV_LINKS.map((link) => {
              const isActive = pathname === link.href;
              return (
                <Link
                  key={link.name}
                  href={link.href}
                  className={`shrink-0 transition-colors ${
                    isActive
                      ? 'text-white font-semibold'
                      : 'text-[#A9B2C3] hover:text-white font-normal'
                  }`}
                >
                  {link.name}
                </Link>
              );
            })}
          </nav>
        </div>
      </div>

      {/* Mobile Menu Dropdown */}
      {mobileMenuOpen && (
        <div className="md:hidden px-4 py-4 space-y-2 border-t border-[#232E44] bg-[#12192A]">
          {CATEGORY_NAV_LINKS.map((link) => (
            <Link
              key={link.name}
              href={link.href}
              onClick={() => setMobileMenuOpen(false)}
              className="block py-1.5 text-sm text-[#A9B2C3] hover:text-white"
            >
              {link.name}
            </Link>
          ))}

          <div className="pt-3 border-t border-[#232E44]">
            {user ? (
              <div className="space-y-2">
                <div className="text-xs text-[#A9B2C3]">
                  Signed in as <span className="text-white font-semibold">{user.name}</span>
                </div>
                {user.role === 'VENDOR' && (
                  <Link
                    href="/vendor/dashboard"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-[#1E7A56] font-semibold"
                  >
                    Vendor Dashboard
                  </Link>
                )}
                {user.role === 'ADMIN' && (
                  <Link
                    href="/admin/vendors"
                    onClick={() => setMobileMenuOpen(false)}
                    className="block text-sm text-[#1E7A56] font-semibold"
                  >
                    Admin Approval Panel
                  </Link>
                )}
                <button
                  onClick={() => {
                    setMobileMenuOpen(false);
                    handleLogout();
                  }}
                  className="text-xs text-rose-400 font-semibold"
                >
                  Sign Out
                </button>
              </div>
            ) : (
              <Link
                href="/login"
                onClick={() => setMobileMenuOpen(false)}
                className="block py-2 text-center text-sm font-semibold rounded bg-[#1E7A56] text-white"
              >
                Sign In / Register
              </Link>
            )}
          </div>
        </div>
      )}
    </header>
  );
}
