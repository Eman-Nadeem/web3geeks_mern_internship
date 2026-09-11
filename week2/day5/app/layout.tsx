import type { Metadata, Viewport } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import { AuthProvider } from "@/lib/auth/context";
import { getCurrentUser } from "@/lib/auth/session";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "SyncDocs — Collaborative Document Editor",
  description: "Real-Time Collaborative Document Editor Foundation (Next.js 15+ App Router)",
};

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
};

export default async function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  const currentUser = await getCurrentUser();

  return (
    <html lang="en" className={`${geistSans.variable} ${geistMono.variable}`}>
      <body className="antialiased bg-(--bg-canvas) text-(--text-primary) font-sans selection:bg-(--accent-soft-bg) selection:text-(--accent-primary) min-h-screen">
        <AuthProvider initialUser={currentUser}>{children}</AuthProvider>
      </body>
    </html>
  );
}
