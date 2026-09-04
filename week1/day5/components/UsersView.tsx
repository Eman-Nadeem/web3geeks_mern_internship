'use client';

import React, { useState } from 'react';

export interface UserItem {
  _id: string;
  fullName: string;
  email: string;
  role: string;
  status: string;
  createdAt?: string;
  inviteExpiresAt?: string;
}

interface UsersViewProps {
  currentUser: { _id: string; role: string; orgId?: string } | null;
  users: UserItem[];
  onRefreshUsers: () => void;
}

export default function UsersView({ currentUser, users, onRefreshUsers }: UsersViewProps) {
  const [isInviteModalOpen, setIsInviteModalOpen] = useState(false);
  const [inviteEmail, setInviteEmail] = useState('');
  const [inviteRole, setInviteRole] = useState<'ProjectManager' | 'TeamMember'>('TeamMember');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState('');
  const [successMessage, setSuccessMessage] = useState('');
  const [generatedInviteLink, setGeneratedInviteLink] = useState('');

  const isOrgAdmin = currentUser?.role === 'OrgAdmin' || currentUser?.role === 'SuperAdmin';

  const handleInviteSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError('');
    setSuccessMessage('');
    setGeneratedInviteLink('');
    setLoading(true);

    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email: inviteEmail, role: inviteRole }),
      });

      const data = await res.json();

      if (!res.ok) {
        throw new Error(data.message || 'Failed to send invite');
      }

      setSuccessMessage(`Invitation created for ${data.user.email}`);
      const fullInviteUrl = `${window.location.origin}${data.inviteLink}`;
      setGeneratedInviteLink(fullInviteUrl);
      setInviteEmail('');
      onRefreshUsers();
    } catch (err: any) {
      setError(err.message || 'Failed to process invitation');
    } finally {
      setLoading(false);
    }
  };

  const handleRoleChange = async (userId: string, newRole: string) => {
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ role: newRole }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update role');

      onRefreshUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user role');
    }
  };

  const handleStatusToggle = async (userId: string, currentStatus: string) => {
    const nextStatus = currentStatus === 'ACTIVE' ? 'DEACTIVATED' : 'ACTIVE';
    try {
      const res = await fetch(`/api/users/${userId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: nextStatus }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to update status');

      onRefreshUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to update user status');
    }
  };

  const handleResendInvite = async (email: string, role: string) => {
    try {
      const res = await fetch('/api/users/invite', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ email, role: role === 'ProjectManager' ? 'ProjectManager' : 'TeamMember' }),
      });

      const data = await res.json();
      if (!res.ok) throw new Error(data.message || 'Failed to resend invite');

      const fullUrl = `${window.location.origin}${data.inviteLink}`;
      navigator.clipboard.writeText(fullUrl);
      alert(`New invitation token generated! Link copied to clipboard:\n${fullUrl}`);
      onRefreshUsers();
    } catch (err: any) {
      alert(err.message || 'Failed to resend invite');
    }
  };

  return (
    <div className="p-8 space-y-6 max-w-7xl mx-auto">
      {/* Header Bar */}
      <div className="flex items-center justify-between">
        <div>
          <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">Organization Users & Access</h2>
          <p className="text-sm text-slate-500 mt-1">Manage team member roles, permissions, and pending invitations.</p>
        </div>

        {isOrgAdmin && (
          <button
            onClick={() => {
              setIsInviteModalOpen(true);
              setError('');
              setSuccessMessage('');
              setGeneratedInviteLink('');
            }}
            className="flex items-center gap-2 px-4 py-2.5 bg-gradient-to-r from-[#FF6B2C] to-[#FF8F5C] hover:opacity-90 font-semibold text-white text-xs uppercase tracking-wider rounded-xl shadow-md shadow-[#FF6B2C]/20 transition-all cursor-pointer"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            Invite User
          </button>
        )}
      </div>

      {/* Users Table */}
      <div className="bg-white rounded-2xl border border-slate-200/90 shadow-sm overflow-hidden">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50/50">
          <h3 className="font-bold text-slate-900 text-sm">Tenant User Accounts</h3>
          <span className="text-xs font-semibold text-slate-500 bg-slate-100 px-2.5 py-1 rounded-full">
            {users.length} Users
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs border-collapse">
            <thead>
              <tr className="bg-slate-50 border-b border-slate-200 text-slate-500 font-semibold uppercase tracking-wider">
                <th className="py-3.5 px-6">User Name</th>
                <th className="py-3.5 px-6">Email</th>
                <th className="py-3.5 px-6">Role</th>
                <th className="py-3.5 px-6">Status</th>
                <th className="py-3.5 px-6">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium text-slate-700">
              {users.map((u) => {
                const isSelf = u._id === currentUser?._id;
                const isUserAdmin = u.role === 'OrgAdmin' || u.role === 'SuperAdmin';

                return (
                  <tr key={u._id} className="hover:bg-slate-50/80 transition-colors">
                    <td className="py-4 px-6 font-bold text-slate-900 flex items-center gap-3">
                      <div className="w-8 h-8 rounded-full bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] text-white font-bold text-xs flex items-center justify-center shrink-0 shadow-xs">
                        {u.fullName ? u.fullName.charAt(0).toUpperCase() : 'U'}
                      </div>
                      <span>{u.fullName || 'Invited User'}</span>
                    </td>
                    <td className="py-4 px-6 text-slate-500">{u.email}</td>
                    <td className="py-4 px-6">
                      {isOrgAdmin && !isUserAdmin ? (
                        <select
                          value={u.role}
                          onChange={(e) => handleRoleChange(u._id, e.target.value)}
                          className="bg-slate-50 border border-slate-200 rounded-lg text-xs font-semibold text-slate-800 px-2.5 py-1 focus:outline-none focus:border-[#FF6B2C] cursor-pointer"
                        >
                          <option value="ProjectManager">ProjectManager</option>
                          <option value="TeamMember">TeamMember</option>
                        </select>
                      ) : (
                        <span className="px-2.5 py-1 rounded-md text-[10px] font-bold uppercase bg-slate-100 text-slate-700 border border-slate-200">
                          {u.role}
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6">
                      {u.status === 'ACTIVE' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-emerald-50 text-emerald-700 border border-emerald-200">
                          ACTIVE
                        </span>
                      )}
                      {u.status === 'INVITED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-amber-50 text-amber-700 border border-amber-200">
                          INVITED
                        </span>
                      )}
                      {u.status === 'DEACTIVATED' && (
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold uppercase bg-rose-50 text-rose-700 border border-rose-200">
                          DEACTIVATED
                        </span>
                      )}
                    </td>
                    <td className="py-4 px-6 flex items-center gap-2">
                      {isOrgAdmin && !isSelf && !isUserAdmin && (
                        <>
                          <button
                            onClick={() => handleStatusToggle(u._id, u.status || 'ACTIVE')}
                            className={`px-3 py-1 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer ${
                              u.status === 'DEACTIVATED'
                                ? 'bg-emerald-100 text-emerald-700 hover:bg-emerald-200'
                                : 'bg-rose-100 text-rose-700 hover:bg-rose-200'
                            }`}
                          >
                            {u.status === 'DEACTIVATED' ? 'Activate' : 'Deactivate'}
                          </button>

                          {u.status === 'INVITED' && (
                            <button
                              onClick={() => handleResendInvite(u.email, u.role)}
                              className="px-3 py-1 bg-amber-100 text-amber-800 hover:bg-amber-200 rounded-lg text-[11px] font-semibold transition-colors cursor-pointer"
                            >
                              Resend Invite
                            </button>
                          )}
                        </>
                      )}
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      </div>

      {/* Invite User Modal */}
      {isInviteModalOpen && (
        <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-sm flex items-center justify-center p-4">
          <div className="w-full max-w-md bg-white border border-slate-200 rounded-2xl p-6 shadow-2xl space-y-4">
            <div className="flex items-center justify-between border-b border-slate-100 pb-3">
              <h3 className="font-bold text-slate-900 text-base">Invite New User</h3>
              <button
                onClick={() => setIsInviteModalOpen(false)}
                className="text-slate-400 hover:text-slate-700 transition-colors font-bold"
              >
                ✕
              </button>
            </div>

            {error && (
              <div className="p-3 bg-rose-50 border border-rose-200 rounded-xl text-rose-700 text-xs">
                {error}
              </div>
            )}

            {successMessage && (
              <div className="p-3 bg-emerald-50 border border-emerald-200 rounded-xl text-emerald-700 text-xs font-semibold">
                {successMessage}
              </div>
            )}

            {generatedInviteLink && (
              <div className="p-3 bg-slate-50 border border-slate-200 rounded-xl space-y-2">
                <p className="text-[11px] text-slate-600 font-semibold">Invite Link Generated:</p>
                <div className="flex items-center gap-2">
                  <input
                    type="text"
                    readOnly
                    value={generatedInviteLink}
                    className="w-full bg-white text-xs text-slate-800 p-2 rounded-lg border border-slate-200 font-mono"
                  />
                  <button
                    type="button"
                    onClick={() => {
                      navigator.clipboard.writeText(generatedInviteLink);
                      alert('Copied invite link to clipboard!');
                    }}
                    className="px-3 py-2 bg-[#FF6B2C] text-white text-xs font-bold rounded-lg shrink-0 cursor-pointer hover:bg-[#E0561B] transition-colors"
                  >
                    Copy
                  </button>
                </div>
              </div>
            )}

            <form onSubmit={handleInviteSubmit} className="space-y-4">
              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  User Email Address
                </label>
                <input
                  type="email"
                  required
                  placeholder="colleague@organization.com"
                  value={inviteEmail}
                  onChange={(e) => setInviteEmail(e.target.value)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#FF6B2C] focus:bg-white"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-slate-700 uppercase tracking-wider mb-1">
                  Assign Role
                </label>
                <select
                  value={inviteRole}
                  onChange={(e) => setInviteRole(e.target.value as any)}
                  className="w-full px-3.5 py-2.5 bg-slate-50 border border-slate-200 rounded-xl text-slate-900 text-sm focus:outline-none focus:border-[#FF6B2C] focus:bg-white"
                >
                  <option value="TeamMember">TeamMember (Individual Contributor)</option>
                  <option value="ProjectManager">ProjectManager (Team Lead)</option>
                </select>
                <p className="text-[11px] text-slate-500 mt-1">
                  Note: OrgAdmin cannot assign SuperAdmin or OrgAdmin roles.
                </p>
              </div>

              <div className="flex items-center justify-end gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsInviteModalOpen(false)}
                  className="px-4 py-2 bg-slate-100 text-slate-700 text-xs font-semibold rounded-xl hover:bg-slate-200 cursor-pointer"
                >
                  Close
                </button>
                <button
                  type="submit"
                  disabled={loading}
                  className="px-4 py-2 bg-gradient-to-r from-[#FF6B2C] to-[#FF8F5C] text-white text-xs font-semibold rounded-xl shadow-md shadow-[#FF6B2C]/20 disabled:opacity-50 cursor-pointer hover:opacity-90"
                >
                  {loading ? 'Creating Invite...' : 'Send Invitation'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
