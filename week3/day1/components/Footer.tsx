import React from 'react';
import Link from 'next/link';
import { ShoppingBag, Shield, Store, Users, ArrowUpRight } from 'lucide-react';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-slate-200 dark:border-slate-800/80 bg-slate-100/70 dark:bg-slate-950/80 backdrop-blur-sm transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div className="space-y-4">
            <div className="flex items-center gap-2">
              <div className="w-8 h-8 rounded-lg bg-gradient-to-tr from-emerald-600 via-teal-500 to-indigo-600 flex items-center justify-center shadow-xs">
                <ShoppingBag className="w-4 h-4 text-white" />
              </div>
              <span className="font-bold text-slate-900 dark:text-white tracking-tight">NexusMarket</span>
            </div>
            <p className="text-xs text-slate-600 dark:text-slate-400 leading-relaxed">
              Curated multi-vendor marketplace connecting passionate customers directly with verified independent merchants and creators.
            </p>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Explore Marketplace</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/products" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  All Catalog Products
                </Link>
              </li>
              <li>
                <Link href="/vendors" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Verified Stores & Merchants
                </Link>
              </li>
              <li>
                <Link href="/products?category=Electronics" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Electronics & Displays
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Merchant Hub</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/vendor/onboarding" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Open a Storefront
                </Link>
              </li>
              <li>
                <Link href="/vendor/dashboard" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Seller Dashboard
                </Link>
              </li>
              <li>
                <Link href="/vendor/products" className="hover:text-emerald-600 dark:hover:text-emerald-400 transition-colors">
                  Inventory Manager
                </Link>
              </li>
            </ul>
          </div>

          <div>
            <h4 className="text-xs font-semibold text-slate-800 dark:text-slate-200 uppercase tracking-wider mb-3">Platform & Admin</h4>
            <ul className="space-y-2 text-sm text-slate-600 dark:text-slate-400">
              <li>
                <Link href="/admin/vendors" className="hover:text-amber-600 dark:hover:text-amber-400 transition-colors">
                  Admin Approval Center
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-indigo-600 dark:hover:text-indigo-400 transition-colors">
                  User Account Sign In
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-slate-200 dark:border-slate-800/80 flex flex-col sm:flex-row items-center justify-between text-xs text-slate-500 dark:text-slate-400">
          <p>© 2026 NexusMarket Multi-Vendor Engine. Safe, verified, and direct.</p>
          <div className="flex items-center gap-4 mt-4 sm:mt-0">
            <span className="inline-flex items-center gap-1.5 text-emerald-600 dark:text-emerald-400 font-medium">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse" />
              Connected to Supabase PostgreSQL
            </span>
          </div>
        </div>
      </div>
    </footer>
  );
}
