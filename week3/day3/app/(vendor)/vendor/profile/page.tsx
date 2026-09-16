'use client';

import React, { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { StatusBadge } from '@/components/StatusBadge';
import { Store, Mail, Phone, Image as ImageIcon, Save, ShieldCheck, AlertCircle } from 'lucide-react';

interface VendorData {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
}

export default function VendorProfilePage() {
  const router = useRouter();
  const [vendor, setVendor] = useState<VendorData | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [email, setEmail] = useState('');
  const [phone, setPhone] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  useEffect(() => {
    fetch('/api/auth/me')
      .then((res) => res.json())
      .then((data) => {
        if (data.success && data.data?.vendor) {
          const v = data.data.vendor;
          setVendor(v);
          setName(v.name || '');
          setDescription(v.description || '');
          setLogoUrl(v.logoUrl || '');
          setEmail(v.email || '');
          setPhone(v.phone || '');
        }
      })
      .finally(() => setLoading(false));
  }, []);

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!vendor) return;

    setSaving(true);
    setMessage(null);

    try {
      const res = await fetch(`/api/vendors/${vendor.id}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          name,
          description,
          logoUrl: logoUrl || undefined,
          email,
          phone: phone || undefined,
        }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update profile.' });
        setSaving(false);
        return;
      }

      setMessage({ type: 'success', text: 'Store profile successfully updated!' });
      setSaving(false);
      router.refresh();
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
      setSaving(false);
    }
  };

  if (loading) {
    return <div className="py-20 text-center text-xs text-slate-500">Loading store profile...</div>;
  }

  if (!vendor) {
    return <div className="py-20 text-center text-xs text-slate-500">Vendor profile not found.</div>;
  }

  return (
    <div className="max-w-3xl mx-auto space-y-6">
      <div>
        <h2 className="text-2xl font-bold text-(--text-on-dark) tracking-tight">Store Profile & Settings</h2>
        <p className="text-xs text-(--text-on-dark-muted) mt-1">
          Manage your public brand identity, store details, and customer contact endpoints.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <ShieldCheck className="w-4 h-4 text-emerald-400" />
          ) : (
            <AlertCircle className="w-4 h-4 text-rose-400" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Read-Only Status & Slug Section (Phase 3 requirement) */}
      <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) grid grid-cols-1 sm:grid-cols-2 gap-4">
        <div>
          <span className="text-[11px] font-semibold text-(--text-on-dark-muted) uppercase tracking-wider block mb-1.5">
            Account Governance Status (Read-Only)
          </span>
          <div className="flex items-center gap-2">
            <StatusBadge status={vendor.status} />
            <span className="text-xs text-(--text-on-dark-muted)">Status transitions are administered by marketplace oversight.</span>
          </div>
        </div>

        <div>
          <span className="text-[11px] font-semibold text-(--text-on-dark-muted) uppercase tracking-wider block mb-1.5">
            Store Slug Identifier
          </span>
          <span className="text-xs font-mono text-emerald-400 bg-(--surface-card-subtle) px-2.5 py-1 rounded-lg border border-(--border-dark) inline-block">
            /vendors/{vendor.slug}
          </span>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="p-8 rounded-3xl bg-(--surface-card) border border-(--border-dark) space-y-5 shadow-xl">
        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-on-dark-muted)">Store Name</label>
          <div className="relative">
            <Store className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-on-dark-muted)">Store Description</label>
          <textarea
            rows={3}
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            className="w-full p-3 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
          />
        </div>

        <div className="space-y-1.5">
          <label className="text-xs font-semibold text-(--text-on-dark-muted)">Logo or Banner URL</label>
          <div className="relative">
            <ImageIcon className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
            <input
              type="url"
              value={logoUrl}
              onChange={(e) => setLogoUrl(e.target.value)}
              placeholder="https://..."
              className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
            />
          </div>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-on-dark-muted)">Contact Email</label>
            <div className="relative">
              <Mail className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="email"
                required
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>

          <div className="space-y-1.5">
            <label className="text-xs font-semibold text-(--text-on-dark-muted)">Contact Phone</label>
            <div className="relative">
              <Phone className="w-4 h-4 text-(--text-on-dark-muted) absolute left-3 top-1/2 -translate-y-1/2" />
              <input
                type="tel"
                value={phone}
                onChange={(e) => setPhone(e.target.value)}
                className="w-full pl-9 pr-3 py-2 bg-(--surface-card-subtle) border border-(--border-dark) rounded-xl text-xs text-(--text-on-dark) placeholder-(--text-on-dark-muted) focus:outline-none focus:border-emerald-500"
              />
            </div>
          </div>
        </div>

        <div className="pt-2">
          <button
            type="submit"
            disabled={saving}
            className="w-full sm:w-auto px-6 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-xs transition-colors shadow-md shadow-emerald-600/20 disabled:opacity-50 flex items-center justify-center gap-2"
          >
            <Save className="w-4 h-4" />
            {saving ? 'Saving changes...' : 'Save Profile Changes'}
          </button>
        </div>
      </form>
    </div>
  );
}
