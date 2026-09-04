'use client';

import React from 'react';

export interface ActivityLogDrawerProps {
  isOpen: boolean;
  onClose: () => void;
  logs: Array<{
    _id: string;
    action: string;
    entityType: string;
    actorId?: { fullName?: string; email?: string } | string;
    details?: any;
    createdAt: string;
  }>;
}

export default function ActivityLogDrawer({
  isOpen,
  onClose,
  logs,
}: ActivityLogDrawerProps) {
  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/40 backdrop-blur-xs flex justify-end">
      <div className="bg-white w-full max-w-md h-full shadow-2xl border-l border-slate-200 flex flex-col transform transition-transform animate-in slide-in-from-right duration-200">
        {/* Header */}
        <div className="p-6 border-b border-slate-200 flex items-center justify-between bg-slate-50">
          <div className="flex items-center gap-2">
            <svg className="w-5 h-5 text-[#FF6B2C]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h2 className="text-base font-bold text-slate-900">Audit & Activity Log</h2>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1.5 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        {/* Stream Content */}
        <div className="flex-1 overflow-y-auto p-6 space-y-4">
          {logs.length === 0 ? (
            <div className="text-center py-12">
              <p className="text-xs font-semibold text-slate-400">No activity logs recorded yet.</p>
            </div>
          ) : (
            logs.map((log) => {
              const actorName =
                typeof log.actorId === 'object' && log.actorId?.fullName
                  ? log.actorId.fullName
                  : 'System / User';

              const timeStr = new Date(log.createdAt).toLocaleString();

              return (
                <div key={log._id} className="p-4 bg-slate-50 border border-slate-200 rounded-xl space-y-1.5">
                  <div className="flex items-center justify-between">
                    <span className="text-[11px] font-bold text-[#FF6B2C] uppercase tracking-wider">
                      {log.action}
                    </span>
                    <span className="text-[10px] text-slate-400 font-mono">{timeStr}</span>
                  </div>
                  <p className="text-xs font-semibold text-slate-800">
                    {actorName} <span className="font-normal text-slate-500">performed action on</span>{' '}
                    <span className="font-mono text-slate-700">{log.entityType}</span>
                  </p>
                  {log.details && (
                    <pre className="text-[10px] bg-white p-2 rounded-lg border border-slate-200 text-slate-600 overflow-x-auto">
                      {JSON.stringify(log.details, null, 2)}
                    </pre>
                  )}
                </div>
              );
            })
          )}
        </div>
      </div>
    </div>
  );
}
