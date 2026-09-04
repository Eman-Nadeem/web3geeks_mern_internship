'use client';

import React, { useState } from 'react';

export interface OrganizationItem {
  _id: string;
  name: string;
  slug: string;
  plan: 'FREE' | 'PRO' | 'ENTERPRISE';
  status: 'ACTIVE' | 'SUSPENDED';
  ownerId?: { fullName?: string; email?: string } | string;
  createdAt: string;
}

export interface OrganizationsViewProps {
  organizations: OrganizationItem[];
  users?: Array<{ _id: string; fullName: string; email?: string; role?: string }>;
  onRefresh: () => void;
  onSelectOrgDetail?: (org: OrganizationItem) => void;
}

export default function OrganizationsView({
  organizations,
  users = [],
  onRefresh,
  onSelectOrgDetail,
}: OrganizationsViewProps) {
  const [isModalOpen, setIsModalOpen] = useState(false);
  const [editingOrg, setEditingOrg] = useState<OrganizationItem | null>(null);

  // Form State
  const [name, setName] = useState('');
  const [slug, setSlug] = useState('');
  const [plan, setPlan] = useState<'FREE' | 'PRO' | 'ENTERPRISE'>('FREE');
  const [status, setStatus] = useState<'ACTIVE' | 'SUSPENDED'>('ACTIVE');
  const [ownerId, setOwnerId] = useState('');
  const [ownerOption, setOwnerOption] = useState<'select' | 'create'>('select');
  const [newOwnerName, setNewOwnerName] = useState('');
  const [newOwnerEmail, setNewOwnerEmail] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  const activeCount = organizations.filter((o) => o.status === 'ACTIVE').length;
  const suspendedCount = organizations.filter((o) => o.status === 'SUSPENDED').length;
  const enterpriseCount = organizations.filter((o) => o.plan === 'ENTERPRISE').length;

  const orgAdminUsers = users.filter((u) => u.role === 'OrgAdmin');
  const eligibleOwners = orgAdminUsers.length > 0 ? orgAdminUsers : users;

  const handleNameChange = (val: string) => {
    setName(val);
    if (!editingOrg) {
      const autoSlug = val
        .toLowerCase()
        .trim()
        .replace(/[^a-z0-9\s-]/g, '')
        .replace(/\s+/g, '-');
      setSlug(autoSlug);
    }
  };

  const handleOpenCreateModal = () => {
    setEditingOrg(null);
    setName('');
    setSlug('');
    setPlan('FREE');
    setStatus('ACTIVE');
    setOwnerId('');
    setOwnerOption('select');
    setNewOwnerName('');
    setNewOwnerEmail('');
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleOpenEditModal = (org: OrganizationItem) => {
    setEditingOrg(org);
    setName(org.name);
    setSlug(org.slug);
    setPlan(org.plan);
    setStatus(org.status);
    const existingOwner = typeof org.ownerId === 'object' ? (org.ownerId as any)?._id || '' : org.ownerId || '';
    setOwnerId(existingOwner);
    setErrorMsg('');
    setIsModalOpen(true);
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');

    try {
      const payload: Record<string, any> = { name, plan, status };

      if (editingOrg) {
        payload.ownerId = ownerId || null;
        const res = await fetch(`/api/organizations/${editingOrg._id}`, {
          method: 'PATCH',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to update organization');
        }
      } else {
        payload.slug = slug;
        if (ownerOption === 'create' && newOwnerEmail && newOwnerName) {
          payload.newOwnerName = newOwnerName;
          payload.newOwnerEmail = newOwnerEmail;
        } else {
          payload.ownerId = ownerId || null;
        }

        const res = await fetch('/api/organizations', {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify(payload),
        });

        if (!res.ok) {
          const data = await res.json();
          throw new Error(data.message || 'Failed to create organization');
        }
      }

      setIsModalOpen(false);
      onRefresh();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleDelete = async (orgId: string) => {
    if (!confirm('Are you sure you want to delete this organization tenant? This cannot be undone.')) {
      return;
    }

    try {
      const res = await fetch(`/api/organizations/${orgId}`, { method: 'DELETE' });
      if (res.ok) {
        onRefresh();
      }
    } catch (err) {
      console.error('Failed to delete organization:', err);
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Top Header Section */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Tenants</h2>
          <p className="text-sm text-slate-500 mt-1">
            Platform SuperAdmin tenant lifecycle management and plan controls.
          </p>
        </div>
        <button
          onClick={handleOpenCreateModal}
          className="px-4 py-2.5 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs shadow-md shadow-[#FF6B2C]/20 transition-all flex items-center gap-2"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
          </svg>
          <span>Create Tenant</span>
        </button>
      </div>

      {/* Analytics Metric Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-semibold text-slate-400 uppercase tracking-wider">Total Tenants</p>
          <p className="text-2xl font-extrabold text-slate-900 mt-1">{organizations.length}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-semibold text-emerald-600 uppercase tracking-wider">Active Tenants</p>
          <p className="text-2xl font-extrabold text-emerald-600 mt-1">{activeCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-semibold text-rose-500 uppercase tracking-wider">Suspended Tenants</p>
          <p className="text-2xl font-extrabold text-rose-500 mt-1">{suspendedCount}</p>
        </div>

        <div className="bg-white p-5 rounded-2xl border border-slate-200/90 shadow-xs">
          <p className="text-xs font-semibold text-amber-500 uppercase tracking-wider">Enterprise Tier</p>
          <p className="text-2xl font-extrabold text-amber-600 mt-1">{enterpriseCount}</p>
        </div>
      </div>

      {/* Organizations Roster Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Tenant Organizations</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {organizations.length} Total
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Organization</th>
                <th className="py-3.5 px-6">Slug</th>
                <th className="py-3.5 px-6">Plan</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Owner</th>
                <th className="py-3.5 px-6">Created</th>
                <th className="py-3.5 px-6 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {organizations.length === 0 ? (
                <tr>
                  <td colSpan={7} className="py-8 text-center text-slate-400">
                    No organizations found.
                  </td>
                </tr>
              ) : (
                organizations.map((org) => (
                  <tr key={org._id} className="hover:bg-slate-50/60 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900">
                      <button
                        onClick={() => onSelectOrgDetail && onSelectOrgDetail(org)}
                        className="hover:text-[#FF6B2C] hover:underline text-left font-extrabold text-sm"
                      >
                        {org.name}
                      </button>
                    </td>
                    <td className="py-4 px-6 font-mono text-slate-500">{org.slug}</td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          org.plan === 'ENTERPRISE'
                            ? 'bg-purple-100 text-purple-700 border border-purple-200'
                            : org.plan === 'PRO'
                            ? 'bg-amber-100 text-amber-700 border border-amber-200'
                            : 'bg-slate-100 text-slate-600 border border-slate-200'
                        }`}
                      >
                        {org.plan}
                      </span>
                    </td>
                    <td className="py-4 px-6">
                      <span
                        className={`px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          org.status === 'ACTIVE'
                            ? 'bg-emerald-100 text-emerald-700 border border-emerald-200'
                            : 'bg-rose-100 text-rose-700 border border-rose-200'
                        }`}
                      >
                        {org.status}
                      </span>
                    </td>
                    <td className="py-4 px-6 text-slate-600">
                      {typeof org.ownerId === 'object' && org.ownerId?.fullName ? (
                        <div>
                          <p className="font-semibold text-slate-900">{org.ownerId.fullName}</p>
                          <p className="text-[10px] text-slate-400">{org.ownerId.email}</p>
                        </div>
                      ) : (
                        <span className="italic text-slate-400">No owner assigned</span>
                      )}
                    </td>
                    <td className="py-4 px-6 text-slate-500">
                      {new Date(org.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-4 px-6 text-right whitespace-nowrap">
                      <div className="flex items-center justify-end gap-2">
                        {onSelectOrgDetail && (
                          <button
                            type="button"
                            onClick={() => onSelectOrgDetail(org)}
                            title="View Full Organization Details"
                            className="px-2.5 py-1.5 rounded-xl bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors"
                          >
                            Details →
                          </button>
                        )}
                        <button
                          type="button"
                          onClick={() => handleOpenEditModal(org)}
                          title="Edit Organization"
                          className="p-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z"
                            />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => handleDelete(org._id)}
                          title="Delete Organization"
                          className="p-2 rounded-xl bg-rose-50 hover:bg-rose-100 text-rose-600 transition-colors"
                        >
                          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path
                              strokeLinecap="round"
                              strokeLinejoin="round"
                              strokeWidth={2}
                              d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16"
                            />
                          </svg>
                        </button>
                      </div>
                    </td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Modal for Create/Edit Organization */}
      {isModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
          <div className="bg-white rounded-2xl max-w-md w-full p-6 shadow-2xl space-y-4 border border-slate-200 animate-in fade-in zoom-in-95 duration-150">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-extrabold text-slate-900 text-lg">
                {editingOrg ? 'Edit Organization' : 'Create New Tenant Organization'}
              </h3>
              <button
                onClick={() => setIsModalOpen(false)}
                className="text-slate-400 hover:text-slate-600 p-1 rounded-lg"
              >
                <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                </svg>
              </button>
            </div>

            {errorMsg && (
              <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
                {errorMsg}
              </div>
            )}

            <form onSubmit={handleSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                  Organization Name
                </label>
                <input
                  type="text"
                  required
                  value={name}
                  onChange={(e) => handleNameChange(e.target.value)}
                  placeholder="e.g. Acme Corp"
                  className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all shadow-xs"
                />
              </div>

              {!editingOrg && (
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Slug Identifier
                  </label>
                  <input
                    type="text"
                    required
                    value={slug}
                    onChange={(e) => setSlug(e.target.value.toLowerCase().replace(/\s+/g, '-'))}
                    placeholder="e.g. acme-corp"
                    className="w-full bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 text-xs font-mono text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all shadow-xs"
                  />
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Subscription Plan
                  </label>
                  <div className="relative">
                    <select
                      value={plan}
                      onChange={(e) => setPlan(e.target.value as any)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all shadow-xs cursor-pointer"
                    >
                      <option value="FREE">Free</option>
                      <option value="PRO">Pro</option>
                      <option value="ENTERPRISE">Enterprise</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
                    Status
                  </label>
                  <div className="relative">
                    <select
                      value={status}
                      onChange={(e) => setStatus(e.target.value as any)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all shadow-xs cursor-pointer"
                    >
                      <option value="ACTIVE">Active</option>
                      <option value="SUSPENDED">Suspended</option>
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                </div>
              </div>

              <div className="space-y-2">
                <div className="flex items-center justify-between">
                  <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider">
                    Organization Owner (OrgAdmin)
                  </label>
                  {!editingOrg && (
                    <div className="flex items-center gap-1 bg-slate-100 p-0.5 rounded-lg text-[11px] font-semibold">
                      <button
                        type="button"
                        onClick={() => setOwnerOption('select')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          ownerOption === 'select'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        Select Existing
                      </button>
                      <button
                        type="button"
                        onClick={() => setOwnerOption('create')}
                        className={`px-2.5 py-1 rounded-md transition-all ${
                          ownerOption === 'create'
                            ? 'bg-white text-slate-900 shadow-xs font-bold'
                            : 'text-slate-500 hover:text-slate-800'
                        }`}
                      >
                        + Create New
                      </button>
                    </div>
                  )}
                </div>

                {!editingOrg && ownerOption === 'create' ? (
                  <div className="grid grid-cols-2 gap-3 p-3 bg-slate-50 rounded-xl border border-slate-200/90">
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Owner Full Name *
                      </label>
                      <input
                        type="text"
                        required={ownerOption === 'create'}
                        value={newOwnerName}
                        onChange={(e) => setNewOwnerName(e.target.value)}
                        placeholder="e.g. Sarah Connor"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
                      />
                    </div>
                    <div>
                      <label className="block text-[10px] font-bold text-slate-500 uppercase mb-1">
                        Owner Email *
                      </label>
                      <input
                        type="email"
                        required={ownerOption === 'create'}
                        value={newOwnerEmail}
                        onChange={(e) => setNewOwnerEmail(e.target.value)}
                        placeholder="sarah@acme.com"
                        className="w-full bg-white border border-slate-200 rounded-lg px-3 py-1.5 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
                      />
                    </div>
                  </div>
                ) : (
                  <div className="relative">
                    <select
                      value={ownerId}
                      onChange={(e) => setOwnerId(e.target.value)}
                      className="w-full appearance-none bg-slate-50 border border-slate-200/90 rounded-xl px-4 py-2.5 pr-10 text-sm text-slate-800 font-medium focus:outline-none focus:ring-2 focus:ring-[#FF6B2C] focus:bg-white transition-all shadow-xs cursor-pointer"
                    >
                      <option value="">-- No Owner Assigned --</option>
                      {eligibleOwners.map((u) => (
                        <option key={u._id} value={u._id}>
                          {u.fullName} {u.email ? `(${u.email})` : ''}
                        </option>
                      ))}
                    </select>
                    <div className="pointer-events-none absolute inset-y-0 right-0 flex items-center px-3 text-slate-400">
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                      </svg>
                    </div>
                  </div>
                )}
              </div>

              <div className="pt-3 flex items-center justify-end gap-3 border-t border-slate-100">
                <button
                  type="button"
                  onClick={() => setIsModalOpen(false)}
                  className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="px-5 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white text-xs font-bold shadow-md shadow-[#FF6B2C]/20 disabled:opacity-50"
                >
                  {isSubmitting ? 'Saving...' : editingOrg ? 'Update Tenant' : 'Create Tenant'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
