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
        <h2 className="text-2xl font-bold text-white tracking-tight">System Status & Metrics</h2>
        <p className="text-xs text-slate-400 mt-1">Platform-wide statistics and pending operational tasks</p>
      </div>

      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5">
        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Pending Approvals</span>
            <Clock className="w-4 h-4 text-amber-400" />
          </div>
          <div className="text-3xl font-extrabold text-amber-400">{pendingVendors}</div>
          <Link
            href="/admin/vendors?status=pending"
            className="text-[11px] text-amber-400/90 hover:underline inline-flex items-center gap-1 font-semibold pt-1"
          >
            Review applications &rarr;
          </Link>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Vendors</span>
            <Store className="w-4 h-4 text-emerald-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalVendors}</div>
          <span className="text-[11px] text-slate-500 block">Registered stores</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Products</span>
            <Package className="w-4 h-4 text-indigo-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalProducts}</div>
          <span className="text-[11px] text-slate-500 block">Multi-vendor catalog items</span>
        </div>

        <div className="p-5 rounded-2xl bg-slate-900/60 border border-slate-800 space-y-2">
          <div className="flex items-center justify-between text-slate-400">
            <span className="text-xs font-semibold uppercase tracking-wider">Total Users</span>
            <Users className="w-4 h-4 text-purple-400" />
          </div>
          <div className="text-3xl font-extrabold text-white">{totalUsers}</div>
          <span className="text-[11px] text-slate-500 block">Customers & merchant owners</span>
        </div>
      </div>

      <div className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 flex items-center justify-between">
        <div className="space-y-1">
          <h3 className="text-base font-bold text-white">Vendor Review & Approval Queue</h3>
          <p className="text-xs text-slate-400">
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
