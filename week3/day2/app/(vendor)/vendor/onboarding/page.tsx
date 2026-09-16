'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { Store, ArrowRight, ShieldCheck, Mail, Phone, Image as ImageIcon, Link2 } from 'lucide-react';

export default function VendorOnboardingPage() {
  const router = useRouter();
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);

  // Auto-derive slug from store name
  const handleNameChange = (val: string) => {
    setName(val);
    const derived = val
      .toLowerCase()
      .replace(/[^a-z0-9]+/g, '-')
      .replace(/^-+|-+$/g, '');
    setSlug(derived);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const res = await fetch('/api/vendors', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          slug,
          description,
          logoUrl: logoUrl || undefined,
          email,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setError(data.error || 'Failed to register vendor store.');
        setLoading(false);
        return;
      }

      router.push('/vendor/dashboard');
      router.refresh();
    } catch {
      setError('An unexpected error occurred. Please try again.');
      setLoading(false);
    }
  };

  return (
    <div className="max-w-2xl mx-auto py-10 space-y-8">
      <div className="text-center space-y-2">
        <div className="w-14 h-14 rounded-2xl bg-gradient-to-tr from-emerald-600 to-indigo-600 flex items-center justify-center mx-auto shadow-lg shadow-emerald-500/20">
          <Store className="w-7 h-7 text-white" />
        </div>
        <h1 className="text-3xl font-extrabold text-white tracking-tight">Vendor Store Registration</h1>
        <p className="text-xs text-slate-400 max-w-md mx-auto">
          Create your vendor store profile. Once submitted, your application will be reviewed by administrators for marketplace approval.
        </p>
      </div>

      <div className="p-4 rounded-xl bg-indigo-950/40 border border-indigo-800/60 flex items-start gap-3 text-xs text-indigo-300">
        <ShieldCheck className="w-4 h-4 shrink-0 mt-0.5 text-indigo-400" />
        <div>
          <span className="font-semibold text-white">Approval Workflow:</span> Your store will be registered in <span className="font-bold text-amber-300">PENDING</span> status. After marketplace approval, your public storefront and products will immediately become visible to shoppers worldwide.
        </div>
      </div>

      {error && (
        <div className="p-3.5 rounded-xl bg-rose-950/60 border border-rose-800 text-xs text-rose-300">
          {error}
        </div>
      )}

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-slate-900/80 border border-slate-800 space-y-5 shadow-2xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Store Name *</label>
          <div className="relative">
            <Store className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => handleNameChange(e.target.value)}
              placeholder="e.g. Apex Hardware Labs"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Store Slug (URL Identifier) *</label>
          <div className="relative">
            <Link2 className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              pattern="^[a-z0-9-]+$"
              value={slug}
              onChange={(e) => setSlug(e.target.value.toLowerCase())}
              placeholder="e.g. apex-hardware-labs"
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-emerald-400 font-mono placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
          <span className="text-[11px] text-slate-500 block">
            Public storefront URL: <span className="text-slate-400">/vendors/{slug || 'your-slug'}</span>
          </span>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Store Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Tell customers about your brand, specialty, and product quality..."
            className="w-full p-3 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-slate-300">Logo or Banner URL</label>
          <div className="relative">
            <ImageIcon className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://images.unsplash.com/..."
              className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Contact Email *</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                placeholder="store-support@example.com"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-slate-300">Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-slate-500 absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                placeholder="+1 (555) 000-0000"
                className="w-full pl-9 pr-3 py-2 bg-slate-950 border border-slate-800 rounded-xl text-xs text-white placeholder-slate-600 focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <button
          type="submit"
          disabled={loading}
          className="w-full py-3 rounded-xl bg-gradient-to-r from-emerald-600 to-indigo-600 hover:from-emerald-500 hover:to-indigo-500 text-white font-semibold text-xs transition-all shadow-lg shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2 mt-4"
        >
          {loading ? 'Submitting Application...' : 'Register Vendor Store'}
          <ArrowRight className="w-4 h-4" />
        </button>
      </form>
    </div>
  );
}
