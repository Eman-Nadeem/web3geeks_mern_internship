import React from 'react';
import Link from 'next/link';

export function Footer() {
  return (
    <footer className="mt-auto border-t border-(--border-dark) bg-(--bg-header) text-(--text-on-dark) transition-colors duration-200">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-12">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          {/* Logo & About */}
          <div className="space-y-3">
            <Link href="/" className="flex items-center gap-2.5">
              <div className="w-8 h-8 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs">
                <img 
                  src="/logo.png" 
                  alt="Nexus Market Logo" 
                  className="w-full h-full object-contain" 
                />
              </div>
              <span className="font-extrabold text-[17px] tracking-tight uppercase text-(--text-on-dark) font-sans">
                NEXUS MARKET
              </span>
            </Link>
            <p className="text-[13px] text-(--text-on-dark-muted) leading-relaxed">
              Curated multi-vendor marketplace connecting shoppers directly with verified independent sellers and creators.
            </p>
          </div>

          {/* Explore marketplace (Sentence Case) */}
          <div>
            <h4 className="text-[13px] font-bold text-(--text-on-dark) mb-3 tracking-tight">
              Explore marketplace
            </h4>
            <ul className="space-y-2 text-[13px] text-(--text-on-dark-muted)">
              <li>
                <Link href="/products" className="hover:text-(--text-on-dark) transition-colors">
                  All catalog products
                </Link>
              </li>
              <li>
                <Link href="/vendors" className="hover:text-(--text-on-dark) transition-colors">
                  Verified stores & merchants
                </Link>
              </li>
              <li>
                <Link href="/products?category=Electronics" className="hover:text-(--text-on-dark) transition-colors">
                  Electronics
                </Link>
              </li>
              <li>
                <Link href="/products?category=Audio" className="hover:text-(--text-on-dark) transition-colors">
                  Audio & sound
                </Link>
              </li>
            </ul>
          </div>

          {/* Merchant hub (Sentence Case) */}
          <div>
            <h4 className="text-[13px] font-bold text-(--text-on-dark) mb-3 tracking-tight">
              Merchant hub
            </h4>
            <ul className="space-y-2 text-[13px] text-(--text-on-dark-muted)">
              <li>
                <Link href="/vendor/onboarding" className="hover:text-(--text-on-dark) transition-colors">
                  Open a storefront
                </Link>
              </li>
              <li>
                <Link href="/vendor/dashboard" className="hover:text-(--text-on-dark) transition-colors">
                  Seller dashboard
                </Link>
              </li>
              <li>
                <Link href="/vendor/products" className="hover:text-(--text-on-dark) transition-colors">
                  Inventory manager
                </Link>
              </li>
            </ul>
          </div>

          {/* Platform & admin (Sentence Case) */}
          <div>
            <h4 className="text-[13px] font-bold text-(--text-on-dark) mb-3 tracking-tight">
              Platform & admin
            </h4>
            <ul className="space-y-2 text-[13px] text-(--text-on-dark-muted)">
              <li>
                <Link href="/admin/vendors" className="hover:text-(--text-on-dark) transition-colors">
                  Admin approval queue
                </Link>
              </li>
              <li>
                <Link href="/login" className="hover:text-(--text-on-dark) transition-colors">
                  Account sign in
                </Link>
              </li>
              <li>
                <Link href="/register" className="hover:text-(--text-on-dark) transition-colors">
                  Create account
                </Link>
              </li>
            </ul>
          </div>
        </div>

        <div className="mt-8 pt-8 border-t border-(--border-dark) flex flex-col sm:flex-row items-center justify-between text-[12px] text-(--text-on-dark-muted)">
          <p>© 2026 Nexus Market. Verified, direct independent commerce.</p>
          <div className="flex items-center gap-6 mt-4 sm:mt-0 text-[12px]">
            <Link href="/products" className="hover:text-(--text-on-dark) transition-colors">
              Privacy Policy
            </Link>
            <Link href="/products" className="hover:text-(--text-on-dark) transition-colors">
              Terms of Service
            </Link>
          </div>
        </div>
      </div>
    </footer>
  );
}
