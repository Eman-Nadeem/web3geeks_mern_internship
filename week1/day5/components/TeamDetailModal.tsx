'use client';

import React from 'react';

export interface TeamDetailModalProps {
  isOpen: boolean;
  onClose: () => void;
  team: any;
  users?: Array<any>;
  projects?: Array<any>;
  onSelectProjectDetail?: (project: any) => void;
}

export default function TeamDetailModal({
  isOpen,
  onClose,
  team,
  users = [],
  projects = [],
  onSelectProjectDetail,
}: TeamDetailModalProps) {
  if (!isOpen || !team) return null;

  // Organization name
  const orgName =
    typeof team.orgId === 'object' && team.orgId?.name
      ? team.orgId.name
      : 'Organization';

  // Team Lead
  let leadName = 'Unassigned';
  let leadEmail = '';
  if (typeof team.leadId === 'object' && team.leadId?.fullName) {
    leadName = team.leadId.fullName;
    leadEmail = team.leadId.email || '';
  } else if (team.leadId) {
    const foundLead = users.find((u) => String(u._id) === String(team.leadId));
    if (foundLead) {
      leadName = foundLead.fullName;
      leadEmail = foundLead.email || '';
    }
  }

  // Team Members
  const memberIdsList: string[] = Array.isArray(team.memberIds)
    ? team.memberIds.map((m: any) => (typeof m === 'object' ? String(m._id) : String(m)))
    : [];

  const teamMembers = users.filter((u) => memberIdsList.includes(String(u._id)));

  // Team Projects
  const teamProjects = projects.filter((p) => {
    const pTeamId = typeof p.teamId === 'object' ? p.teamId?._id : p.teamId;
    return String(pTeamId) === String(team._id);
  });

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-2xl w-full p-6 shadow-2xl space-y-6 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 max-h-[90vh] flex flex-col overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-11 h-11 rounded-2xl bg-gradient-to-tr from-emerald-600 to-teal-600 text-white font-bold text-lg flex items-center justify-center shadow-md shadow-emerald-500/20 shrink-0">
              👥
            </div>
            <div>
              <div className="flex items-center gap-2">
                <h3 className="font-extrabold text-slate-900 text-xl leading-snug">{team.name}</h3>
                <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                  {memberIdsList.length} Members
                </span>
              </div>
              <p className="text-xs text-slate-500 mt-0.5">Org: {orgName}</p>
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
          {/* Description */}
          {team.description && (
            <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
              <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Description</p>
              <p className="text-xs text-slate-700 leading-relaxed">{team.description}</p>
            </div>
          )}

          {/* Team Lead Box */}
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80">
            <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider mb-1">Team Leader</p>
            <p className="text-sm font-extrabold text-slate-900">{leadName}</p>
            {leadEmail && <p className="text-xs text-slate-500 font-mono mt-0.5">{leadEmail}</p>}
          </div>

          {/* Team Members Table */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Team Roster ({teamMembers.length})
            </h4>
            {teamMembers.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No member records found for this team roster.</p>
            ) : (
              <div className="border border-slate-200 rounded-2xl overflow-hidden bg-white shadow-xs">
                <table className="w-full text-left text-xs">
                  <thead className="bg-slate-50 border-b border-slate-200 font-bold text-slate-500 uppercase text-[10px]">
                    <tr>
                      <th className="px-4 py-2.5">Member Name</th>
                      <th className="px-4 py-2.5">Email</th>
                      <th className="px-4 py-2.5">Platform Role</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-100">
                    {teamMembers.map((m) => (
                      <tr key={m._id} className="hover:bg-slate-50 transition-colors">
                        <td className="px-4 py-3 font-extrabold text-slate-900 flex items-center gap-2">
                          <div className="w-6 h-6 rounded-full bg-slate-200 text-slate-700 flex items-center justify-center font-bold text-[10px]">
                            {m.fullName?.charAt(0) || 'U'}
                          </div>
                          {m.fullName}
                        </td>
                        <td className="px-4 py-3 text-slate-600 font-mono text-[11px]">{m.email}</td>
                        <td className="px-4 py-3">
                          <span
                            className={`px-2 py-0.5 rounded text-[10px] font-bold uppercase ${
                              m.role === 'OrgAdmin'
                                ? 'bg-purple-100 text-purple-800'
                                : m.role === 'ProjectManager'
                                ? 'bg-blue-100 text-blue-800'
                                : 'bg-slate-100 text-slate-700'
                            }`}
                          >
                            {m.role}
                          </span>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Assigned Projects */}
          <div className="space-y-3">
            <h4 className="text-xs font-bold text-slate-900 uppercase tracking-wider">
              Assigned Projects ({teamProjects.length})
            </h4>
            {teamProjects.length === 0 ? (
              <p className="text-xs text-slate-400 italic">No projects assigned to this team.</p>
            ) : (
              <div className="space-y-2">
                {teamProjects.map((p) => (
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
