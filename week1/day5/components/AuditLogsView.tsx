'use client';

import React from 'react';

export interface AuditLogItem {
  _id: string;
  action: string;
  entityType: string;
  entityId: string;
  actorId?: { fullName?: string; email?: string; role?: string } | string;
  details?: Record<string, any>;
  ipAddress?: string;
  timestamp: string;
}

export interface AuditLogsViewProps {
  logs: AuditLogItem[];
  userRole?: string;
}

export default function AuditLogsView({ logs, userRole }: AuditLogsViewProps) {
  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      <div>
        <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {userRole === 'SuperAdmin' ? 'Platform System Audit Logs' : 'Organization Audit Logs'}
        </h2>
        <p className="text-sm text-slate-500 mt-1">
          {userRole === 'SuperAdmin'
            ? 'Platform-wide security audit log trail across all tenants.'
            : 'Immutable security log history for your organization.'}
        </p>
      </div>

      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between">
          <h3 className="font-bold text-slate-900 text-sm">Audit Trail Records</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {logs.length} Logged Events
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50/80 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">Timestamp</th>
                <th className="py-3.5 px-6">Actor</th>
                <th className="py-3.5 px-6">Action</th>
                <th className="py-3.5 px-6">Entity</th>
                <th className="py-3.5 px-6">IP Address</th>
                <th className="py-3.5 px-6">Details</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {logs.length === 0 ? (
                <tr>
                  <td colSpan={6} className="py-8 text-center text-slate-400">
                    No audit logs available.
                  </td>
                </tr>
              ) : (
                logs.map((log) => {
                  const actorName =
                    typeof log.actorId === 'object' && log.actorId?.fullName
                      ? log.actorId.fullName
                      : 'System Actor';
                  const actorEmail =
                    typeof log.actorId === 'object' && log.actorId?.email
                      ? log.actorId.email
                      : '';

                  return (
                    <tr key={log._id} className="hover:bg-slate-50/60 transition-colors">
                      <td className="py-4 px-6 text-slate-500 font-mono whitespace-nowrap">
                        {new Date(log.timestamp).toLocaleString()}
                      </td>
                      <td className="py-4 px-6">
                        <div className="font-semibold text-slate-900">{actorName}</div>
                        {actorEmail && <div className="text-[10px] text-slate-400">{actorEmail}</div>}
                      </td>
                      <td className="py-4 px-6">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider bg-slate-100 text-slate-700 border border-slate-200">
                          {log.action}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-600">
                        <span className="font-semibold">{log.entityType}</span>
                        <span className="text-[10px] text-slate-400 block font-mono">
                          ID: {String(log.entityId).slice(-8)}
                        </span>
                      </td>
                      <td className="py-4 px-6 text-slate-500 font-mono">
                        {log.ipAddress || '127.0.0.1'}
                      </td>
                      <td className="py-4 px-6 max-w-xs truncate text-slate-500 font-mono text-[11px]">
                        {log.details ? JSON.stringify(log.details) : '{}'}
                      </td>
                    </tr>
                  );
                })
              )}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
