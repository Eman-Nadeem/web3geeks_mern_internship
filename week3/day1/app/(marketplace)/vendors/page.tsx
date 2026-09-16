import React from 'react';
import Link from 'next/link';
import prisma from '@/lib/prisma';
import { StatusBadge } from '@/components/StatusBadge';
import { Store, ArrowRight, Mail, Phone } from 'lucide-react';
import { VendorStatus, ProductStatus } from '@prisma/client';

export const dynamic = 'force-dynamic';

export default async function VendorsDirectoryPage() {
  let vendors: any[] = [];
  try {
    vendors = await prisma.vendor.findMany({
      where: { status: VendorStatus.ACTIVE },
      include: {
        _count: {
          select: {
            products: { where: { status: ProductStatus.ACTIVE } },
          },
        },
      },
      orderBy: { name: 'asc' },
    });
  } catch (err) {
    console.warn('Database query error in VendorsDirectoryPage:', err);
  }

  return (
    <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-10 space-y-8">
      <div className="border-b border-slate-800 pb-6">
        <h1 className="text-3xl font-extrabold text-white tracking-tight flex items-center gap-2">
          <Store className="w-8 h-8 text-emerald-400" />
          Marketplace Vendors Directory
        </h1>
        <p className="text-sm text-slate-400 mt-1">
          Explore approved independent sellers, their catalog of products, and contact details
        </p>
      </div>

      {vendors.length === 0 ? (
        <div className="py-20 rounded-2xl bg-slate-900/30 border border-slate-800 text-center">
          <Store className="w-12 h-12 text-slate-600 mx-auto mb-3" />
          <h3 className="text-base font-semibold text-slate-200">No active vendors found</h3>
          <p className="text-xs text-slate-400 mt-1">Pending vendor stores will appear here once approved by an administrator.</p>
        </div>
      ) : (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {vendors.map((vendor) => (
            <div
              key={vendor.id}
              className="p-6 rounded-2xl bg-slate-900/60 border border-slate-800 hover:border-emerald-700/60 transition-all flex flex-col justify-between"
            >
              <div className="space-y-4">
                <div className="flex items-center justify-between">
                  <div className="w-14 h-14 rounded-2xl bg-slate-800 border border-slate-700 overflow-hidden flex items-center justify-center font-bold text-xl text-emerald-400">
                    {vendor.logoUrl ? (
                      <img
                        src={vendor.logoUrl}
                        alt={vendor.name}
                        className="w-full h-full object-cover"
                      />
                    ) : (
                      vendor.name.charAt(0)
                    )}
                  </div>
                  <StatusBadge status={vendor.status} />
                </div>

                <div>
                  <h3 className="text-lg font-bold text-white">{vendor.name}</h3>
                  <p className="text-xs text-slate-400 mt-1.5 line-clamp-2">
                    {vendor.description || 'Verified merchant on NexusMarket.'}
                  </p>
                </div>

                <div className="space-y-1 text-xs text-slate-400 pt-2 border-t border-slate-800/80">
                  <div className="flex items-center gap-2">
                    <Mail className="w-3.5 h-3.5 text-slate-500" />
                    <span>{vendor.email}</span>
                  </div>
                  {vendor.phone && (
                    <div className="flex items-center gap-2">
                      <Phone className="w-3.5 h-3.5 text-slate-500" />
                      <span>{vendor.phone}</span>
                    </div>
                  )}
                </div>
              </div>

              <div className="mt-6 pt-4 border-t border-slate-800/80 flex items-center justify-between">
                <span className="text-xs text-slate-400 font-medium">
                  {vendor._count.products} Active Products
                </span>
                <Link
                  href={`/vendors/${vendor.slug}`}
                  className="px-3.5 py-1.5 rounded-lg bg-emerald-950/60 hover:bg-emerald-900/60 text-emerald-300 border border-emerald-800/60 text-xs font-semibold flex items-center gap-1 transition-colors"
                >
                  Visit Store
                  <ArrowRight className="w-3.5 h-3.5" />
                </Link>
              </div>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
