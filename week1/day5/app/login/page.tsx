'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';

export default function LoginPage() {
  const router = useRouter();
  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [isLoading, setIsLoading] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const [showPassword, setShowPassword] = useState(false);

  const handleLogin = async (e: React.FormEvent) => {
    e.preventDefault();
    setErrorMsg('');
    setIsLoading(true);

    try {
      const res = await fetch('/api/auth/login', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: email.trim(), password }),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Login failed');
      }

      router.push('/');
      router.refresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to login');
    } finally {
      setIsLoading(false);
    }
  };

  // Demo user pre-fill helper for quick testing
  const prefillDemo = (demoEmail: string) => {
    setEmail(demoEmail);
    setPassword('Password123!');
  };

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center p-6">
      <div className="bg-white rounded-3xl shadow-xl border border-slate-200/80 w-full max-w-md p-8 space-y-6">
        {/* Header */}
        <div className="text-center space-y-2">
          <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] flex items-center justify-center shadow-lg shadow-[#FF6B2C]/20 mx-auto">
            <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
            Welcome Back
          </h1>
          <p className="text-xs text-slate-500 font-medium">
            Sign in to access your Multi-Tenant SaaS Workspace
          </p>
        </div>

        {errorMsg && (
          <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
            {errorMsg}
          </div>
        )}

        {/* Form */}
        <form onSubmit={handleLogin} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Work Email
            </label>
            <input
              type="email"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              placeholder="user@acme.com"
              required
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                placeholder="••••••••"
                required
                className="w-full bg-slate-50 border border-slate-200 rounded-xl pl-4 pr-11 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-3 top-1/2 -translate-y-1/2 text-slate-400 hover:text-slate-600 p-1"
                title={showPassword ? 'Hide Password' : 'Show Password'}
              >
                {showPassword ? (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13.875 18.825A10.05 10.05 0 0112 19c-4.478 0-8.268-2.943-9.543-7a9.97 9.97 0 011.563-3.029m5.858-5.908a9.96 9.96 0 013.122-.063c4.478 0 8.268 2.943 9.542 7a10.025 10.025 0 01-4.132 5.411m-1.547 1.547L3 3l18 18" />
                  </svg>
                ) : (
                  <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
                  </svg>
                )}
              </button>
            </div>
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full py-3 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-sm shadow-md shadow-[#FF6B2C]/20 transition-all disabled:opacity-50"
          >
            {isLoading ? 'Signing in...' : 'Sign In'}
          </button>
        </form>

        {/* Demo Users Pre-fill Helpers */}
        <div className="pt-4 border-t border-slate-100">
          <p className="text-[11px] font-bold text-slate-400 uppercase tracking-wider text-center mb-2">
            Quick Test Credentials (Seed Data)
          </p>
          <div className="grid grid-cols-2 gap-2 text-[11px]">
            <button
              type="button"
              onClick={() => prefillDemo('superadmin@system.com')}
              className="p-2 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-900 font-medium text-left border border-purple-200 col-span-2"
            >
              <span className="font-bold text-purple-700 block">Super Admin</span>
              <span>superadmin@system.com</span>
            </button>
            <button
              type="button"
              onClick={() => prefillDemo('admin@acme.com')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left border border-slate-200"
            >
              <span className="font-bold text-[#FF6B2C] block">Acme Admin</span>
              <span>admin@acme.com</span>
            </button>
            <button
              type="button"
              onClick={() => prefillDemo('pm@acme.com')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left border border-slate-200"
            >
              <span className="font-bold text-amber-600 block">Acme Manager</span>
              <span>pm@acme.com</span>
            </button>
            <button
              type="button"
              onClick={() => prefillDemo('member@acme.com')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left border border-slate-200"
            >
              <span className="font-bold text-sky-600 block">Acme Member</span>
              <span>member@acme.com</span>
            </button>
            <button
              type="button"
              onClick={() => prefillDemo('admin@stark.com')}
              className="p-2 rounded-lg bg-slate-100 hover:bg-slate-200 text-slate-700 font-medium text-left border border-slate-200"
            >
              <span className="font-bold text-purple-600 block">Stark Admin (Org B)</span>
              <span>admin@stark.com</span>
            </button>
          </div>
        </div>

        <div className="text-center pt-2">
          <p className="text-xs text-slate-500">
            Need to register a new tenant organization?{' '}
            <Link href="/signup" className="text-[#FF6B2C] font-bold hover:underline">
              Create Account
            </Link>
          </p>
        </div>
      </div>
    </div>
  );
}
