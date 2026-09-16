import type { Metadata } from 'next';
import { Inter } from 'next/font/google';
import './globals.css';
import { ThemeProvider } from '@/components/ThemeProvider';

const inter = Inter({ subsets: ['latin'] });

export const metadata: Metadata = {
  title: 'NexusMarket - Global Multi-Vendor Marketplace',
  description: 'Shop quality tech, displays, audio, and accessories directly from verified independent merchants.',
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className="dark h-full antialiased" suppressHydrationWarning>
      <body className={`${inter.className} min-h-screen flex flex-col bg-[var(--bg-page)] text-[var(--text-main)] transition-colors duration-200`}>
        <ThemeProvider>
          {children}
        </ThemeProvider>
      </body>
    </html>
  );
}
