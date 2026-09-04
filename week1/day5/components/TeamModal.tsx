'use client';

import React, { useState, useEffect } from 'react';

export interface TeamModalProps {
  isOpen: boolean;
  onClose: () => void;
  onSave: (teamData: any) => Promise<void>;
  initialTeam?: any;
  users: Array<{ _id: string; fullName: string; role: string }>;
}

export default function TeamModal({
  isOpen,
  onClose,
  onSave,
  initialTeam,
  users,
}: TeamModalProps) {
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [leaderId, setLeaderId] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorMsg, setErrorMsg] = useState('');

  useEffect(() => {
    if (initialTeam) {
      setName(initialTeam.name || '');
      setDescription(initialTeam.description || '');
      setLeaderId(
        typeof initialTeam.leaderId === 'object'
          ? initialTeam.leaderId?._id
          : initialTeam.leaderId || (users[0]?._id ?? '')
      );
    } else {
      setName('');
      setDescription('');
      setLeaderId(users[0]?._id || '');
    }
    setErrorMsg('');
  }, [initialTeam, isOpen, users]);

  if (!isOpen) return null;

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!name.trim()) {
      setErrorMsg('Team name is required.');
      return;
    }
    if (!leaderId) {
      setErrorMsg('Team leader selection is required.');
      return;
    }

    try {
      setIsSubmitting(true);
      setErrorMsg('');
      await onSave({
        _id: initialTeam?._id,
        name: name.trim(),
        description: description.trim(),
        leaderId,
      });
      onClose();
    } catch (err: any) {
      setErrorMsg(err.message || 'Failed to save team');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 bg-slate-900/60 backdrop-blur-xs flex items-center justify-center p-4">
      <div className="bg-white rounded-2xl w-full max-w-md shadow-2xl border border-slate-200 overflow-hidden transform transition-all">
        <div className="px-6 py-4 border-b border-slate-100 flex items-center justify-between bg-slate-50">
          <h2 className="text-lg font-bold text-slate-900">
            {initialTeam ? 'Edit Team' : 'Create New Team'}
          </h2>
          <button
            onClick={onClose}
            className="text-slate-400 hover:text-slate-700 p-1 rounded-lg hover:bg-slate-200 transition-colors"
          >
            ✕
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-4">
          {errorMsg && (
            <div className="bg-rose-50 border border-rose-200 text-rose-700 text-xs font-semibold p-3 rounded-xl">
              {errorMsg}
            </div>
          )}

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Team Name *
            </label>
            <input
              type="text"
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="e.g. Frontend Guild"
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
              required
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Description
            </label>
            <textarea
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="Team responsibilities or domain..."
              rows={3}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3.5 py-2 text-sm text-slate-900 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
            />
          </div>

          <div>
            <label className="block text-xs font-bold text-slate-700 uppercase tracking-wider mb-1">
              Team Leader *
            </label>
            <select
              value={leaderId}
              onChange={(e) => setLeaderId(e.target.value)}
              className="w-full bg-slate-50 border border-slate-200 rounded-xl px-3 py-2 text-xs font-semibold text-slate-800 focus:outline-none focus:ring-2 focus:ring-[#FF6B2C]"
              required
            >
              <option value="">Select Leader</option>
              {users.map((u) => (
                <option key={u._id} value={u._id}>
                  {u.fullName} ({u.role})
                </option>
              ))}
            </select>
          </div>

          <div className="pt-4 border-t border-slate-100 flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-xl text-xs font-semibold text-slate-600 hover:bg-slate-100 transition-colors"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="px-5 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white text-xs font-bold shadow-md shadow-[#FF6B2C]/20 transition-all disabled:opacity-50"
            >
              {isSubmitting ? 'Saving...' : initialTeam ? 'Update Team' : 'Create Team'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
