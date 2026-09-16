import React from 'react';
import Link from 'next/link';
import { redirect } from 'next/navigation';
import { getCurrentUser } from '@/lib/auth';
import { ShieldCheck, Users, Store, Package, ArrowLeft, LayoutDashboard } from 'lucide-react';
import { Navbar } from '@/components/Navbar';

export const dynamic = 'force-dynamic';

export default async function AdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();

  if (!user) {
    redirect('/login');
  }

  if (user.role !== 'ADMIN') {
    return (
      <div className="min-h-screen flex flex-col bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
        <Navbar />
        <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-500/10 border border-rose-500/30 text-rose-500 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-(--text-on-dark)">Access Denied (403)</h1>
          <p className="text-xs text-(--text-on-dark-muted)">
            Administrative access is strictly restricted to administrator accounts.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-xs font-semibold text-white transition-colors"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Admin Header Strip */}
        <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) flex flex-col sm:flex-row sm:items-center justify-between gap-4 shadow-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-500/10 border border-amber-500/30 text-amber-500 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-(--text-on-dark) tracking-tight">Marketplace Administration</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-500/15 text-amber-600 dark:text-amber-400 border border-amber-500/30 uppercase tracking-wider">
                  Admin Guard
                </span>
              </div>
              <p className="text-xs text-(--text-on-dark-muted)">
                Governance, vendor lifecycle reviews, and product inventory monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2 flex-wrap">
            <Link
              href="/admin/dashboard"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) border border-(--border-dark) text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </Link>
            <Link
              href="/admin/vendors"
              className="px-3 py-1.5 rounded-lg bg-amber-500/15 hover:bg-amber-500/25 text-amber-600 dark:text-amber-400 border border-amber-500/30 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Vendor Approval Queue
            </Link>
            <Link
              href="/admin/products"
              className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) border border-(--border-dark) text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Package className="w-3.5 h-3.5" />
              All Products
            </Link>
          </div>
        </div>

        <div>{children}</div>
      </div>
    </div>
  );
}
