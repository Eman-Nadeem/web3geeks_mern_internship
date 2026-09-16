'use client';

import React, { useState, useEffect } from 'react';
import { StatusBadge } from '@/components/StatusBadge';
import { 
  Store, 
  CheckCircle2, 
  XCircle, 
  AlertTriangle, 
  RefreshCw, 
  ExternalLink, 
  Mail, 
  Phone, 
  User, 
  Calendar 
} from 'lucide-react';

interface VendorAdminItem {
  id: string;
  name: string;
  slug: string;
  description: string | null;
  logoUrl: string | null;
  email: string;
  phone: string | null;
  status: 'PENDING' | 'ACTIVE' | 'SUSPENDED' | 'REJECTED';
  createdAt: string;
  owner: {
    id: string;
    name: string;
    email: string;
  };
  _count: {
    products: number;
  };
}

export default function AdminVendorsPage() {
  const [vendors, setVendors] = useState<VendorAdminItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filter, setFilter] = useState<string>('ALL');
  const [processingId, setProcessingId] = useState<string | null>(null);
  const [message, setMessage] = useState<{ type: 'success' | 'error'; text: string } | null>(null);

  const fetchVendors = async () => {
    try {
      const res = await fetch('/api/admin/vendors');
      const data = await res.json();
      if (data.success) {
        setVendors(data.data);
      }
    } catch {
      setMessage({ type: 'error', text: 'Failed to load vendors.' });
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchVendors();
  }, []);

  const handleStatusChange = async (
    vendorId: string,
    vendorName: string,
    newStatus: 'ACTIVE' | 'SUSPENDED' | 'REJECTED'
  ) => {
    setProcessingId(vendorId);
    setMessage(null);

    try {
      const res = await fetch(`/api/admin/vendors/${vendorId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      const data = await res.json();

      if (!res.ok) {
        setMessage({ type: 'error', text: data.error || 'Failed to update status.' });
        setProcessingId(null);
        return;
      }

      // Update in local state immediately
      setVendors((prev) =>
        prev.map((v) => (v.id === vendorId ? { ...v, status: newStatus } : v))
      );

      setMessage({
        type: 'success',
        text: `Vendor "${vendorName}" status changed to ${newStatus}. Public storefront visibility updated immediately.`,
      });
    } catch {
      setMessage({ type: 'error', text: 'An unexpected error occurred.' });
    } finally {
      setProcessingId(null);
    }
  };

  const filteredVendors = vendors.filter((v) => {
    if (filter === 'ALL') return true;
    return v.status === filter;
  });

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
        <div>
          <h2 className="text-2xl font-bold text-(--text-on-dark) tracking-tight">Vendor Approval Queue & Management</h2>
          <p className="text-xs text-(--text-on-dark-muted) mt-1">
            Review onboarding requests, approve authentic merchants, or suspend non-compliant vendors.
          </p>
        </div>

        <button
          onClick={fetchVendors}
          className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-xs font-semibold text-(--text-on-dark) border border-(--border-dark) flex items-center gap-1.5 transition-colors self-start sm:self-auto cursor-pointer"
        >
          <RefreshCw className="w-3.5 h-3.5" />
          Refresh List
        </button>
      </div>

      {message && (
        <div
          className={`p-4 rounded-xl text-xs flex items-center gap-2 ${
            message.type === 'success'
              ? 'bg-emerald-500/10 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400'
              : 'bg-rose-500/10 border border-rose-500/30 text-rose-600 dark:text-rose-400'
          }`}
        >
          {message.type === 'success' ? (
            <CheckCircle2 className="w-4 h-4 text-emerald-500 shrink-0" />
          ) : (
            <AlertTriangle className="w-4 h-4 text-rose-500 shrink-0" />
          )}
          <span>{message.text}</span>
        </div>
      )}

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 border-b border-(--border-dark) pb-3 overflow-x-auto">
        {['ALL', 'PENDING', 'ACTIVE', 'SUSPENDED', 'REJECTED'].map((st) => {
          const count = vendors.filter((v) => (st === 'ALL' ? true : v.status === st)).length;
          return (
            <button
              key={st}
              onClick={() => setFilter(st)}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold uppercase tracking-wider transition-colors flex items-center gap-1.5 cursor-pointer ${
                filter === st
                  ? 'bg-emerald-600 text-white shadow-sm'
                  : 'text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:bg-(--surface-card-subtle)'
              }`}
            >
              <span>{st}</span>
              <span
                className={`px-1.5 py-0.2 rounded-full text-[10px] ${
                  st === 'PENDING' && count > 0
                    ? 'bg-amber-500/20 text-amber-500 font-bold'
                    : 'bg-(--surface-card-subtle) text-(--text-on-dark-muted)'
                }`}
              >
                {count}
              </span>
            </button>
          );
        })}
      </div>

      {loading ? (
        <div className="py-20 text-center text-xs text-(--text-on-dark-muted)">Loading vendor queue...</div>
      ) : filteredVendors.length === 0 ? (
        <div className="py-16 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center space-y-2">
          <Store className="w-10 h-10 text-(--text-on-dark-muted) mx-auto opacity-40" />
          <h3 className="text-sm font-semibold text-(--text-on-dark)">No vendors found for this filter</h3>
          <p className="text-xs text-(--text-on-dark-muted)">Try selecting another filter tab above.</p>
        </div>
      ) : (
        <div className="overflow-hidden rounded-2xl bg-(--surface-card) border border-(--border-dark) shadow-sm">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--surface-card-subtle) text-[11px] text-(--text-on-dark-muted) uppercase tracking-wider border-b border-(--border-dark)">
                <tr>
                  <th className="p-4 font-semibold">Store / Brand</th>
                  <th className="p-4 font-semibold">Owner Contact</th>
                  <th className="p-4 font-semibold">Products</th>
                  <th className="p-4 font-semibold">Registered</th>
                  <th className="p-4 font-semibold">Status</th>
                  <th className="p-4 font-semibold text-right">Approval Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-dark)">
                {filteredVendors.map((vendor) => (
                  <tr key={vendor.id} className="hover:bg-(--surface-card-subtle) transition-colors">
                    <td className="p-4">
                      <div className="flex items-center gap-3">
                        <div className="w-10 h-10 rounded-xl bg-(--surface-card-subtle) border border-(--border-dark) overflow-hidden flex items-center justify-center font-bold text-emerald-500 shrink-0">
                          {vendor.logoUrl ? (
                            <img src={vendor.logoUrl} alt={vendor.name} className="w-full h-full object-cover" />
                          ) : (
                            vendor.name.charAt(0)
                          )}
                        </div>
                        <div>
                          <div className="font-bold text-(--text-on-dark) text-xs">{vendor.name}</div>
                          <span className="text-[11px] font-mono text-emerald-600 dark:text-emerald-400 block">
                            /vendors/{vendor.slug}
                          </span>
                        </div>
                      </div>
                    </td>

                    <td className="p-4 space-y-0.5">
                      <div className="flex items-center gap-1.5 text-(--text-on-dark) font-medium">
                        <User className="w-3.5 h-3.5 text-(--text-on-dark-muted)" />
                        <span>{vendor.owner.name}</span>
                      </div>
                      <div className="flex items-center gap-1.5 text-(--text-on-dark-muted) text-[11px]">
                        <Mail className="w-3.5 h-3.5 text-(--text-on-dark-muted)" />
                        <span>{vendor.email}</span>
                      </div>
                    </td>

                    <td className="p-4 text-(--text-on-dark) font-semibold">
                      {vendor._count.products} products
                    </td>

                    <td className="p-4 text-(--text-on-dark-muted) text-[11px]">
                      {new Date(vendor.createdAt).toLocaleDateString()}
                    </td>

                    <td className="p-4">
                      <StatusBadge status={vendor.status} />
                    </td>

                    <td className="p-4 text-right">
                      <div className="flex items-center justify-end gap-1.5">
                        {/* Approval workflow buttons */}
                        {vendor.status === 'PENDING' && (
                          <>
                            <button
                              onClick={() => handleStatusChange(vendor.id, vendor.name, 'ACTIVE')}
                              disabled={processingId === vendor.id}
                              className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px] flex items-center gap-1 transition-colors disabled:opacity-50 shadow-sm cursor-pointer"
                            >
                              <CheckCircle2 className="w-3.5 h-3.5" />
                              Approve
                            </button>
                            <button
                              onClick={() => handleStatusChange(vendor.id, vendor.name, 'REJECTED')}
                              disabled={processingId === vendor.id}
                              className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                            >
                              <XCircle className="w-3.5 h-3.5" />
                              Reject
                            </button>
                          </>
                        )}

                        {vendor.status === 'ACTIVE' && (
                          <button
                            onClick={() => handleStatusChange(vendor.id, vendor.name, 'SUSPENDED')}
                            disabled={processingId === vendor.id}
                            className="px-3 py-1.5 rounded-lg bg-rose-500/10 hover:bg-rose-500/20 text-rose-600 dark:text-rose-400 border border-rose-500/30 text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            <AlertTriangle className="w-3.5 h-3.5" />
                            Suspend
                          </button>
                        )}

                        {vendor.status === 'SUSPENDED' && (
                          <button
                            onClick={() => handleStatusChange(vendor.id, vendor.name, 'ACTIVE')}
                            disabled={processingId === vendor.id}
                            className="px-3 py-1.5 rounded-lg bg-emerald-600 hover:bg-emerald-500 text-white text-[11px] font-semibold flex items-center gap-1 transition-colors disabled:opacity-50 cursor-pointer shadow-sm"
                          >
                            <CheckCircle2 className="w-3.5 h-3.5" />
                            Reactivate
                          </button>
                        )}

                        {vendor.status === 'REJECTED' && (
                          <button
                            onClick={() => handleStatusChange(vendor.id, vendor.name, 'ACTIVE')}
                            disabled={processingId === vendor.id}
                            className="px-3 py-1.5 rounded-lg bg-(--surface-card-subtle) hover:bg-(--border-dark) text-(--text-on-dark) border border-(--border-dark) text-[11px] font-semibold transition-colors disabled:opacity-50 cursor-pointer"
                          >
                            Re-evaluate (Approve)
                          </button>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
