import React from 'react';
import { Navbar } from '@/components/Navbar';
import { Footer } from '@/components/Footer';

export default function MarketplaceLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <div className="flex flex-col min-h-screen w-full bg-(--bg-canvas) text-(--text-on-dark) transition-colors duration-200">
      <Navbar />
      <main className="flex-1 w-full bg-(--bg-canvas)">{children}</main>
      <Footer />
    </div>
  );
}
