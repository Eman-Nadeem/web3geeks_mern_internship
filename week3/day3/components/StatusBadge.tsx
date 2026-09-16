import React from 'react';
import { VendorStatus, ProductStatus } from '@prisma/client';

interface StatusBadgeProps {
  status: VendorStatus | ProductStatus | string;
  className?: string;
}

export function StatusBadge({ status, className = '' }: StatusBadgeProps) {
  let badgeStyle = 'bg-slate-800/80 text-slate-300 border-slate-700/50';

  switch (status) {
    case 'ACTIVE':
      badgeStyle = 'bg-emerald-950/60 text-emerald-400 border-emerald-800/60 shadow-[0_0_12px_rgba(16,185,129,0.15)]';
      break;
    case 'PENDING':
      badgeStyle = 'bg-amber-950/60 text-amber-300 border-amber-800/60 shadow-[0_0_12px_rgba(245,158,11,0.15)]';
      break;
    case 'SUSPENDED':
      badgeStyle = 'bg-rose-950/60 text-rose-300 border-rose-800/60 shadow-[0_0_12px_rgba(244,63,94,0.15)]';
      break;
    case 'REJECTED':
      badgeStyle = 'bg-red-950/60 text-red-400 border-red-900/60';
      break;
    case 'DRAFT':
      badgeStyle = 'bg-indigo-950/60 text-indigo-300 border-indigo-800/60';
      break;
    case 'ARCHIVED':
      badgeStyle = 'bg-zinc-900/80 text-zinc-400 border-zinc-700/50';
      break;
  }

  return (
    <span
      className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium border uppercase tracking-wider ${badgeStyle} ${className}`}
    >
      <span className="w-1.5 h-1.5 mr-1.5 rounded-full bg-current opacity-75" />
      {status}
    </span>
  );
}
