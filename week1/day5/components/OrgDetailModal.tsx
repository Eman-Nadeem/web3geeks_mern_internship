'use client';

import React from 'react';

export interface OrgDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  org: any;
  users?: Array<any>;
  projects?: Array<any>;
  teams?: Array<any>;
  onSelectProjectDetail?: (project: any) => void;
  onSelectTeamDetail?: (team: any) => void;
}

export default function OrgDetailModal({
  isOpen,
  onClose,
  org,
  users = [],
  projects = [],
  teams = [],
  onSelectProjectDetail,
  onSelectTeamDetail,
}: OrgDetailModalProps) {
  if (!isOpen || !org) return null;

  // Filter tenant-specific items
  const orgProjects = projects.filter((p) => {
    const pOrgId = typeof p.orgId === 'object' ? p.orgId?._id : p.orgId;
    return String(pOrgId) === String(org._id);
  });

  const orgTeams = teams.filter((t) => {
    const tOrgId = typeof t.orgId === 'object' ? t.orgId?._id : t.orgId;
    return String(tOrgId) === String(org._id);
  });

  const orgUsers = users.filter((u) => {
    const uOrgId = typeof u.orgId === 'object' ? u.orgId?._id : u.orgId;
    return String(uOrgId) === String(org._id);
  });

  const ownerName =
    typeof org.ownerId === 'object' && org.ownerId?.fullName
      ? org.ownerId.fullName
      : 'No Owner Assigned';

  const ownerEmail =
    typeof org.ownerId === 'object' && org.ownerId?.email
      ? org.ownerId.email
      : '';

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] text-white font-bold text-lg flex items-center justify-center shadow-md shadow-[#FF6B2C]/20 shrink-0">
              {org.name?.charAt(0).toUpperCase() || 'O'}
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xl leading-snug">{org.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                  {org.plan} Tier
                </span>
                <span
                  className={`px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase ${
                    org.status === 'ACTIVE'
                      ? 'bg-emerald-100 text-emerald-800'
                      : 'bg-rose-100 text-rose-800'
                  }`}
                >
                  {org.status}
                </span>
              </div>
              <p className="text-xs text-slate-500 font-mono mt-0.5">Tenant Slug: {org.slug}</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-2 rounded-xl hover:bg-slate-100 transition-colors text-sm font-bold"
          >
            ✕
          </button>
        </div>

        {/* Scrollable Content Body */}
        <div className="flex-1 overflow-y-auto space-y-5 pr-1">
          {/* Stats Bar */}
          <div className="grid grid-cols-3 gap-4">
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Total Projects</p>
              <p className="text-2xl font-extrabold text-slate-900 mt-1">{orgProjects.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Active Teams</p>
              <p className="text-2xl font-extrabold text-[#FF6B2C] mt-1">{orgTeams.length}</p>
            </div>
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Tenant Users</p>
              <p className="text-2xl font-extrabold text-purple-600 mt-1">{orgUsers.length}</p>
            </div>
          </div>

          {/* Owner Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-1">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Organization Owner (OrgAdmin)</p>
            <p className="text-sm font-bold text-slate-900">{ownerName}</p>
            {ownerEmail && <p className="text-xs text-slate-500 font-mono">{ownerEmail}</p>}
          </div>

          {/* Projects List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Organization Projects</h4>
            {orgProjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No projects found for this organization.</p>
            ) : (
              <div className="space-y-2">
                {orgProjects.map((p) => (
                  <div
                    key={p._id}
                    onClick={() => onSelectProjectDetail && onSelectProjectDetail(p)}
                    className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{p.name}</p>
                      {p.description && <p className="text-[11px] text-slate-500 line-clamp-1">{p.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                        {p.status}
                      </span>
                      <span className="text-xs text-[#FF6B2C] font-bold">Details →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>

          {/* Teams List */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">Organization Teams</h4>
            {orgTeams.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No teams configured for this organization.</p>
            ) : (
              <div className="space-y-2">
                {orgTeams.map((t) => (
                  <div
                    key={t._id}
                    onClick={() => onSelectTeamDetail && onSelectTeamDetail(t)}
                    className="p-3 bg-white hover:bg-slate-50 rounded-xl border border-slate-200 transition-colors cursor-pointer flex items-center justify-between"
                  >
                    <div>
                      <p className="text-xs font-bold text-slate-900">{t.name}</p>
                      {t.description && <p className="text-[11px] text-slate-500 line-clamp-1">{t.description}</p>}
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                        {t.memberIds?.length || 0} Members
                      </span>
                      <span className="text-xs text-[#FF6B2C] font-bold">Roster →</span>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        </div>

        {/* Footer */}
        <div className="pt-3 border-t border-slate-100 flex justify-end">
          <button
            onClick={onClose}
            className="px-5 py-2 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold transition-colors"
          >
            Close
          </button>
        </div>
      </div>
    </div>
  );
}
