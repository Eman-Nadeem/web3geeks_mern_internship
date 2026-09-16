import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { Users, Store, Package, Clock, ArrowRight, ShieldCheck } from 'lucide-react';
import { VendorStatus, ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  const [totalUsers, totalVendors, pendingVendors, totalProducts] = await Promise.all([
    prisma.user.count(),
    prisma.vendor.count(),
    prisma.vendor.count({ where: { status: VendorStatus.PENDING } }),
    prisma.product.count(),
  ]);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-2xl font-bold text-[var(--text-on-dark)] tracking-tight">System Status & Metrics</h2>
        <p className="text-xs text-[var(--text-on-dark-muted)] mt-1">Platform-wide statistics and pending operational tasks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-500" />
          </div>
          <div className="text-3xl font-extrabold text-amber-500">{pendingVendors}</div>
          <Link
            href="/admin/vendors"
            className="text-[11px] text-amber-600 dark:text-amber-400 hover:underline inline-flex items-center gap-1 font-semibold pt-1"
          >
            Review applications &rarr;
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Vendors</span>
            <Store className="w-4 h-4 text-emerald-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-on-dark)]">{totalVendors}</div>
          <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Registered stores</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
            <Package className="w-4 h-4 text-indigo-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-on-dark)]">{totalProducts}</div>
          <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Multi-vendor catalog items</span>
        </div>

        <div className="p-5 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-xs space-y-2">
          <div className="flex items-center justify-between text-[var(--text-on-dark-muted)]">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-purple-500" />
          </div>
          <div className="text-3xl font-extrabold text-[var(--text-on-dark)]">{totalUsers}</div>
          <span className="text-[11px] text-[var(--text-on-dark-muted)] block">Customers & merchant owners</span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-[var(--surface-card)] border border-[var(--border-dark)] shadow-xs flex flex-col sm:flex-row items-center justify-between gap-4">
        <div className="space-y-1 text-center sm:text-left">
          <h3 className="text-base font-bold text-[var(--text-on-dark)]">Vendor Review & Approval Queue</h3>
          <p className="text-xs text-[var(--text-on-dark-muted)]">
            {pendingVendors > 0
              ? `There are ${pendingVendors} merchant stores awaiting your approval.`
              : 'All vendor store applications have been reviewed.'}
          </p>
        </div>
        <Link
          href="/admin/vendors"
          className="px-4 py-2 rounded-xl bg-amber-500 hover:bg-amber-400 text-slate-950 font-bold text-xs flex items-center gap-1.5 transition-colors shadow-md shadow-amber-500/20"
        >
          Open Approval Queue
          <ArrowRight className="w-4 h-4" />
        </Link>
      </div>
    </div>
  );
}
