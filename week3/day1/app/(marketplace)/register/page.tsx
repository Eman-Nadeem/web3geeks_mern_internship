'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { Lock, Mail, User, ArrowRight, Store } from 'lucide-react';

export default function RegisterPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [role, setRole] = useState<'CUSTOMER' | 'VENDOR'>('CUSTOMER');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/auth/register', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, email, password, role }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Registration failed');
        setLoading(false);
        return;
      }

      if (role === 'VENDOR') {
        router.push('/vendor/onboarding');
      } else {
        router.push('/products');
      }
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="w-full min-h-[85vh] flex flex-col justify-center items-center py-12 px-4 sm:px-6 lg:px-8 bg-[var(--bg-canvas)] text-[var(--text-on-dark)] transition-colors duration-200">
      {/* Brand Header */}
      <div className="w-full max-w-md text-center space-y-2 mb-6">
        <Link href="/" className="inline-flex items-center gap-2.5">
          <div className="w-8 h-8 rounded-md bg-white p-0.5 flex items-center justify-center shadow-xs">
            <img src="/logo.png" alt="Nexus Market Logo" className="w-full h-full object-contain" />
          </div>
          <span className="font-extrabold text-[17px] tracking-tight uppercase text-[var(--text-on-dark)] font-sans">
            NEXUS MARKET
          </span>
        </Link>
        <h1 className="text-2xl font-bold text-[var(--text-on-dark)] tracking-tight">Create your account</h1>
        <p className="text-[14px] text-[var(--text-on-dark-muted)]">Join Nexus Market as a shopper or verified seller</p>
      </div>

      {/* Single Centered White surface-card Form Panel */}
      <div className="w-full max-w-md bg-white rounded-xl border border-[#E5E7EB] shadow-sm p-6 sm:p-8 text-[#151A24]">
        {error && (
          <div className="mb-4 p-3 rounded-lg bg-rose-50 border border-rose-200 text-xs text-rose-700 font-medium">
            {error}
          </div>
        )}

        <form onSubmit={handleSubmit} className="space-y-4 text-left">
          {/* Account Type Selector */}
          <div>
            <label className="block text-[13px] font-medium text-[#151A24] mb-1.5">
              I want to:
            </label>
            <div className="grid grid-cols-2 gap-2">
              <button
                type="button"
                onClick={() => setRole('CUSTOMER')}
                className={`py-2 px-3 rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  role === 'CUSTOMER'
                    ? 'border-[#1E7A56] bg-emerald-50 text-[#1E7A56]'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50'
                }`}
              >
                <User className="w-4 h-4" />
                <span>Buy Products</span>
              </button>
              <button
                type="button"
                onClick={() => setRole('VENDOR')}
                className={`py-2 px-3 rounded-lg border text-[13px] font-semibold flex items-center justify-center gap-1.5 transition-colors cursor-pointer ${
                  role === 'VENDOR'
                    ? 'border-[#1E7A56] bg-emerald-50 text-[#1E7A56]'
                    : 'border-[#E5E7EB] text-[#6B7280] hover:bg-slate-50'
                }`}
              >
                <Store className="w-4 h-4" />
                <span>Sell as Merchant</span>
              </button>
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#151A24]">
              Full Name
            </label>
            <div className="mt-1 relative">
              <User className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="text"
                required
                value={name}
                onChange={(e) => setName(e.target.value)}
                placeholder="Jane Doe"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E7A56] focus:ring-1 focus:ring-[#1E7A56]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#151A24]">
              Email address
            </label>
            <div className="mt-1 relative">
              <Mail className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="jane@example.com"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E7A56] focus:ring-1 focus:ring-[#1E7A56]"
              />
            </div>
          </div>

          <div>
            <label className="block text-[13px] font-medium text-[#151A24]">
              Password
            </label>
            <div className="mt-1 relative">
              <Lock className="w-4 h-4 text-[#9CA3AF] absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" />
              <input
                type="password"
                required
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                className="w-full pl-9 pr-3 py-2.5 bg-white border border-[#E5E7EB] rounded-lg text-[13px] text-[#151A24] placeholder:text-[#9CA3AF] focus:outline-none focus:border-[#1E7A56] focus:ring-1 focus:ring-[#1E7A56]"
              />
            </div>
          </div>

          <button
            type="submit"
            disabled={loading}
            className="w-full mt-2 py-2.5 px-4 rounded-lg bg-[#1E7A56] hover:bg-[#186347] active:bg-[#14523a] text-white text-[14px] font-semibold transition-colors duration-150 shadow-xs cursor-pointer flex items-center justify-center gap-2 disabled:opacity-50"
          >
            {loading ? 'Creating account...' : 'Create Account'}
            <ArrowRight className="w-4 h-4" />
          </button>
        </form>

        <div className="mt-6 pt-4 border-t border-[#E5E7EB] text-center text-[13px] text-[#6B7280]">
          Already have an account?{' '}
          <Link href="/login" className="text-[#1E7A56] hover:underline font-semibold">
            Sign in
          </Link>
        </div>
      </div>
    </div>
  );
}
