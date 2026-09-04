'use client';

import React from 'react';

export interface TopHeaderProps {
  title: string;
  viewMode: 'board' | 'list';
  userRole?: string;
  showViewToggle?: boolean;
  onViewModeChange: (mode: 'board' | 'list') => void;
  onOpenNewTaskModal: () => void;
  onOpenNewProjectModal: () => void;
  unreadNotificationsCount: number;
  onToggleNotifications: () => void;
}

export default function TopHeader({
  title,
  viewMode,
  userRole,
  showViewToggle = true,
  onViewModeChange,
  onOpenNewTaskModal,
  onOpenNewProjectModal,
  unreadNotificationsCount,
  onToggleNotifications,
}: TopHeaderProps) {
  const canCreateProject = userRole === 'SuperAdmin' || userRole === 'OrgAdmin' || userRole === 'ProjectManager';
  const canCreateTask = userRole === 'OrgAdmin' || userRole === 'ProjectManager';

  return (
    <header className="bg-white border-b border-slate-200/80 px-8 py-4 flex items-center justify-between sticky top-0 z-20 shadow-xs">
      <div className="flex items-center gap-6">
        <h1 className="text-2xl font-extrabold text-slate-900 tracking-tight">
          {title}
        </h1>

        {/* View Mode Toggle Pills (shown on tasks view) */}
        {showViewToggle && (
          <div className="flex items-center bg-slate-100 p-1 rounded-xl border border-slate-200">
            <button
              onClick={() => onViewModeChange('board')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                viewMode === 'board'
                  ? 'bg-[#1E1F24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
              </svg>
              <span>Board</span>
            </button>

            <button
              onClick={() => onViewModeChange('list')}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-semibold flex items-center gap-2 transition-all ${
                viewMode === 'list'
                  ? 'bg-[#1E1F24] text-white shadow-sm'
                  : 'text-slate-600 hover:text-slate-900 hover:bg-slate-200/60'
              }`}
            >
              <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6h16M4 10h16M4 14h16M4 18h16" />
              </svg>
              <span>List</span>
            </button>
          </div>
        )}
      </div>

      {/* Action Buttons (Restricted by RBAC Role) */}
      <div className="flex items-center gap-3">
        <button
          onClick={onToggleNotifications}
          className="relative p-2.5 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-600 hover:text-slate-900 transition-colors border border-slate-200"
          title="Notifications"
        >
          <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 17h5l-1.405-1.405A2.032 2.032 0 0118 14.158V11a6.002 6.002 0 00-4-5.659V5a2 2 0 10-4 0v.341C7.67 6.165 6 8.388 6 11v3.159c0 .538-.214 1.055-.595 1.436L4 17h5m6 0v1a3 3 0 11-6 0v-1m6 0H9" />
          </svg>
          {unreadNotificationsCount > 0 && (
            <span className="absolute -top-1 -right-1 w-4 h-4 bg-rose-500 text-white text-[10px] font-bold rounded-full flex items-center justify-center border-2 border-white">
              {unreadNotificationsCount}
            </span>
          )}
        </button>

        {canCreateProject && (
          <button
            onClick={onOpenNewProjectModal}
            className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-800 font-semibold text-xs transition-all border border-slate-200 flex items-center gap-1.5"
          >
            <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Project</span>
          </button>
        )}

        {canCreateTask && (
          <button
            onClick={onOpenNewTaskModal}
            className="px-4 py-2 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs shadow-md shadow-[#FF6B2C]/20 transition-all flex items-center gap-1.5 transform active:scale-95"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
            </svg>
            <span>Create Task</span>
          </button>
        )}
      </div>
    </header>
  );
}
