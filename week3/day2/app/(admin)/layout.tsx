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
      <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-on-dark)] transition-colors duration-200">
        <Navbar />
        <div className="max-w-md mx-auto py-24 px-4 text-center space-y-4">
          <div className="w-12 h-12 rounded-2xl bg-rose-950/60 border border-rose-800 text-rose-400 flex items-center justify-center mx-auto">
            <ShieldCheck className="w-6 h-6" />
          </div>
          <h1 className="text-xl font-bold text-white">Access Denied (403)</h1>
          <p className="text-xs text-[var(--text-on-dark-muted)]">
            Administrative access is strictly restricted to administrator accounts.
          </p>
          <Link
            href="/"
            className="inline-block px-4 py-2 rounded-xl bg-slate-800 hover:bg-slate-700 text-xs font-semibold text-white"
          >
            Return to Marketplace
          </Link>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen flex flex-col bg-[var(--bg-canvas)] text-[var(--text-on-dark)] transition-colors duration-200">
      <Navbar />

      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8 w-full flex-1 space-y-6">
        {/* Admin Header Strip */}
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 flex flex-col sm:flex-row sm:items-center justify-between gap-4 backdrop-blur-sm">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-xl bg-amber-950/60 border border-amber-800/60 text-amber-400 flex items-center justify-center font-bold">
              <ShieldCheck className="w-5 h-5" />
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h1 className="text-base font-bold text-white tracking-tight">Marketplace Administration</h1>
                <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-amber-950/80 text-amber-400 border border-amber-800/80 uppercase tracking-wider">
                  Admin Guard
                </span>
              </div>
              <p className="text-xs text-slate-400">
                Governance, vendor lifecycle reviews, and product inventory monitoring.
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            <Link
              href="/admin/dashboard"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Overview
            </Link>
            <Link
              href="/admin/vendors"
              className="px-3 py-1.5 rounded-lg bg-amber-950/60 hover:bg-amber-900 text-amber-300 border border-amber-800/60 text-xs font-semibold flex items-center gap-1.5 transition-colors"
            >
              <Store className="w-3.5 h-3.5" />
              Vendor Approval Queue
            </Link>
            <Link
              href="/admin/products"
              className="px-3 py-1.5 rounded-lg bg-slate-800 hover:bg-slate-700 text-slate-200 text-xs font-semibold flex items-center gap-1.5 transition-colors"
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
