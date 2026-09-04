'use client';

import React, { useState, useEffect } from 'react';

interface OrgSettingsViewProps {
  currentUser: { _id?: string; id?: string; role: string; orgId?: string } | null;
}

export default function OrgSettingsView({ currentUser }: OrgSettingsViewProps) {
  const [org, setOrg] = useState<any>(null);
  const [name, setName] = useState('');
  const [logoUrl, setLogoUrl] = useState('');
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const orgId = currentUser?.orgId || 'mine';

  useEffect(() => {
    fetchOrg();
  }, [orgId]);

  const fetchOrg = async () => {
    try {
      setLoading(true);
      const targetId = currentUser?.orgId ? currentUser.orgId : 'mine';
      const res = await fetch(`/api/organizations/${targetId}`);
      const data = await res.json();
      if (res.ok && data.organization) {
        setOrg(data.organization);
        setName(data.organization.name || '');
        setLogoUrl(data.organization.logoUrl || '');
      } else {
        setMessage({ type: 'error', text: data.message || 'Failed to load organization settings' });
      }
    } catch (err) {
      console.error('Failed to fetch organization settings:', err);
      setMessage({ type: 'error', text: 'Error connecting to server' });
    } finally {
      setLoading(false);
    }
  };

  const handleSave = async (e: React.FormEvent) => {
    e.preventDefault();
    setMessage(null);
    setSaving(true);

    try {
      const targetId = org?._id || currentUser?.orgId || 'mine';
      const res = await fetch(`/api/organizations/${targetId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ name, logoUrl }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to update organization');
      }

      setOrg(data.organization);
      setMessage({ type: 'success', text: 'Organization settings updated successfully!' });
    } catch (err: any) {
      setMessage({ type: 'error', text: err.message || 'Failed to save changes' });
    } finally {
      setSaving(false);
    }
  };

  if (loading) {
    return (
      <div className="p-8 text-center text-slate-500 text-sm font-medium">
        Loading organization settings...
      </div>
    );
  }

  if (!org) {
    return (
      <div className="p-8 space-y-4 max-w-4xl mx-auto text-center">
        <div className="p-6 bg-rose-50 border border-rose-200 rounded-2xl text-rose-700 text-sm font-semibold">
          Organization information unavailable or you do not have permission to view this organization.
        </div>
        <button
          onClick={fetchOrg}
          className="px-4 py-2 bg-[#FF6B2C] text-white text-xs font-bold rounded-xl shadow-md hover:bg-[#E0561B] transition-colors"
        >
          Retry Loading
        </button>
      </div>
    );
  }

  return (
    <div className="p-8 space-y-6 max-w-4xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Settings</h2>
        <p className="text-sm text-slate-500 mt-1">
          Manage tenant workspace branding, profile, and subscription plan details.
        </p>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-sm font-semibold border ${
            message.type === 'success'
              ? 'bg-emerald-50 border-emerald-200 text-emerald-800'
              : 'bg-rose-50 border-rose-200 text-rose-800'
          }`}
        >
          {message.text}
        </div>
      )}

      <form onSubmit={handleSave} className="bg-white border border-slate-200/90 rounded-2xl p-6 shadow-sm space-y-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Organization Name
            </label>
            <input
              type="text"
              required
              value={name}
              onChange={(e) => setName(e.target.value)}
              className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#FF6B2C] focus:bg-white"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
              Organization Slug (Identifier)
            </label>
            <input
              type="text"
              disabled
              value={org.slug || ''}
              className="w-full px-3.5 py-2.5 bg-slate-100 border border-slate-200 rounded-xl text-slate-500 text-sm cursor-not-allowed font-mono"
            />
          </div>
        </div>

        <div>
          <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-2">
            Logo URL
          </label>
          <input
            type="url"
            placeholder="https://example.com/logo.png"
            value={logoUrl}
            onChange={(e) => setLogoUrl(e.target.value)}
            className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#FF6B2C] focus:bg-white"
          />
        </div>

        <div className="border-t border-slate-100 pt-6 grid grid-cols-1 md:grid-cols-2 gap-6">
          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Subscription Plan
            </span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-[#FF6B2C]/10 border border-[#FF6B2C]/30 text-[#FF6B2C] font-bold text-xs rounded-xl">
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 3v4M3 5h4M6 17v4m-2-2h4m5-16l2.286 6.857L21 12l-5.714 2.143L13 21l-2.286-6.857L5 12l5.714-2.143L13 3z" />
              </svg>
              <span>{org.plan || 'FREE'} PLAN</span>
            </div>
          </div>

          <div>
            <span className="block text-xs font-semibold text-slate-500 uppercase tracking-wider mb-1.5">
              Tenant Status
            </span>
            <div className="inline-flex items-center gap-2 px-3 py-1.5 bg-emerald-50 border border-emerald-200 text-emerald-700 font-bold text-xs rounded-xl">
              <span className="w-2 h-2 rounded-full bg-emerald-500 animate-pulse"></span>
              <span>{org.status || 'ACTIVE'}</span>
            </div>
          </div>
        </div>

        <div className="flex justify-end pt-4">
          <button
            type="submit"
            disabled={saving}
            className="px-6 py-2.5 bg-gradient-to-r from-[#FF6B2C] to-[#FF8F5C] hover:opacity-90 font-semibold text-white text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#FF6B2C]/25 transition-all disabled:opacity-50 cursor-pointer"
          >
            {saving ? 'Saving Changes...' : 'Save Organization Settings'}
          </button>
        </div>
      </form>
    </div>
  );
}
