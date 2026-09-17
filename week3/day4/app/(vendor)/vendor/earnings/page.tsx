'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import {
  DollarSign,
  TrendingUp,
  Percent,
  Clock,
  CheckCircle2,
  AlertCircle,
  ArrowUpRight,
  ArrowDownLeft,
  Calendar,
  Filter,
  RefreshCw,
  CreditCard,
  Building,
  ShieldCheck,
  ChevronRight,
  Send,
  X,
} from 'lucide-react';
import { StatusBadge } from '@/components/StatusBadge';

export default function VendorEarningsPage() {
  const [summary, setSummary] = useState<any>(null);
  const [transactions, setTransactions] = useState<any[]>([]);
  const [settlements, setSettlements] = useState<any[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Settlement request modal state
  const [settlementModalOpen, setSettlementModalOpen] = useState(false);
  const [requestingSettlement, setRequestingSettlement] = useState(false);
  const [settlementSuccessMsg, setSettlementSuccessMsg] = useState<string | null>(null);

  // Transaction filters
  const [filterType, setFilterType] = useState<string>('');
  const [filterDirection, setFilterDirection] = useState<string>('');
  const [startDate, setStartDate] = useState<string>('');
  const [endDate, setEndDate] = useState<string>('');

  const fetchData = async () => {
    try {
      setLoading(true);
      setError(null);

      const [earningsRes, settlementsRes, transRes] = await Promise.all([
        fetch('/api/vendor/earnings'),
        fetch('/api/vendor/settlements'),
        fetch(
          `/api/vendor/transactions?${new URLSearchParams({
            ...(filterType ? { type: filterType } : {}),
            ...(filterDirection ? { direction: filterDirection } : {}),
            ...(startDate ? { startDate } : {}),
            ...(endDate ? { endDate } : {}),
            limit: '30',
          }).toString()}`
        ),
      ]);

      const [earningsData, settlementsData, transData] = await Promise.all([
        earningsRes.json(),
        settlementsRes.json(),
        transRes.json(),
      ]);

      if (earningsData.success) {
        setSummary(earningsData.data);
      } else {
        setError(earningsData.error || 'Failed to load earnings');
      }

      if (settlementsData.success) {
        setSettlements(settlementsData.data);
      }

      if (transData.success) {
        setTransactions(transData.data.transactions);
      }
    } catch (err: any) {
      setError(err.message || 'Error fetching financial data');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, [filterType, filterDirection, startDate, endDate]);

  const handleRequestSettlement = async () => {
    try {
      setRequestingSettlement(true);
      setSettlementSuccessMsg(null);

      const res = await fetch('/api/vendor/settlements', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({}),
      });

      const json = await res.json();
      if (json.success) {
        setSettlementSuccessMsg(`Settlement request #${json.data.settlementNumber} submitted successfully.`);
        setSettlementModalOpen(false);
        fetchData();
      } else {
        alert(json.error || 'Failed to request settlement.');
      }
    } catch (err: any) {
      alert(err.message || 'Network error occurred.');
    } finally {
      setRequestingSettlement(false);
    }
  };

  if (loading && !summary) {
    return (
      <div className="min-h-[70vh] flex items-center justify-center bg-(--bg-canvas) text-(--text-on-dark-muted)">
        <div className="flex items-center gap-3 text-sm">
          <RefreshCw className="w-5 h-5 text-emerald-500 animate-spin" />
          <span>Loading financial ledger & earnings...</span>
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
              <span>Immutable Financial Ledger</span>
            </div>
            <h1 className="text-2xl sm:text-3xl font-extrabold tracking-tight">
              Vendor Earnings & Settlements
            </h1>
            <p className="text-xs text-(--text-on-dark-muted) mt-1">
              Live commission calculations, delivery-triggered balances, and automated settlement payouts.
            </p>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={fetchData}
              className="p-2.5 rounded-xl border border-(--border-dark) bg-(--surface-card) hover:bg-(--surface-card-hover) text-(--text-on-dark-muted) transition-colors"
              title="Refresh Finances"
            >
              <RefreshCw className="w-4 h-4" />
            </button>
            <button
              onClick={() => setSettlementModalOpen(true)}
              disabled={!summary || summary.availableBalance <= 0}
              className="px-5 py-2.5 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 disabled:cursor-not-allowed text-white text-sm font-semibold flex items-center gap-2 shadow-sm transition-all"
            >
              <Send className="w-4 h-4" />
              <span>Request Payout</span>
            </button>
          </div>
        </div>

        {settlementSuccessMsg && (
          <div className="p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-emerald-400 text-sm flex items-center gap-3">
            <CheckCircle2 className="w-5 h-5 shrink-0" />
            <span>{settlementSuccessMsg}</span>
          </div>
        )}

        {error && (
          <div className="p-4 rounded-xl bg-rose-500/10 border border-rose-500/30 text-rose-400 text-sm flex items-center gap-3">
            <AlertCircle className="w-5 h-5 shrink-0" />
            <span>{error}</span>
          </div>
        )}

        {/* 5-Figure Financial Summary Cards */}
        {summary && (
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {/* Total Sales */}
            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="flex items-center justify-between text-xs text-(--text-on-dark-muted)">
                <span>Total Gross Sales</span>
                <DollarSign className="w-4 h-4 text-sky-400" />
              </div>
              <div className="text-2xl font-black tracking-tight">
                Rs. {summary.totalSales.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-(--text-on-dark-muted)">All fulfilled & active orders</p>
            </div>

            {/* Platform Commission */}
            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="flex items-center justify-between text-xs text-(--text-on-dark-muted)">
                <span>Platform Commission</span>
                <Percent className="w-4 h-4 text-purple-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-purple-400">
                -Rs. {summary.platformCommission.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-(--text-on-dark-muted)">Deducted platform fee</p>
            </div>

            {/* Net Earnings */}
            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="flex items-center justify-between text-xs text-(--text-on-dark-muted)">
                <span>Net Earnings</span>
                <TrendingUp className="w-4 h-4 text-amber-400" />
              </div>
              <div className="text-2xl font-black tracking-tight">
                Rs. {summary.netEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-(--text-on-dark-muted)">Sales minus commission</p>
            </div>

            {/* Pending Earnings */}
            <div className="p-5 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-2">
              <div className="flex items-center justify-between text-xs text-(--text-on-dark-muted)">
                <span>Pending Delivery</span>
                <Clock className="w-4 h-4 text-amber-500" />
              </div>
              <div className="text-2xl font-black tracking-tight text-amber-400">
                Rs. {summary.pendingEarnings.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-(--text-on-dark-muted)">Becomes available on delivery</p>
            </div>

            {/* Available Balance (High-Contrast Green Accent) */}
            <div className="p-5 rounded-2xl bg-emerald-950/30 border border-emerald-500/40 space-y-2 shadow-sm">
              <div className="flex items-center justify-between text-xs text-emerald-400 font-semibold">
                <span>Available Balance</span>
                <CheckCircle2 className="w-4 h-4 text-emerald-400" />
              </div>
              <div className="text-2xl font-black tracking-tight text-emerald-400">
                Rs. {summary.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-emerald-400/80">Ready for instant payout request</p>
            </div>
          </div>
        )}

        {/* Two-Column Section: Settlement Queue & Ledger */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-8">
          {/* Left Column: Settlement Requests History */}
          <div className="lg:col-span-1 space-y-4">
            <div className="flex items-center justify-between">
              <h2 className="text-lg font-bold">Payout Requests</h2>
              <span className="text-xs text-(--text-on-dark-muted)">{settlements.length} total</span>
            </div>

            <div className="space-y-3">
              {settlements.length === 0 ? (
                <div className="p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) text-center text-xs text-(--text-on-dark-muted)">
                  No payout requests recorded yet.
                </div>
              ) : (
                settlements.map((s) => (
                  <div
                    key={s.id}
                    className="p-4 rounded-xl bg-(--surface-card) border border-(--border-dark) space-y-3"
                  >
                    <div className="flex items-center justify-between">
                      <span className="font-mono text-xs font-semibold">{s.settlementNumber}</span>
                      <StatusBadge status={s.status} />
                    </div>

                    <div className="flex items-baseline justify-between">
                      <span className="text-xs text-(--text-on-dark-muted)">Amount</span>
                      <span className="text-base font-bold text-emerald-400">
                        Rs. {s.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                      </span>
                    </div>

                    <div className="text-[11px] text-(--text-on-dark-muted) flex justify-between border-t border-(--border-dark) pt-2">
                      <span>Requested: {new Date(s.requestedAt).toLocaleDateString()}</span>
                      <span>{s.items?.length || 0} orders</span>
                    </div>

                    {s.paymentReference && (
                      <div className="text-[10px] font-mono text-(--text-on-dark-muted) bg-(--bg-canvas) p-2 rounded border border-(--border-dark)">
                        Ref: {s.paymentReference}
                      </div>
                    )}
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Right Column: Transaction Ledger */}
          <div className="lg:col-span-2 space-y-4">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3">
              <h2 className="text-lg font-bold">Financial Transaction Ledger</h2>

              {/* Filters */}
              <div className="flex flex-wrap items-center gap-2 text-xs">
                <select
                  value={filterType}
                  onChange={(e) => setFilterType(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-(--surface-card) border border-(--border-dark) text-(--text-on-dark) focus:outline-none"
                >
                  <option value="">All Types</option>
                  <option value="SALE">SALE</option>
                  <option value="COMMISSION">COMMISSION</option>
                  <option value="PAYMENT">PAYMENT</option>
                  <option value="SETTLEMENT">SETTLEMENT</option>
                  <option value="REFUND">REFUND</option>
                  <option value="ADJUSTMENT">ADJUSTMENT</option>
                </select>

                <select
                  value={filterDirection}
                  onChange={(e) => setFilterDirection(e.target.value)}
                  className="px-2.5 py-1.5 rounded-lg bg-(--surface-card) border border-(--border-dark) text-(--text-on-dark) focus:outline-none"
                >
                  <option value="">All Directions</option>
                  <option value="CREDIT">CREDIT (+)</option>
                  <option value="DEBIT">DEBIT (-)</option>
                </select>
              </div>
            </div>

            {/* Table */}
            <div className="overflow-x-auto rounded-2xl border border-(--border-dark) bg-(--surface-card)">
              <table className="w-full text-left text-xs">
                <thead className="bg-(--bg-canvas) text-(--text-on-dark-muted) uppercase tracking-wider font-semibold border-b border-(--border-dark)">
                  <tr>
                    <th className="py-3 px-4">Date</th>
                    <th className="py-3 px-4">Type</th>
                    <th className="py-3 px-4">Description</th>
                    <th className="py-3 px-4 text-right">Amount</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-(--border-dark)">
                  {transactions.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="py-8 text-center text-(--text-on-dark-muted)">
                        No financial transactions matching filter.
                      </td>
                    </tr>
                  ) : (
                    transactions.map((tx) => (
                      <tr key={tx.id} className="hover:bg-(--surface-card-hover) transition-colors">
                        <td className="py-3 px-4 whitespace-nowrap text-(--text-on-dark-muted)">
                          {new Date(tx.createdAt).toLocaleDateString()}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap">
                          <span
                            className={`inline-block px-2 py-0.5 rounded text-[10px] font-bold ${
                              tx.type === 'SALE'
                                ? 'bg-sky-500/10 text-sky-400 border border-sky-500/20'
                                : tx.type === 'COMMISSION'
                                ? 'bg-purple-500/10 text-purple-400 border border-purple-500/20'
                                : tx.type === 'SETTLEMENT'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : tx.type === 'REFUND'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-slate-500/10 text-slate-400 border border-slate-500/20'
                            }`}
                          >
                            {tx.type}
                          </span>
                        </td>
                        <td className="py-3 px-4 max-w-xs truncate text-(--text-on-dark)">
                          {tx.description}
                        </td>
                        <td className="py-3 px-4 whitespace-nowrap text-right font-semibold">
                          <span
                            className={
                              tx.direction === 'CREDIT' ? 'text-emerald-400' : 'text-rose-400'
                            }
                          >
                            {tx.direction === 'CREDIT' ? '+' : '-'}Rs.{' '}
                            {tx.amount.toLocaleString('en-US', { minimumFractionDigits: 2 })}
                          </span>
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

      {/* Request Payout Modal */}
      {settlementModalOpen && summary && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-xs">
          <div className="max-w-md w-full p-6 rounded-2xl bg-(--surface-card) border border-(--border-dark) space-y-5 shadow-2xl">
            <div className="flex items-center justify-between">
              <h3 className="text-lg font-bold">Request Settlement Payout</h3>
              <button
                onClick={() => setSettlementModalOpen(false)}
                className="text-(--text-on-dark-muted) hover:text-(--text-on-dark)"
              >
                <X className="w-5 h-5" />
              </button>
            </div>

            <div className="p-4 rounded-xl bg-(--bg-canvas) border border-(--border-dark) space-y-2">
              <div className="text-xs text-(--text-on-dark-muted)">Total Available for Withdrawal:</div>
              <div className="text-3xl font-black text-emerald-400">
                Rs. {summary.availableBalance.toLocaleString('en-US', { minimumFractionDigits: 2 })}
              </div>
              <p className="text-[11px] text-(--text-on-dark-muted)">
                This payout request will lock all completed order earnings and generate an immutable payout request for marketplace administrator review.
              </p>
            </div>

            <div className="flex items-center justify-end gap-3 pt-2">
              <button
                type="button"
                onClick={() => setSettlementModalOpen(false)}
                className="px-4 py-2 rounded-xl border border-(--border-dark) text-xs font-semibold hover:bg-(--surface-card-hover)"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={requestingSettlement || summary.availableBalance <= 0}
                onClick={handleRequestSettlement}
                className="px-5 py-2 rounded-xl bg-emerald-600 hover:bg-emerald-500 disabled:opacity-50 text-white text-xs font-semibold flex items-center gap-2"
              >
                {requestingSettlement && <RefreshCw className="w-4 h-4 animate-spin" />}
                <span>Confirm Settlement</span>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
