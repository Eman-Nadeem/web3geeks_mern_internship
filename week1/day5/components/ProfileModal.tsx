'use client';

import React, { useState, useEffect } from 'react';

export interface ProfileModalProps {
  isOpen: boolean;
  onClose: () => void;
  user: any;
  onProfileUpdated?: () => void;
}

export default function ProfileModal({ isOpen, onClose, user, onProfileUpdated }: ProfileModalProps) {
  const [fullName, setFullName] = useState('');
  const [avatarUrl, setAvatarUrl] = useState('');
  const [currentPassword, setCurrentPassword] = useState('');
  const [newPassword, setNewPassword] = useState('');
  const [orgDetails, setOrgDetails] = useState<any>(null);

  const [isLoading, setIsLoading] = useState(false);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [successMsg, setSuccessMsg] = useState('');
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (isOpen) {
      setFullName(user?.fullName || '');
      setAvatarUrl(user?.avatarUrl || '');
      setCurrentPassword('');
      setNewPassword('');
      setSuccessMsg('');
      setErrorMsg('');

      // Fetch user profile and org details
      fetchProfile();
    }
  }, [isOpen, user]);

  const fetchProfile = async () => {
    try {
      setIsLoading(true);
      const res = await fetch('/api/users/profile');
      if (res.ok) {
        const data = await res.json();
        if (data.user) {
          setFullName(data.user.fullName || '');
          setAvatarUrl(data.user.avatarUrl || '');
        }
        if (data.organization) {
          setOrgDetails(data.organization);
        }
      }
    } catch (e) {
      console.error('Failed to fetch profile:', e);
    } finally {
      setIsLoading(false);
    }
  };

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setIsSubmitting(true);
    setErrorMsg('');
    setSuccessMsg('');

    try {
      const payload: Record<string, any> = {
        fullName: fullName.trim(),
        avatarUrl: avatarUrl.trim(),
      };

      if (newPassword) {
        if (!currentPassword) {
          setErrorMsg('Current password is required to change password.');
          setIsSubmitting(false);
          return;
        }
        payload.currentPassword = currentPassword;
        payload.newPassword = newPassword;
      }

      const res = await fetch('/api/users/profile', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });

      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.message || 'Failed to update profile');
      }

      setSuccessMsg('Profile updated successfully!');
      setCurrentPassword('');
      setNewPassword('');
      if (onProfileUpdated) onProfileUpdated();
    } catch (err: any) {
      setErrorMsg(err.message || 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-3xl max-w-lg w-full p-6 shadow-2xl space-y-5 border border-slate-200 animate-in fade-in zoom-in-95 duration-150 overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between border-b border-slate-100 pb-4">
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 rounded-full bg-[#1E1F24] text-[#FF6B2C] border-2 border-[#FF6B2C]/40 font-bold text-sm flex items-center justify-center">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div>
              <h3 className="font-extrabold text-slate-900 text-lg leading-snug">
                {user?.role === 'SuperAdmin' ? 'Super Admin Profile' : 'User & Organization Profile'}
              </h3>
              <p className="text-xs text-slate-500 font-medium">{user?.role || 'User'} Profile Settings</p>
            </div>
          </div>
          <button onClick={onClose} className="text-slate-400 hover:text-slate-600 p-1.5 rounded-lg">
            ✕
          </button>
        </div>

        {errorMsg && (
          <div className="p-3 bg-rose-50 text-rose-700 text-xs font-semibold rounded-xl border border-rose-200">
            {errorMsg}
          </div>
        )}

        {successMsg && (
          <div className="p-3 bg-emerald-50 text-emerald-700 text-xs font-semibold rounded-xl border border-emerald-200">
            {successMsg}
          </div>
        )}

        {/* Organization Info Box (Excluded for SuperAdmin) */}
        {orgDetails && user?.role !== 'SuperAdmin' && (
          <div className="p-4 bg-slate-50 rounded-2xl border border-slate-200/80 space-y-2">
            <div className="flex items-center justify-between">
              <span className="text-[11px] font-bold text-slate-400 uppercase tracking-wider">Organization Profile</span>
              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                {orgDetails.plan} Tier
              </span>
            </div>
            <div className="flex items-center justify-between">
              <div>
                <p className="font-extrabold text-slate-900 text-sm">{orgDetails.name}</p>
                <p className="text-xs text-slate-500 font-mono">Slug: {orgDetails.slug}</p>
              </div>
              <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-100 text-emerald-800 uppercase">
                {orgDetails.status}
              </span>
            </div>
          </div>
        )}

        {/* Update Form */}
        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Full Name *
            </label>
            <input
              type="text"
              required
              value={fullName}
              onChange={(e) => setFullName(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Email Address (Read-Only)
            </label>
            <input
              type="email"
              disabled
              value={user?.email || ''}
              className="w-full bg-slate-100 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-500 cursor-not-allowed font-medium"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Avatar URL
            </label>
            <input
              type="url"
              value={avatarUrl}
              onChange={(e) => setAvatarUrl(e.target.value)}
              placeholder="https://example.com/avatar.png"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
            />
          </div>

          <div className="pt-2 border-t border-slate-100 space-y-3">
            <p className="text-xs font-bold text-slate-700 uppercase tracking-wider">Change Password (Optional)</p>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  Current Password
                </label>
                <input
                  type="password"
                  value={currentPassword}
                  onChange={(e) => setCurrentPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
                />
              </div>

              <div>
                <label className="block text-[11px] font-semibold text-slate-600 mb-1">
                  New Password
                </label>
                <input
                  type="password"
                  value={newPassword}
                  onChange={(e) => setNewPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
                />
              </div>
            </div>
          </div>

          <div className="pt-4 flex items-center justify-end gap-3 border-t border-slate-100">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100"
            >
              Close
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white text-xs font-bold shadow-md shadow-[#FF6B2C]/20 disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : 'Update Profile'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
