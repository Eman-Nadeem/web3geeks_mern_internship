import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  LayoutDashboard, 
  Package, 
  PlusCircle, 
  Settings, 
  ExternalLink, 
  AlertCircle, 
  Store,
  Boxes,
  ShoppingBag
} from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export default async function VendorLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  const vendor = user.vendor;

  // If user has not created a vendor yet, allow rendering children (e.g. Onboarding page)
  if (!vendor) {
    return (
      <div className="min-h-screen flex flex-col bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
        <Navbar />
        <div className="max-w-4xl mx-auto px-4 py-8 w-full flex-1">
          {children}
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Status Lifecycle Notification Banners */}
        {vendor.status === 'PENDING' && (
          <div className="p-4 rounded-2xl bg-amber-950/40 border border-amber-800/80 flex items-start gap-3.5 shadow-lg shadow-amber-950/20">
            <AlertCircle className="w-5 h-5 text-amber-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-amber-300">Store Application Under Review</h4>
              <p className="text-amber-400/90 leading-relaxed">
                Your vendor store application is currently in <span className="font-semibold uppercase tracking-wider">PENDING</span> status awaiting administrator review. 
                Your public storefront (/vendors/{vendor.slug}) is cloaked (returns 404) until approved. You may configure your profile and draft products in the meantime.
              </p>
            </div>
          </div>
        )}

        {vendor.status === 'SUSPENDED' && (
          <div className="p-4 rounded-2xl bg-rose-950/40 border border-rose-800/80 flex items-start gap-3.5 shadow-lg shadow-rose-950/20">
            <AlertCircle className="w-5 h-5 text-rose-400 shrink-0 mt-0.5" />
            <div className="space-y-1 text-xs">
              <h4 className="font-bold text-rose-300">Store Suspended by Marketplace Administration</h4>
              <p className="text-rose-400/90 leading-relaxed">
                Your vendor store has been suspended. Your public storefront is unreachable and active products have been removed from public marketplace listings.
              </p>
            </div>
          </div>
        )}

        {/* Vendor Header Strip */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) shadow-sm">
          <div className="flex items-center gap-3.5">
            <div className="w-12 h-12 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) overflow-hidden flex items-center justify-center font-bold text-emerald-500 text-lg">
              {vendor.logoUrl ? (
                <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
              ) : (
                vendor.name.charAt(0)
              )}
            </div>
            <div>
              <div className="flex items-center gap-2.5">
                <h1 className="text-lg font-bold text-(--text-on-dark) tracking-tight">{vendor.name}</h1>
                <StatusBadge status={vendor.status} />
              </div>
              <p className="text-xs text-(--text-on-dark-muted) mt-0.5">
                Vendor ID: <span className="font-mono opacity-75">{vendor.id.slice(0, 8)}...</span> • Slug: <span className="font-mono text-emerald-600 dark:text-emerald-400">{vendor.slug}</span>
              </p>
            </div>
          </div>

          {/* Navigation tabs */}
          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/vendor/dashboard"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link
              href="/vendor/orders"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
            >
              <ShoppingBag className="w-3.5 h-3.5 text-amber-500" />
              Orders
            </Link>
            <Link
              href="/vendor/products"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              Products
            </Link>
            <Link
              href="/vendor/inventory"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
            >
              <Boxes className="w-3.5 h-3.5 text-cyan-500" />
              Inventory
            </Link>
            <Link
              href="/vendor/products/new"
              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-xs font-semibold flex items-center gap-1.5 transition-colors shadow-sm"
            >
              <PlusCircle className="w-3.5 h-3.5" />
              Add Product
            </Link>
            <Link
              href="/vendor/profile"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors"
            >
              <Settings className="w-3.5 h-3.5" />
              Store Settings
            </Link>
            {vendor.status === 'ACTIVE' && (
              <Link
                href={`/vendors/${vendor.slug}`}
                target="_blank"
                className="px-3 py-1.5 rounded-lg bg-indigo-500/15 hover:bg-indigo-500/25 text-indigo-600 dark:text-indigo-400 border border-indigo-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
              >
                <ExternalLink className="w-3.5 h-3.5" />
                Live Storefront
              </Link>
            )}
          </div>
        </div>

        {/* Content body */}
        <div>{children}</div>
      </div>
    </div>
  );
}
