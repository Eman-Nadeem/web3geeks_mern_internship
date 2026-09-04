'use client';

import React from 'react';

export interface SidebarProps {
  user: {
    _id: string;
    fullName: string;
    email: string;
    role: string;
    avatarUrl?: string;
    orgName?: string;
  } | null;
  projects: Array<{ _id: string; name: string; status: string }>;
  selectedProjectId: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onNewProject: () => void;
  onLogout: () => void;
}

export default function Sidebar({
  user,
  projects,
  selectedProjectId,
  activeTab,
  onTabChange,
  onSelectProject,
  onNewProject,
  onLogout,
}: SidebarProps) {
  const activeProjectsCount = projects.filter((p) => p.status === 'ACTIVE').length;

  return (
    <aside className="w-64 bg-[#1E1F24] text-white flex flex-col h-screen fixed left-0 top-0 z-30 select-none border-r border-[#2E2F37]">
      {/* Brand & Organization Header */}
      <div className="p-6 flex items-center justify-between border-b border-[#2B2C34]">
        <div className="flex items-center gap-3">
          <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] flex items-center justify-center shadow-lg shadow-[#FF6B2C]/20">
            <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
            </svg>
          </div>
          <div>
            <h1 className="font-bold text-base tracking-tight text-white leading-none">
              {user?.orgName || 'MultiTenant SaaS'}
            </h1>
            <span className="text-[11px] text-[#9E9EA4] font-medium tracking-wide">
              {user?.role || 'Tenant Workspace'}
            </span>
          </div>
        </div>
      </div>

      {/* Main Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-4 py-5 sidebar-scroll space-y-6">
        <div>
          <p className="px-3 text-[11px] font-semibold text-[#6C6D76] uppercase tracking-wider mb-2">
            Menu
          </p>
          <nav className="space-y-1">
            <button
              onClick={() => onTabChange('overview')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'overview'
                  ? 'bg-[#282930] text-white shadow-sm'
                  : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                </svg>
                <span>Overview</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange('tasks')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'tasks'
                  ? 'bg-[#282930] text-white shadow-sm'
                  : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                </svg>
                <span>Tasks & Board</span>
              </div>
            </button>

            <button
              onClick={() => onTabChange('projects')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'projects'
                  ? 'bg-[#282930] text-white shadow-sm'
                  : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
                <span>Projects</span>
              </div>
              <span className="px-2 py-0.5 text-xs font-semibold rounded-full bg-[#FF6B2C]/10 text-[#FF6B2C]">
                {projects.length}
              </span>
            </button>

            <button
              onClick={() => onTabChange('teams')}
              className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                activeTab === 'teams'
                  ? 'bg-[#282930] text-white shadow-sm'
                  : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
              }`}
            >
              <div className="flex items-center gap-3">
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                </svg>
                <span>Teams</span>
              </div>
            </button>

            {(user?.role === 'SuperAdmin' || user?.role === 'OrgAdmin') && (
              <button
                onClick={() => onTabChange('activity')}
                className={`w-full flex items-center justify-between px-3 py-2.5 rounded-xl text-sm font-medium transition-all ${
                  activeTab === 'activity'
                    ? 'bg-[#282930] text-white shadow-sm'
                    : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                }`}
              >
                <div className="flex items-center gap-3">
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <span>Activity Log</span>
                </div>
              </button>
            )}
          </nav>
        </div>

        {/* Database Projects List */}
        <div>
          <div className="flex items-center justify-between px-3 mb-2">
            <p className="text-[11px] font-semibold text-[#6C6D76] uppercase tracking-wider">
              Active Projects
            </p>
            {user?.role !== 'TeamMember' && (
              <button
                onClick={onNewProject}
                title="Create Project"
                className="text-[#9E9EA4] hover:text-[#FF6B2C] transition-colors p-1 rounded-md hover:bg-[#282930]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            )}
          </div>

          <div className="space-y-1">
            <button
              onClick={() => onSelectProject(null)}
              className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all flex items-center gap-2 ${
                selectedProjectId === null
                  ? 'text-[#FF6B2C] bg-[#FF6B2C]/10 font-semibold'
                  : 'text-[#9E9EA4] hover:text-white hover:bg-[#26272E]'
              }`}
            >
              <span className="w-2 h-2 rounded-full bg-emerald-400"></span>
              <span>All Projects</span>
            </button>

            {projects.map((proj) => (
              <button
                key={proj._id}
                onClick={() => onSelectProject(proj._id)}
                className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all truncate flex items-center justify-between ${
                  selectedProjectId === proj._id
                    ? 'text-[#FF6B2C] bg-[#FF6B2C]/10 font-semibold'
                    : 'text-[#9E9EA4] hover:text-white hover:bg-[#26272E]'
                }`}
              >
                <span className="truncate">{proj.name}</span>
                <span className="text-[10px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#2B2C34] text-[#808189]">
                  {proj.status}
                </span>
              </button>
            ))}
          </div>
        </div>
      </div>

      {/* User Profile & Logout */}
      <div className="p-4 border-t border-[#2B2C34] bg-[#191A1E]">
        <div className="flex items-center justify-between">
          <div className="flex items-center gap-3 overflow-hidden">
            <div className="w-8 h-8 rounded-full bg-[#FF6B2C]/20 border border-[#FF6B2C]/40 text-[#FF6B2C] font-bold text-xs flex items-center justify-center shrink-0">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            <div className="truncate">
              <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'User'}</p>
              <p className="text-[11px] text-[#9E9EA4] truncate">{user?.email || 'user@domain.com'}</p>
            </div>
          </div>
          <button
            onClick={onLogout}
            title="Logout"
            className="text-[#9E9EA4] hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-[#282930] shrink-0"
          >
            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
            </svg>
          </button>
        </div>
      </div>
    </aside>
  );
}
