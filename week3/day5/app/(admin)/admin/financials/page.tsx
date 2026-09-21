'use client';

import React, { useState, useEffect } from 'react';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  RefreshCw,
  Sliders,
  ShieldCheck,
  Send,
  X,
  CreditCard,
  Building,
  Check,
  Ban,
  ArrowRight,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';
import { ConfirmationModal } from '@/components/ConfirmationModal';

export default function AdminFinancialsPage() {
  const [financials, setFinancials] = useState<any>(null);
  const [commissionSettings, setCommissionSettings] = useState<any>(null);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [commissions, setCommissions] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // New Commission Rate Form
  const [newRatePercent, setNewRatePercent] = useState<string>('10');
  const [updatingRate, setUpdatingRate] = useState(false);
  const [rateSuccessMsg, setRateSuccessMsg] = useState<string | null>(null);

  // Mark Paid Modal
  const [selectedSettlement, setSelectedSettlement] = useState<any>(null);
  const [paymentRefInput, setPaymentRefInput] = useState<string>('');
  const [processingPayout, setProcessingPayout] = useState(false);
  const [settlementToReject, setSettlementToReject] = useState<any>(null);

  const fetchAdminData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [finRes, commSetRes, settRes, commRes] = await Promise.all([
        fetch('/api/admin/financials'),
        fetch('/api/admin/settings/commission'),
        fetch('/api/admin/settlements?limit=50'),
        fetch('/api/admin/commissions?limit=50'),
      ]);

      const [finData, commSetData, settData, commData] = await Promise.all([
        finRes.json(),
        commSetRes.json(),
        settRes.json(),
        commRes.json(),
      ]);

      if (finData.success) setFinancials(finData.data);
      if (commSetData.success) {
        setCommissionSettings(commSetData.data);
        setNewRatePercent((commSetData.data.currentRate * 100).toString());
      }
      if (settData.success) setSettlements(settData.data.settlements);
      if (commData.success) setCommissions(commData.data.records);
    } catch (err: any) {
      setError(err.message || 'Failed to load administrator financials.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchAdminData();
  }, []);

  const handleUpdateCommissionRate = async (e: React.FormEvent) => {
    e.preventDefault();
    try {
      setUpdatingRate(true);
      setRateSuccessMsg(null);

      const rateDecimal = parseFloat(newRatePercent) / 100;
      if (isNaN(rateDecimal) || rateDecimal < 0 || rateDecimal > 1) {
        alert('Rate must be between 0% and 100%');
        return;
      }

      const res = await fetch('/api/admin/settings/commission', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ rate: rateDecimal }),
      });

      const json = await res.json();
      if (json.success) {
        setRateSuccessMsg(json.data.message);
        fetchAdminData();
      } else {
        alert(json.error || 'Failed to update commission rate.');
      }
    } catch (err: any) {
      alert(err.message || 'Error updating rate.');
    } finally {
      setUpdatingRate(false);
    }
  };

  const handleSettlementStatusChange = async (
    settlementId: string,
    status: 'PROCESSING' | 'PAID' | 'REJECTED',
    paymentReference?: string
  ) => {
    try {
      setProcessingPayout(true);
      const res = await fetch(`/api/admin/settlements/${settlementId}/status`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          status,
          ...(paymentReference ? { paymentReference } : {}),
        }),
      });

      const json = await res.json();
      if (json.success) {
        setSelectedSettlement(null);
        setSettlementToReject(null);
        setPaymentRefInput('');
        fetchAdminData();
      } else {
        alert(json.error || 'Failed to transition settlement status.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error.');
    } finally {
      setProcessingPayout(false);
    }
  };

  if (loading && !financials) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading platform financial ledger & aggregates...</span>
        </div>
      </div>
    );
  }

  return (
    <div className="min-h-screen bg-(--bg-canvas) text-(--text-on-dark) py-8 px-4 sm:px-6 lg:px-8">
      <div className="max-w-7xl mx-auto space-y-8">
        {/* Header */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 border-b border-(--border-dark) pb-6">
          <div>
            <div className="flex items-center gap-2 text-xs font-semibold text-emerald-500 uppercase tracking-wider mb-1">
              <ShieldCheck className="w-4 h-4" />
              <span>Marketplace Financial Control</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Platform Financials & Settlements
            </h1>
            <p className="text-xs text-(--text-on-dark-muted) mt-1">
              Real-time reconciliation, append-only commission governance, and vendor payout queue.
            </p>
          </div>

          <button
            onClick={fetchAdminData}
            className="self-start sm:self-auto p-2.5 rounded-xl border border-(--border-dark) bg-(--surface-card) hover:bg-(--surface-card-hover) text-(--text-on-dark-muted) transition-colors"
            title="Refresh Financials"
          >
            <RefreshCw className="w-4 h-4" />
          </button>
        </div>

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 6-Figure Platform Metrics */}
        {financials && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-6 gap-4">
            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-(--text-on-dark-muted)">Marketplace Sales</div>
              <div className="text-xl font-black">
                Rs. {financials.totalMarketplaceSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-purple-400">Platform Revenue</div>
              <div className="text-xl font-black text-purple-400">
                Rs. {financials.totalPlatformCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-sky-400">Vendor Earnings</div>
              <div className="text-xl font-black text-sky-400">
                Rs. {financials.totalVendorEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-amber-400">Pending Payouts</div>
              <div className="text-xl font-black text-amber-400">
                Rs. {financials.pendingSettlements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-emerald-400">Completed Payouts</div>
              <div className="text-xl font-black text-emerald-400">
                Rs. {financials.completedSettlements.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="text-xs text-rose-400">Refund Amount</div>
              <div className="text-xl font-black text-rose-400">
                Rs. {financials.refundAmount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>
          </div>
        )}

        {/* Section: Commission Settings & Rate History */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Commission Control Card */}
          <div className="lg:col-span-1 p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold flex items-center gap-2">
                <Sliders className="w-5 h-5 text-emerald-400" />
                <span>Commission Settings</span>
              </h2>
              {commissionSettings && (
                <span className="px-2.5 py-1 rounded-full text-xs font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/30">
                  Current: {commissionSettings.currentRatePercentage}
                </span>
              )}
            </div>

            {rateSuccessMsg && (
              <div className="p-3 rounded-lg bg-emerald-500/10 text-emerald-400 text-xs">
                {rateSuccessMsg}
              </div>
            )}

            <form onSubmit={handleUpdateCommissionRate} className="space-y-4">
              <div>
                <label className="block text-xs text-(--text-on-dark-muted) mb-1">
                  New Commission Rate (%)
                </label>
                <div className="relative">
                  <input
                    type="number"
                    step="0.1"
                    min="0"
                    max="100"
                    value={newRatePercent}
                    onChange={(e) => setNewRatePercent(e.target.value)}
                    className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-canvas) border border-(--border-dark) text-sm focus:outline-none focus:border-emerald-500"
                    placeholder="e.g. 10"
                    required
                  />
                  <Percent className="w-4 h-4 text-(--text-on-dark-muted) absolute right-3.5 top-1/2 -translate-y-1/2 pointer-events-none" />
                </div>
              </div>

              <button
                type="submit"
                disabled={updatingRate}
                className="w-full py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center justify-center gap-2 shadow-sm transition-all"
              >
                {updatingRate && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Append New Commission Rate</span>
              </button>
            </form>

            {/* Audit History of Past Rates */}
            <div className="border-t border-(--border-dark) pt-4 space-y-3">
              <h3 className="text-xs font-bold uppercase tracking-wider text-(--text-on-dark-muted)">
                Append-Only Rate History
              </h3>
              <div className="space-y-2 max-h-48 overflow-y-auto">
                {commissionSettings?.history?.map((h: any) => (
                  <div
                    key={h.id}
                    className="p-2.5 rounded-lg bg-(--bg-canvas) border border-(--border-dark) flex items-center justify-between text-xs"
                  >
                    <div>
                      <span className="font-bold text-emerald-400">{(h.rate * 100).toFixed(1)}%</span>
                      <span className="text-[10px] text-(--text-on-dark-muted) ml-2">
                        by {h.createdByUser?.name || 'Admin'}
                      </span>
                    </div>
                    <span className="text-[10px] text-(--text-on-dark-muted)">
                      {new Date(h.effectiveFrom).toLocaleDateString()}
                    </span>
                  </div>
                ))}
              </div>
            </div>
          </div>

          {/* Settlement Approval Queue */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Settlement Processing Queue</h2>
              <span className="text-xs text-(--text-on-dark-muted)">
                {settlements.length} total payout requests
              </span>
            </div>

            <div className="overflow-x-auto rounded-2xl border border-(--border-dark) bg-(--surface-card)">
              <table className="w-full text-left text-xs">
                <thead className="bg-(--bg-canvas) text-(--text-on-dark-muted) uppercase tracking-wider font-semibold border-b border-(--border-dark)">
                  <tr>
                    <th className="py-3 px-4">Settlement #</th>
                    <th className="py-3 px-4">Vendor</th>
                    <th className="py-3 px-4">Amount</th>
                    <th className="py-3 px-4">Status</th>
                    <th className="py-3 px-4 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-dark)">
                  {settlements.length === 0 ? (
                    <tr>
                      <td colSpan={5} className="py-8 text-center text-(--text-on-dark-muted)">
                        No settlements in queue.
                      </td>
                    </tr>
                  ) : (
                    settlements.map((s) => (
                      <tr key={s.id} className="hover:bg-(--surface-card-hover) transition-colors">
                        <td className="py-3 px-4 font-mono font-semibold">{s.settlementNumber}</td>
                        <td className="py-3 px-4 font-medium">{s.vendor?.name}</td>
                        <td className="py-3 px-4 font-bold text-emerald-400">
                          Rs. {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                        </td>
                        <td className="py-3 px-4">
                          <StatusBadge status={s.status} />
                        </td>
                        <td className="py-3 px-4 text-right space-x-2">
                          {s.status === 'PENDING' && (
                            <>
                              <button
                                onClick={() => handleSettlementStatusChange(s.id, 'PROCESSING')}
                                className="px-2.5 py-1 rounded bg-sky-600 hover:bg-sky-500 text-white font-semibold text-[11px]"
                              >
                                Process
                              </button>
                              <button
                                onClick={() => setSettlementToReject(s)}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {s.status === 'PROCESSING' && (
                            <>
                              <button
                                onClick={() => setSelectedSettlement(s)}
                                className="px-2.5 py-1 rounded bg-emerald-600 hover:bg-emerald-500 text-white font-semibold text-[11px]"
                              >
                                Mark Paid
                              </button>
                              <button
                                onClick={() => setSettlementToReject(s)}
                                className="px-2.5 py-1 rounded bg-rose-600 hover:bg-rose-500 text-white font-semibold text-[11px]"
                              >
                                Reject
                              </button>
                            </>
                          )}
                          {s.status === 'PAID' && s.paymentReference && (
                            <span className="font-mono text-[10px] text-(--text-on-dark-muted)">
                              Ref: {s.paymentReference}
                            </span>
                          )}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>
        </div>
      </div>

      {/* Mark Paid Confirmation Modal */}
      {selectedSettlement && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Confirm Settlement Payout</h3>
              <button
                onClick={() => setSelectedSettlement(null)}
                className="text-(--text-on-dark-muted) hover:text-(--text-on-dark)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-(--bg-canvas) border border-(--border-dark) space-y-2">
              <div className="text-xs text-(--text-on-dark-muted)">
                Vendor: <strong className="text-(--text-on-dark)">{selectedSettlement.vendor?.name}</strong>
              </div>
              <div className="text-xs text-(--text-on-dark-muted)">
                Settlement ID: <span className="font-mono">{selectedSettlement.settlementNumber}</span>
              </div>
              <div className="text-2xl font-black text-emerald-400">
                Rs. {selectedSettlement.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
            </div>

            <div>
              <label className="block text-xs text-(--text-on-dark-muted) mb-1 font-semibold">
                Bank / Payout Transaction Reference *
              </label>
              <input
                type="text"
                value={paymentRefInput}
                onChange={(e) => setPaymentRefInput(e.target.value)}
                placeholder="e.g. BANK-TX-984920489"
                className="w-full px-3.5 py-2.5 rounded-xl bg-(--bg-canvas) border border-(--border-dark) text-sm focus:outline-none focus:border-emerald-500 font-mono"
                required
              />
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSelectedSettlement(null)}
                className="px-4 py-2 rounded-xl border border-(--border-dark) text-xs font-semibold hover:bg-(--surface-card-hover)"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={processingPayout || !paymentRefInput.trim()}
                onClick={() =>
                  handleSettlementStatusChange(selectedSettlement.id, 'PAID', paymentRefInput.trim())
                }
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                {processingPayout && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Confirm Paid</span>
              </button>
            </div>
          </div>
        </div>
      )}
      {/* Reject Settlement Confirmation Modal */}
      <ConfirmationModal
        isOpen={Boolean(settlementToReject)}
        title="Reject Settlement Request"
        message={`Are you sure you want to reject settlement ${settlementToReject?.settlementNumber} for Rs. ${settlementToReject?.amount?.toLocaleString('en-US', { minimumFractionDigits: 2 })}? The locked commission records will be unlocked and returned to the merchant's available balance.`}
        confirmLabel="Reject Settlement"
        variant="danger"
        isLoading={processingPayout}
        onConfirm={() => {
          if (settlementToReject) {
            handleSettlementStatusChange(settlementToReject.id, 'REJECTED');
          }
        }}
        onCancel={() => setSettlementToReject(null)}
      />
    </div>
  );
}
