'use client';

import React, { useState } from 'react';
import { can } from '@/lib/permissions';

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
  teams?: Array<{ _id: string; name: string; memberIds?: any[] }>;
  users?: Array<{ _id: string; fullName: string; role?: string; status?: string }>;
  selectedProjectId: string | null;
  activeTab: string;
  onTabChange: (tab: string) => void;
  onSelectProject: (projectId: string | null) => void;
  onNewProject: () => void;
  onOpenProfile?: () => void;
  onLogout: () => void;
  isCollapsed?: boolean;
  onToggleCollapse?: () => void;
}

export default function Sidebar({
  user,
  projects,
  teams = [],
  users = [],
  selectedProjectId,
  activeTab,
  onTabChange,
  onSelectProject,
  onNewProject,
  onOpenProfile,
  onLogout,
  isCollapsed = false,
  onToggleCollapse,
}: SidebarProps) {
  const role = user?.role || '';
  const [isHovered, setIsHovered] = useState(false);

  // Expanded if either parent collapsed state is false, OR user is currently hovering over collapsed sidebar
  const expanded = !isCollapsed || isHovered;

  const handleTabClick = (tab: string) => {
    setIsHovered(false);
    onTabChange(tab);
  };

  const handleToggleClick = (e: React.MouseEvent) => {
    e.stopPropagation();
    setIsHovered(false);
    if (onToggleCollapse) onToggleCollapse();
  };

  return (
    <aside
      onMouseEnter={() => isCollapsed && setIsHovered(true)}
      onMouseLeave={() => isCollapsed && setIsHovered(false)}
      className={`${
        expanded ? 'w-64' : 'w-20'
      } bg-[#1E1F24] text-white flex flex-col h-screen fixed left-0 top-0 z-40 select-none border-r border-[#2E2F37] transition-all duration-300 shadow-2xl`}
    >
      {/* Brand & Organization Header */}
      <div className="p-4 flex items-center justify-between border-b border-[#2B2C34] h-16 overflow-hidden">
        {!expanded ? (
          /* Collapsed Header View (80px width - Brand Logo only) */
          <div
            className="w-full flex items-center justify-center cursor-pointer"
            onClick={handleToggleClick}
            title="Click to expand sidebar"
          >
            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2C]/20 hover:scale-105 transition-transform">
              <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
              </svg>
            </div>
          </div>
        ) : (
          /* Expanded Header View (256px width) */
          <>
            <div
              className="flex items-center gap-3 overflow-hidden cursor-pointer flex-1"
              onClick={onOpenProfile}
              title="View Profile"
            >
              <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] flex items-center justify-center shrink-0 shadow-lg shadow-[#FF6B2C]/20">
                <svg className="w-5 h-5 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                </svg>
              </div>
              <div className="truncate animate-in fade-in duration-200">
                <h1 className="font-bold text-sm tracking-tight text-white leading-none truncate">
                  {role === 'SuperAdmin' ? 'System Portal' : user?.orgName || 'MultiTenant SaaS'}
                </h1>
                <span className="text-[10px] text-[#9E9EA4] font-medium tracking-wide block mt-1">
                  {role || 'User'}
                </span>
              </div>
            </div>

            {onToggleCollapse && (
              <button
                onClick={handleToggleClick}
                title={isCollapsed ? 'Pin Expanded' : 'Collapse Sidebar'}
                className="text-[#9E9EA4] hover:text-white hover:bg-[#282930] p-1.5 rounded-lg transition-colors shrink-0"
              >
                {isCollapsed ? (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 5l7 7-7 7M5 5l7 7-7 7" />
                  </svg>
                ) : (
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11 19l-7-7 7-7m8 14l-7-7 7-7" />
                  </svg>
                )}
              </button>
            )}
          </>
        )}
      </div>

      {/* Navigation Menu */}
      <div className="flex-1 overflow-y-auto px-3 py-4 sidebar-scroll space-y-6">
        <div>
          {expanded && (
            <p className="px-3 text-[10px] font-bold text-[#6C6D76] uppercase tracking-wider mb-2">
              Menu
            </p>
          )}
          <nav className="space-y-1">
            {/* SUPERADMIN MENU */}
            {role === 'SuperAdmin' && (
              <>
                <button
                  onClick={() => handleTabClick('overview')}
                  title="Overview"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'overview'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Overview</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('organizations')}
                  title="Organizations"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'organizations'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5m3 0h1m-4-8h4m-4-4h4m6 4h2m-2-4h2" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Organizations</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('projects')}
                  title="Global Projects"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'projects'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Global Projects</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('tasks')}
                  title="Tasks & Board"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'tasks'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Tasks & Board</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('teams')}
                  title="Team Rosters"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'teams'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Team Rosters</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('audit-logs')}
                  title="Audit Logs"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'audit-logs'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 text-[#FF6B2C] shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Audit Logs</span>}
                  </div>
                </button>
              </>
            )}

            {/* ORG ADMIN MENU */}
            {role === 'OrgAdmin' && (
              <>
                <button
                  onClick={() => handleTabClick('dashboard')}
                  title="Dashboard"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Dashboard</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('tasks')}
                  title="Tasks & Board"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'tasks'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Tasks & Board</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('projects')}
                  title="Projects"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'projects'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Projects</span>}
                  </div>
                  {expanded && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#FF6B2C]/20 text-[#FF6B2C]">
                      {projects.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('teams')}
                  title="Teams"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'teams'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Teams</span>}
                  </div>
                  {expanded && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-800 text-slate-300">
                      {teams.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('users')}
                  title="Users & Invites"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'users'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4.354a4 4 0 110 5.292M15 21H3v-1a6 6 0 0112 0v1zm0 0h6v-1a6 6 0 00-9-5.197M13 7a4 4 0 11-8 0 4 4 0 018 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Users & Invites</span>}
                  </div>
                  {expanded && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-slate-800 text-slate-300">
                      {users.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('audit-logs')}
                  title="Audit Logs"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'audit-logs'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Audit Logs</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('settings')}
                  title="Org Settings"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'settings'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Org Settings</span>}
                  </div>
                </button>
              </>
            )}

            {/* PROJECT MANAGER MENU */}
            {role === 'ProjectManager' && (
              <>
                <button
                  onClick={() => handleTabClick('dashboard')}
                  title="Dashboard"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'dashboard'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2H6a2 2 0 01-2-2V6zM14 6a2 2 0 012-2h2a2 2 0 012 2v12a2 2 0 01-2 2h-2a2 2 0 01-2-2V6z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Dashboard</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('tasks')}
                  title="Tasks & Board"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'tasks'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Tasks & Board</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('projects')}
                  title="Projects"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'projects'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Projects</span>}
                  </div>
                  {expanded && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#FF6B2C]/20 text-[#FF6B2C]">
                      {projects.length}
                    </span>
                  )}
                </button>

                <button
                  onClick={() => handleTabClick('teams')}
                  title="Teams"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'teams'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.356-1.857M17 20H7m10 0v-2c0-.656-.126-1.283-.356-1.857M7 20H2v-2a3 3 0 015.356-1.857M7 20v-2c0-.656.126-1.283.356-1.857m0 0a5.002 5.002 0 019.288 0M15 7a3 3 0 11-6 0 3 3 0 016 0zm6 3a2 2 0 11-4 0 2 2 0 014 0zM7 10a2 2 0 11-4 0 2 2 0 014 0z" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Teams</span>}
                  </div>
                </button>
              </>
            )}

            {/* TEAM MEMBER MENU */}
            {role === 'TeamMember' && (
              <>
                <button
                  onClick={() => handleTabClick('my-tasks')}
                  title="My Tasks"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'my-tasks' || activeTab === 'tasks'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 5H7a2 2 0 00-2 2v12a2 2 0 002 2h10a2 2 0 002-2V7a2 2 0 00-2-2h-2M9 5a2 2 0 002 2h2a2 2 0 002-2M9 5a2 2 0 012-2h2a2 2 0 012 2" />
                    </svg>
                    {expanded && <span className="truncate text-xs">My Tasks</span>}
                  </div>
                </button>

                <button
                  onClick={() => handleTabClick('assigned-projects')}
                  title="Assigned Projects"
                  className={`w-full flex items-center ${expanded ? 'justify-between px-3' : 'justify-center px-0'} py-2.5 rounded-xl text-sm font-medium transition-all ${
                    activeTab === 'assigned-projects' || activeTab === 'projects'
                      ? 'bg-[#FF6B2C]/15 text-white border border-[#FF6B2C]/30 shadow-sm font-semibold'
                      : 'text-[#9E9EA4] hover:bg-[#26272E] hover:text-white'
                  }`}
                >
                  <div className="flex items-center gap-3">
                    <svg className="w-5 h-5 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
                    </svg>
                    {expanded && <span className="truncate text-xs">Assigned Projects</span>}
                  </div>
                  {expanded && (
                    <span className="px-2 py-0.5 text-[10px] font-semibold rounded-full bg-[#FF6B2C]/20 text-[#FF6B2C]">
                      {projects.length}
                    </span>
                  )}
                </button>
              </>
            )}
          </nav>
        </div>

        {/* ACTIVE PROJECTS LIST (OrgAdmin & ProjectManager ONLY) */}
        {expanded && can(role, 'CREATE_PROJECT') && (
          <div className="animate-in fade-in duration-150">
            <div className="flex items-center justify-between px-3 mb-2">
              <p className="text-[10px] font-bold text-[#6C6D76] uppercase tracking-wider">
                Active Projects
              </p>
              <button
                onClick={onNewProject}
                title="Create Project"
                className="text-[#9E9EA4] hover:text-[#FF6B2C] transition-colors p-1 rounded-md hover:bg-[#282930]"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                </svg>
              </button>
            </div>

            <div className="space-y-1">
              <button
                onClick={() => {
                  setIsHovered(false);
                  onSelectProject(null);
                }}
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
                  onClick={() => {
                    setIsHovered(false);
                    onSelectProject(proj._id);
                  }}
                  className={`w-full text-left px-3 py-2 rounded-lg text-xs font-medium transition-all truncate flex items-center justify-between ${
                    selectedProjectId === proj._id
                      ? 'text-[#FF6B2C] bg-[#FF6B2C]/10 font-semibold'
                      : 'text-[#9E9EA4] hover:text-white hover:bg-[#26272E]'
                  }`}
                >
                  <span className="truncate">{proj.name}</span>
                  <span className="text-[9px] uppercase font-mono px-1.5 py-0.5 rounded bg-[#2B2C34] text-[#808189]">
                    {proj.status}
                  </span>
                </button>
              ))}
            </div>
          </div>
        )}

        {/* TEAM ROSTER BLOCK (OrgAdmin & ProjectManager ONLY per design1.webp) */}
        {expanded && can(role, 'MANAGE_TEAMS') && users.length > 0 && (
          <div className="animate-in fade-in duration-150">
            <p className="px-3 text-[10px] font-bold text-[#6C6D76] uppercase tracking-wider mb-2">
              Team Roster
            </p>
            <div className="space-y-1.5 px-1">
              {users.slice(0, 5).map((u) => (
                <div key={u._id} className="flex items-center gap-2.5 px-2 py-1.5 rounded-lg hover:bg-[#26272E] text-xs">
                  <div className="w-6 h-6 rounded-full bg-[#FF6B2C]/20 border border-[#FF6B2C]/40 text-[#FF6B2C] font-bold text-[10px] flex items-center justify-center shrink-0">
                    {u.fullName.charAt(0).toUpperCase()}
                  </div>
                  <div className="truncate flex-1">
                    <p className="font-medium text-slate-200 truncate">{u.fullName}</p>
                    <p className="text-[10px] text-[#9E9EA4] truncate">{u.role || 'Member'}</p>
                  </div>
                  <span className="w-1.5 h-1.5 rounded-full bg-emerald-400 shrink-0"></span>
                </div>
              ))}
            </div>
          </div>
        )}
      </div>

      {/* User Profile Footer */}
      <div className="p-3 border-t border-[#2B2C34] bg-[#191A1E]">
        <div className={`flex items-center ${expanded ? 'justify-between' : 'justify-center'}`}>
          <div
            onClick={onOpenProfile}
            className="flex items-center gap-3 overflow-hidden cursor-pointer hover:opacity-80 transition-opacity"
            title="Edit My Profile & View Organization Details"
          >
            <div className="w-8 h-8 rounded-full bg-[#FF6B2C]/20 border border-[#FF6B2C]/40 text-[#FF6B2C] font-bold text-xs flex items-center justify-center shrink-0">
              {user?.fullName?.charAt(0).toUpperCase() || 'U'}
            </div>
            {expanded && (
              <div className="truncate">
                <p className="text-xs font-semibold text-white truncate">{user?.fullName || 'User'}</p>
                <p className="text-[10px] text-[#9E9EA4] truncate">{user?.email || 'user@domain.com'}</p>
              </div>
            )}
          </div>
          {expanded && (
            <button
              onClick={onLogout}
              title="Logout"
              className="text-[#9E9EA4] hover:text-rose-400 transition-colors p-1.5 rounded-lg hover:bg-[#282930] shrink-0"
            >
              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
              </svg>
            </button>
          )}
        </div>
      </div>
    </aside>
  );
}
