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
        setError(data.error || 'Login failed');
        setLoading(false);
        return;
      }

      // Route according to user role
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
    <div className="min-h-[80vh] flex flex-col justify-center py-12 px-4 sm:px-6 lg:px-8 bg-[#1B2436]">
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center space-y-2">
        <Link href="/" className="inline-flex items-center gap-2 mb-2">
          <div className="w-8 h-8 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs">
            <img src="/logo.png" alt="Nexus Market Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-[17px] tracking-tight uppercase text-white">
            NEXUS MARKET
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-white tracking-tight">Sign in to your account</h1>
        <p className="text-[14px] text-[#A9B2C3]">Access customer orders, vendor tools, or admin settings</p>
      </div>

      <div className="mt-6 sm:mx-auto sm:w-full sm:max-w-md">
        {/* Quick Demo Fillers */}
        <div className="mb-4 p-3 rounded-lg bg-[#12192A] border border-[#232E44] text-xs">
          <span className="font-semibold text-[#A9B2C3] block uppercase tracking-wider text-[10px] mb-2">
            Demo Accounts (Click to autofill)
          </span>
          <div className="grid grid-cols-3 gap-2">
            <button
              type="button"
              onClick={() => fillDemo('admin@marketplace.com')}
              className="p-2 rounded bg-[#1B2436] hover:bg-[#232E44] text-amber-400 font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer"
            >
              <ShieldCheck className="w-3.5 h-3.5" />
              <span>Admin</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('alex@techstore.com')}
              className="p-2 rounded bg-[#1B2436] hover:bg-[#232E44] text-[#1E7A56] font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer"
            >
              <Store className="w-3.5 h-3.5" />
              <span>Vendor</span>
            </button>
            <button
              type="button"
              onClick={() => fillDemo('customer@example.com')}
              className="p-2 rounded bg-[#1B2436] hover:bg-[#232E44] text-white font-medium flex flex-col items-center gap-1 transition-colors cursor-pointer"
            >
              <User className="w-3.5 h-3.5" />
              <span>Customer</span>
            </button>
          </div>
        </div>

        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-950/80 border border-rose-800 text-xs text-rose-200">
            {error}
          </div>
        )}

        {/* Single Centered White surface-card Form Panel */}
        <div className="bg-white py-8 px-6 shadow-sm rounded-xl border border-[#E5E7EB] sm:px-8 text-left">
          <form onSubmit={handleSubmit} className="space-y-4">
            <div>
              <label className="block text-[13px] font-medium text-[#151A24]">
                Email address
              </label>
              <div className="mt-1 relative">
                <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="user@example.com"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E7A56]"
                />
              </div>
            </div>

            <div>
              <label className="block text-[13px] font-medium text-[#151A24]">
                Password
              </label>
              <div className="mt-1 relative">
                <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full pl-9 pr-3 py-2 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E7A56]"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className="w-full py-2.5 px-4 rounded-lg bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[14px] font-semibold transition-colors duration-150 shadow-xs cursor-pointer flex items-center justify-center gap-1.5 disabled:opacity-50"
            >
              {loading ? 'Signing in...' : 'Sign In'}
              <ArrowRight className="w-4 h-4" />
            </button>
          </form>

          <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-center text-[13px] text-[#6B7280]">
            Don&apos;t have an account?{' '}
            <Link href="/register" className="text-[#1E7A56] hover:underline font-semibold">
              Create an account
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
}
