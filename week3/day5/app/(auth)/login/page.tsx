'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, ArrowRight, ShieldCheck, Store, User } from 'lucide-react';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, password }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Invalid credentials');
        setLoading(false);
        return;
      }

      // Role-based redirect
      if (data.data.role === 'ADMIN') {
        router.push('/admin/vendors');
      } else if (data.data.role === 'VENDOR') {
        router.push('/vendor/dashboard');
      } else {
        router.push('/products');
      }
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  const fillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="w-full flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center space-y-2 mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-9 h-9 rounded-xl bg-white p-1 flex items-center justify-center shadow-md border border-(--border-dark)">
            <img src="/logo.png" alt="Nexus Market Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-[18px] tracking-tight uppercase text-(--text-on-dark) font-sans">
            NEXUS MARKET
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-(--text-on-dark) tracking-tight">Sign in to your account</h1>
        <p className="text-[13px] text-(--text-on-dark-muted)">Welcome back to Nexus Market</p>
      </div>

      {/* Centered Surface Card Form Panel */}
      <div className="w-full max-w-md bg-(--surface-card) rounded-2xl border border-(--border-dark) shadow-xl p-6 sm:p-8 text-(--text-on-dark)">
        {/* Quick Demo Autofill Bar */}
        <div className="mb-5 pb-4 border-b border-(--border-dark)">
          <span className="text-[11px] font-semibold text-(--text-on-dark-muted) uppercase tracking-wider block mb-2">
            Demo Accounts (Autofill)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('sophia@example.com')}
              className="py-1.5 px-2 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) border border-(--border-dark) text-[12px] font-semibold text-(--text-on-dark) flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5 text-emerald-500" />
              <span>Customer</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('alex@novatech.com')}
              className="py-1.5 px-2 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) border border-(--border-dark) text-[12px] font-semibold text-(--text-on-dark) flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5 text-emerald-500" />
              <span>Vendor</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('admin@nexusmarket.com')}
              className="py-1.5 px-2 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) border border-(--border-dark) text-[12px] font-semibold text-(--text-on-dark) flex items-center justify-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5 text-emerald-500" />
              <span>Admin</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-xl bg-rose-500/10 border border-rose-500/30 text-xs text-rose-500 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          <div>
            <label className="block text-[13px] font-medium text-(--text-on-dark) mb-1">
              Email address
            </label>
            <div className="relative">
              <Mail className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="name@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-[13px] text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-(--text-on-dark) mb-1">
              Password
            </label>
            <div className="relative">
              <Lock className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-[13px] text-(--text-on-dark) placeholder:text-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500 focus:ring-1 focus:ring-emerald-500"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white text-[14px] font-semibold transition-colors duration-150 shadow-md cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Signing in...' : 'Sign In'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-(--border-dark) text-center text-[13px] text-(--text-on-dark-muted)">
          Don&apos;t have an account?{' '}
          <Link href="/register" className="text-emerald-500 hover:underline font-semibold">
            Create an account
          </Link>
        </div>
      </div>
    </div>
  );
}
