'use client';

import React, { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Sidebar from '@/components/Sidebar';
import TopHeader from '@/components/TopHeader';
import FilterBar from '@/components/FilterBar';
import KanbanBoard from '@/components/KanbanBoard';
import TaskModal from '@/components/TaskModal';
import ProjectModal from '@/components/ProjectModal';
import TeamModal from '@/components/TeamModal';
import ActivityLogDrawer from '@/components/ActivityLogDrawer';
import NotificationPopover from '@/components/NotificationPopover';
import OrganizationsView, { OrganizationItem } from '@/components/OrganizationsView';
import AuditLogsView, { AuditLogItem } from '@/components/AuditLogsView';
import ProfileModal from '@/components/ProfileModal';
import OrgDetailModal from '@/components/OrgDetailModal';
import ProjectDetailModal from '@/components/ProjectDetailModal';
import TaskDetailModal from '@/components/TaskDetailModal';
import TeamDetailModal from '@/components/TeamDetailModal';
import UsersView from '@/components/UsersView';
import OrgSettingsView from '@/components/OrgSettingsView';
import { can } from '@/lib/permissions';

export default function DashboardPage() {
  const router = useRouter();

  // Core App State
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [organizations, setOrganizations] = useState<OrganizationItem[]>([]);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<AuditLogItem[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);
  const [unreadNotificationsCount, setUnreadNotificationsCount] = useState(0);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

  // Sidebar Collapsible State
  const [isSidebarCollapsed, setIsSidebarCollapsed] = useState(false);

  // Detail View Modals
  const [viewingOrgDetail, setViewingOrgDetail] = useState<any | null>(null);
  const [viewingProjectDetail, setViewingProjectDetail] = useState<any | null>(null);
  const [viewingTaskDetail, setViewingTaskDetail] = useState<any | null>(null);
  const [viewingTeamDetail, setViewingTeamDetail] = useState<any | null>(null);

  // Filter State
  const [searchQuery, setSearchQuery] = useState('');
  const [statusFilter, setStatusFilter] = useState('');
  const [priorityFilter, setPriorityFilter] = useState('');
  const [assigneeFilter, setAssigneeFilter] = useState('');
  const [isMyTasksOnly, setIsMyTasksOnly] = useState(false);

  // Modal Controls
  const [isTaskModalOpen, setIsTaskModalOpen] = useState(false);
  const [taskModalDefaultStatus, setTaskModalDefaultStatus] = useState('TO_DO');
  const [editingTask, setEditingTask] = useState<any | null>(null);

  const [isProjectModalOpen, setIsProjectModalOpen] = useState(false);
  const [editingProject, setEditingProject] = useState<any | null>(null);

  const [isTeamModalOpen, setIsTeamModalOpen] = useState(false);
  const [editingTeam, setEditingTeam] = useState<any | null>(null);

  const [isActivityDrawerOpen, setIsActivityDrawerOpen] = useState(false);
  const [isNotificationPopoverOpen, setIsNotificationPopoverOpen] = useState(false);
  const [isProfileModalOpen, setIsProfileModalOpen] = useState(false);

  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<{ [teamId: string]: string }>({});

  const userRole = currentUser?.role || '';

  // Fetch Session & Data
  const fetchData = useCallback(async () => {
    try {
      setIsLoading(true);

      // 1. Auth Session (/api/auth/me)
      const meRes = await fetch('/api/auth/me');
      if (!meRes.ok) {
        router.push('/login');
        return;
      }
      const meData = await meRes.json();
      const meUser = meData.user;
      setCurrentUser(meUser);

      const role = meUser.role;

      // 2. Fetch Projects (/api/projects)
      if (can(role, 'VIEW_PROJECTS')) {
        const projectsRes = await fetch('/api/projects');
        if (projectsRes.ok) {
          const pData = await projectsRes.json();
          setProjects(pData.projects || []);
        }
      }

      // 3. Fetch Tasks (/api/tasks)
      if (can(role, 'VIEW_TASKS_BOARD')) {
        const tasksRes = await fetch('/api/tasks');
        if (tasksRes.ok) {
          const tData = await tasksRes.json();
          setTasks(tData.tasks || []);
        }
      }

      // 4. Fetch Teams (/api/teams)
      if (can(role, 'VIEW_TEAMS')) {
        const teamsRes = await fetch('/api/teams');
        if (teamsRes.ok) {
          const tmData = await teamsRes.json();
          setTeams(tmData.teams || []);
        }
      }

      // 5. Fetch Users (/api/users)
      if (can(role, 'MANAGE_USERS') || can(role, 'MANAGE_TEAMS') || role === 'SuperAdmin') {
        const usersRes = await fetch('/api/users');
        if (usersRes.ok) {
          const uData = await usersRes.json();
          setUsers(uData.users || []);
        }
      }

      // 6. Fetch Organizations (SuperAdmin ONLY)
      if (role === 'SuperAdmin') {
        const orgsRes = await fetch('/api/organizations');
        if (orgsRes.ok) {
          const oData = await orgsRes.json();
          setOrganizations(oData.organizations || []);
        }
      }

      // 7. Fetch Audit Logs (SuperAdmin / OrgAdmin)
      if (role === 'SuperAdmin' || role === 'OrgAdmin') {
        const logsRes = await fetch('/api/audit-logs');
        if (logsRes.ok) {
          const lData = await logsRes.json();
          setLogs(lData.logs || []);
        }
      }

      // 8. Fetch Notifications (All User Roles)
      const notifRes = await fetch('/api/notifications');
      if (notifRes.ok) {
        const nData = await notifRes.json();
        setNotifications(nData.notifications || []);
        setUnreadNotificationsCount(nData.unreadCount || 0);
      }
    } catch (error) {
      console.error('Error fetching dashboard data:', error);
    } finally {
      setIsLoading(false);
    }
  }, [router]);

  useEffect(() => {
    fetchData();
  }, [fetchData]);

  // Adjust activeTab when currentUser is set to prevent SuperAdmin landing on wrong screen
  useEffect(() => {
    if (!currentUser) return;
    const role = currentUser.role;

    if (role === 'SuperAdmin' && !['overview', 'organizations', 'projects', 'tasks', 'teams', 'audit-logs'].includes(activeTab)) {
      setActiveTab('overview');
    } else if (role === 'OrgAdmin' && !['dashboard', 'tasks', 'projects', 'teams', 'users', 'audit-logs', 'settings'].includes(activeTab)) {
      setActiveTab('dashboard');
    } else if (role === 'ProjectManager' && !['dashboard', 'tasks', 'projects', 'teams'].includes(activeTab)) {
      setActiveTab('dashboard');
    } else if (role === 'TeamMember' && !['my-tasks', 'assigned-projects', 'tasks', 'projects'].includes(activeTab)) {
      setActiveTab('my-tasks');
    }
  }, [currentUser, activeTab]);

  // Logout Handler
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {}
    router.push('/login');
  };

  // Mark notification read
  const handleMarkNotificationRead = async (notifId: string) => {
    try {
      await fetch('/api/notifications', {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ notificationId: notifId }),
      });
      setNotifications((prev) =>
        prev.map((n) => (n._id === notifId ? { ...n, isRead: true } : n))
      );
      setUnreadNotificationsCount((prev) => Math.max(0, prev - 1));
    } catch (e) {
      console.error('Failed to mark notification read:', e);
    }
  };

  // -------------------------------------------------------------
  // TASK CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleTaskStatusChange = async (taskId: string, newStatus: string) => {
    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ status: newStatus }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Status update failed: ${err.message || 'Permission denied'}`);
        return;
      }

      setTasks((prev) =>
        prev.map((t) => (t._id === taskId ? { ...t, status: newStatus } : t))
      );
    } catch (error: any) {
      alert(`Status update error: ${error.message}`);
    }
  };

  const handleSaveTask = async (taskData: any) => {
    const isEdit = !!taskData._id;
    const url = isEdit ? `/api/tasks/${taskData._id}` : '/api/tasks';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(taskData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save task');
    }

    setIsTaskModalOpen(false);
    setEditingTask(null);
    fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;
    try {
      const res = await fetch(`/api/tasks/${taskId}`, { method: 'DELETE' });
      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }
      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (error: any) {
      alert(`Delete task error: ${error.message}`);
    }
  };

  // -------------------------------------------------------------
  // PROJECT CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleSaveProject = async (projectData: any) => {
    const isEdit = !!projectData._id;
    const url = isEdit ? `/api/projects/${projectData._id}` : '/api/projects';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(projectData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save project');
    }

    setIsProjectModalOpen(false);
    setEditingProject(null);
    fetchData();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;
    try {
      let res = await fetch(`/api/projects/${projectId}`, { method: 'DELETE' });
      if (res.status === 400) {
        const data = await res.json();
        if (confirm(`${data.message}\nDo you want to force delete it along with all active tasks?`)) {
          res = await fetch(`/api/projects/${projectId}?force=true`, { method: 'DELETE' });
        } else {
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }

      setProjects((prev) => prev.filter((p) => p._id !== projectId));
      if (selectedProjectId === projectId) setSelectedProjectId(null);
    } catch (error: any) {
      alert(`Delete project error: ${error.message}`);
    }
  };

  // -------------------------------------------------------------
  // TEAM CRUD OPERATIONS
  // -------------------------------------------------------------
  const handleSaveTeam = async (teamData: any) => {
    const isEdit = !!teamData._id;
    const url = isEdit ? `/api/teams/${teamData._id}` : '/api/teams';
    const method = isEdit ? 'PATCH' : 'POST';

    const res = await fetch(url, {
      method,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(teamData),
    });

    if (!res.ok) {
      const err = await res.json();
      throw new Error(err.message || 'Failed to save team');
    }

    setIsTeamModalOpen(false);
    setEditingTeam(null);
    fetchData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;
    try {
      let res = await fetch(`/api/teams/${teamId}`, { method: 'DELETE' });
      if (res.status === 400) {
        const data = await res.json();
        if (confirm(`${data.message}\nDo you want to force delete this team?`)) {
          res = await fetch(`/api/teams/${teamId}?force=true`, { method: 'DELETE' });
        } else {
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }

      setTeams((prev) => prev.filter((t) => t._id !== teamId));
    } catch (error: any) {
      alert(`Delete team error: ${error.message}`);
    }
  };

  const handleAddTeamMember = async (teamId: string) => {
    const memberId = selectedMemberToAdd[teamId];
    if (!memberId) return;

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ memberId }),
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to add member: ${err.message || 'Error occurred'}`);
        return;
      }

      setSelectedMemberToAdd((prev) => ({ ...prev, [teamId]: '' }));
      fetchData();
    } catch (error: any) {
      alert(`Add member error: ${error.message}`);
    }
  };

  const handleRemoveTeamMember = async (teamId: string, memberId: string) => {
    if (!confirm('Remove member from this team?')) return;
    try {
      const res = await fetch(`/api/teams/${teamId}/members?memberId=${memberId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Failed to remove member: ${err.message || 'Error occurred'}`);
        return;
      }

      fetchData();
    } catch (error: any) {
      alert(`Remove member error: ${error.message}`);
    }
  };

  // -------------------------------------------------------------
  // FILTERING LOGIC
  // -------------------------------------------------------------
  const filteredTasks = tasks.filter((t) => {
    // Project filter
    if (selectedProjectId && t.projectId) {
      const pId = typeof t.projectId === 'object' ? t.projectId._id : t.projectId;
      if (pId !== selectedProjectId) return false;
    }
    // Search query
    if (searchQuery) {
      const q = searchQuery.toLowerCase();
      const matchTitle = t.title.toLowerCase().includes(q);
      const matchDesc = t.description?.toLowerCase().includes(q) || false;
      if (!matchTitle && !matchDesc) return false;
    }
    // Status filter
    if (statusFilter && t.status !== statusFilter) return false;
    // Priority filter
    if (priorityFilter && t.priority !== priorityFilter) return false;
    // Assignee filter
    if (assigneeFilter) {
      const aId = typeof t.assigneeId === 'object' ? t.assigneeId?._id : t.assigneeId;
      if (aId !== assigneeFilter) return false;
    }
    // My tasks toggle
    if ((isMyTasksOnly || activeTab === 'my-tasks') && currentUser) {
      const aId = typeof t.assigneeId === 'object' ? t.assigneeId?._id : t.assigneeId;
      if (aId !== currentUser.userId && aId !== currentUser._id) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="h-screen w-screen bg-[#F4F5F8] flex flex-col items-center justify-center space-y-4">
        <div className="w-12 h-12 rounded-2xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] animate-pulse flex items-center justify-center shadow-lg shadow-[#FF6B2C]/20">
          <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M19 11H5m14 0a2 2 0 012 2v6a2 2 0 01-2 2H5a2 2 0 01-2-2v-6a2 2 0 012-2m14 0V9a2 2 0 00-2-2M5 11V9a2 2 0 012-2m0 0V5a2 2 0 012-2h6a2 2 0 012 2v2M7 7h10" />
          </svg>
        </div>
        <p className="text-xs font-bold text-slate-500 tracking-wider uppercase">Loading Workspace...</p>
      </div>
    );
  }

  // Page Header Title
  const getHeaderTitle = () => {
    if (userRole === 'SuperAdmin') {
      if (activeTab === 'organizations') return 'Organizations Management';
      if (activeTab === 'projects') return 'Global Projects';
      if (activeTab === 'tasks') return 'Tasks & Board';
      if (activeTab === 'teams') return 'Team Rosters';
      if (activeTab === 'audit-logs') return 'Platform Audit Logs';
      return 'SuperAdmin Overview';
    }
    if (activeTab === 'dashboard') return 'Executive Overview';
    if (activeTab === 'tasks' || activeTab === 'my-tasks') return 'Tasks & Kanban Board';
    if (activeTab === 'projects' || activeTab === 'assigned-projects') return 'Project Directory';
    if (activeTab === 'teams') return 'Team Roster';
    if (activeTab === 'users') return 'User Access & Invites';
    if (activeTab === 'audit-logs') return 'Audit Log Trail';
    return 'Workspace Dashboard';
  };

  return (
    <div className="flex h-screen bg-[#F4F5F8] overflow-hidden select-none font-sans">
      {/* Sidebar Navigation */}
      <Sidebar
        user={currentUser}
        projects={projects}
        teams={teams}
        users={users}
        selectedProjectId={selectedProjectId}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          setSelectedProjectId(null);
        }}
        onSelectProject={(pId) => {
          setSelectedProjectId(pId);
          setActiveTab('tasks');
        }}
        onNewProject={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
        onOpenProfile={() => setIsProfileModalOpen(true)}
        onLogout={handleLogout}
        isCollapsed={isSidebarCollapsed}
        onToggleCollapse={() => setIsSidebarCollapsed(!isSidebarCollapsed)}
      />

      {/* Main Content Area */}
      <div
        className={`flex-1 flex flex-col ${
          isSidebarCollapsed ? 'pl-20' : 'pl-64'
        } min-w-0 h-screen overflow-hidden transition-all duration-300`}
      >
        {/* Sticky Top Header */}
        <TopHeader
          title={getHeaderTitle()}
          viewMode={viewMode}
          userRole={userRole}
          showViewToggle={['tasks', 'my-tasks'].includes(activeTab)}
          showActionButtons={['tasks', 'my-tasks', 'projects', 'assigned-projects', 'dashboard', 'overview'].includes(activeTab)}
          onViewModeChange={setViewMode}
          onOpenNewTaskModal={() => {
            setTaskModalDefaultStatus('TO_DO');
            setEditingTask(null);
            setIsTaskModalOpen(true);
          }}
          onOpenNewProjectModal={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          unreadNotificationsCount={unreadNotificationsCount}
          onToggleNotifications={() => setIsNotificationPopoverOpen(!isNotificationPopoverOpen)}
        />

        {/* Notifications Popover */}
        <NotificationPopover
          isOpen={isNotificationPopoverOpen}
          onClose={() => setIsNotificationPopoverOpen(false)}
          notifications={notifications}
          onMarkAsRead={handleMarkNotificationRead}
        />

        {/* Filter Bar (Tasks view only) */}
        {['tasks', 'my-tasks'].includes(activeTab) && (
          <FilterBar
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            priorityFilter={priorityFilter}
            onPriorityFilterChange={setPriorityFilter}
            assigneeFilter={assigneeFilter}
            onAssigneeFilterChange={setAssigneeFilter}
            isMyTasksOnly={isMyTasksOnly}
            onToggleMyTasks={() => setIsMyTasksOnly(!isMyTasksOnly)}
            users={users}
            userRole={userRole}
          />
        )}

        {/* Main Body Content Scroll View */}
        <main className="flex-1 overflow-y-auto w-full min-w-0">
          
          {/* ========================================================================= */}
          {/* 1. SUPERADMIN OVERVIEW (Platform Analytics)                                */}
          {/* ========================================================================= */}
          {userRole === 'SuperAdmin' && activeTab === 'overview' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 bg-purple-100 text-purple-800 font-bold text-xs rounded-full">
                    Platform Super Admin
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">Platform Global Analytics</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total Tenants</p>
                  <p className="text-3xl font-extrabold text-purple-600">{organizations.length || 2}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Users</p>
                  <p className="text-3xl font-extrabold text-slate-900">{users.length || 8}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Projects</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{projects.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Audit Log Entries</p>
                  <p className="text-3xl font-extrabold text-[#FF6B2C]">{logs.length}</p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <div className="flex items-center justify-between">
                  <h3 className="text-sm font-bold text-slate-900">Tenant Organizations Roster</h3>
                  <button
                    onClick={() => setActiveTab('organizations')}
                    className="text-xs font-semibold text-[#FF6B2C] hover:underline"
                  >
                    Manage Organizations →
                  </button>
                </div>
                <div className="overflow-x-auto">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                      <tr>
                        <th className="px-4 py-3">Organization Name</th>
                        <th className="px-4 py-3">Slug</th>
                        <th className="px-4 py-3">Subscription Plan</th>
                        <th className="px-4 py-3">Status</th>
                        <th className="px-4 py-3 text-right">Details</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {organizations.map((org) => (
                        <tr key={org._id} className="hover:bg-slate-50 transition-colors">
                          <td className="px-4 py-3 font-bold text-slate-900">{org.name}</td>
                          <td className="px-4 py-3 font-mono text-slate-500">{org.slug}</td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">
                              {org.plan}
                            </span>
                          </td>
                          <td className="px-4 py-3">
                            <span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">
                              {org.status}
                            </span>
                          </td>
                          <td className="px-4 py-3 text-right">
                            <button
                              onClick={() => setViewingOrgDetail(org)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors"
                            >
                              View Details →
                            </button>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. SUPERADMIN ORGANIZATIONS CRUD VIEW                                      */}
          {/* ========================================================================= */}
          {userRole === 'SuperAdmin' && activeTab === 'organizations' && (
            <OrganizationsView
              organizations={organizations}
              users={users}
              onRefresh={fetchData}
              onSelectOrgDetail={(org) => setViewingOrgDetail(org)}
            />
          )}

          {/* ========================================================================= */}
          {/* 3. AUDIT LOGS VIEW (SuperAdmin & OrgAdmin)                                 */}
          {/* ========================================================================= */}
          {activeTab === 'audit-logs' && (userRole === 'SuperAdmin' || userRole === 'OrgAdmin') && (
            <AuditLogsView logs={logs} userRole={userRole} />
          )}

          {/* ========================================================================= */}
          {/* 4. ORG ADMIN DASHBOARD                                                     */}
          {/* ========================================================================= */}
          {userRole === 'OrgAdmin' && activeTab === 'dashboard' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full">
                    Organization Admin
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">Executive Tenant Overview</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Projects</p>
                  <p className="text-3xl font-extrabold text-slate-900">{projects.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Tenant Tasks</p>
                  <p className="text-3xl font-extrabold text-[#FF6B2C]">{tasks.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Teams</p>
                  <p className="text-3xl font-extrabold text-emerald-600">{teams.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Org Members</p>
                  <p className="text-3xl font-extrabold text-purple-600">{users.length}</p>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Active Projects Summary</h3>
                    <button onClick={() => setActiveTab('projects')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                      View All →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100">
                    {projects.slice(0, 5).map((p) => (
                      <div key={p._id} className="py-3 flex items-center justify-between">
                        <div>
                          <p className="text-xs font-bold text-slate-900">{p.name}</p>
                          <p className="text-[11px] text-slate-500">Status: {p.status}</p>
                        </div>
                        <span className="text-[10px] font-bold px-2 py-0.5 rounded bg-slate-100 text-slate-600">
                          {p.status}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>

                <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                  <div className="flex items-center justify-between">
                    <h3 className="text-sm font-bold text-slate-900">Recent Audit Logs</h3>
                    <button onClick={() => setActiveTab('audit-logs')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                      View Audit Log →
                    </button>
                  </div>
                  <div className="divide-y divide-slate-100 text-xs">
                    {logs.slice(0, 5).map((l) => (
                      <div key={l._id} className="py-2.5 flex items-center justify-between">
                        <div>
                          <p className="font-bold text-slate-900">{l.action}</p>
                          <p className="text-[10px] text-slate-400">{new Date(l.timestamp).toLocaleTimeString()}</p>
                        </div>
                        <span className="text-[10px] font-mono bg-slate-100 px-2 py-0.5 rounded">
                          {l.entityType}
                        </span>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. PROJECT MANAGER DASHBOARD                                               */}
          {/* ========================================================================= */}
          {userRole === 'ProjectManager' && activeTab === 'dashboard' && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                    Project Manager
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">Projects & Deadline Progress</h2>
                </div>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Managed Projects</p>
                  <p className="text-3xl font-extrabold text-slate-900">{projects.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Active Tasks</p>
                  <p className="text-3xl font-extrabold text-[#FF6B2C]">{tasks.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urgent Tasks</p>
                  <p className="text-3xl font-extrabold text-rose-600">
                    {tasks.filter((t) => t.priority === 'URGENT').length}
                  </p>
                </div>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Project Execution Kanban Breakdown</h3>
                <div className="grid grid-cols-1 sm:grid-cols-4 gap-4 pt-2">
                  <div className="p-4 bg-slate-50 rounded-xl border border-slate-200">
                    <p className="text-xs font-bold text-slate-500 uppercase">To Do</p>
                    <p className="text-xl font-extrabold text-slate-900 mt-1">
                      {tasks.filter((t) => t.status === 'TO_DO').length}
                    </p>
                  </div>
                  <div className="p-4 bg-amber-50 rounded-xl border border-amber-200">
                    <p className="text-xs font-bold text-amber-700 uppercase">In Progress</p>
                    <p className="text-xl font-extrabold text-amber-700 mt-1">
                      {tasks.filter((t) => t.status === 'IN_PROGRESS').length}
                    </p>
                  </div>
                  <div className="p-4 bg-sky-50 rounded-xl border border-sky-200">
                    <p className="text-xs font-bold text-sky-700 uppercase">In Review</p>
                    <p className="text-xl font-extrabold text-sky-700 mt-1">
                      {tasks.filter((t) => t.status === 'UNDER_REVIEW').length}
                    </p>
                  </div>
                  <div className="p-4 bg-emerald-50 rounded-xl border border-emerald-200">
                    <p className="text-xs font-bold text-emerald-700 uppercase">Completed</p>
                    <p className="text-xl font-extrabold text-emerald-700 mt-1">
                      {tasks.filter((t) => t.status === 'COMPLETED').length}
                    </p>
                  </div>
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 6. TEAM MEMBER DASHBOARD ("My Tasks")                                     */}
          {/* ========================================================================= */}
          {userRole === 'TeamMember' && (activeTab === 'dashboard' || activeTab === 'my-tasks') && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <span className="px-3 py-1 bg-emerald-100 text-emerald-800 font-bold text-xs rounded-full">
                    Team Member Contributor
                  </span>
                  <h2 className="text-xl font-extrabold text-slate-900 mt-2">My Assigned Tasks & Work</h2>
                </div>
                <button
                  onClick={() => setActiveTab('tasks')}
                  className="px-4 py-2 rounded-xl bg-slate-100 hover:bg-slate-200 text-slate-700 text-xs font-bold border border-slate-200"
                >
                  Open Kanban Board →
                </button>
              </div>

              <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned Tasks</p>
                  <p className="text-3xl font-extrabold text-slate-900">{filteredTasks.length}</p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-amber-600 uppercase tracking-wider">In Progress</p>
                  <p className="text-3xl font-extrabold text-amber-600">
                    {filteredTasks.filter((t) => t.status === 'IN_PROGRESS').length}
                  </p>
                </div>
                <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                  <p className="text-xs font-bold text-emerald-600 uppercase tracking-wider">Completed</p>
                  <p className="text-3xl font-extrabold text-emerald-600">
                    {filteredTasks.filter((t) => t.status === 'COMPLETED').length}
                  </p>
                </div>
              </div>

              {/* My Assigned Tasks List */}
              <div className="bg-white rounded-2xl border border-slate-200/90 shadow-xs p-6 space-y-4">
                <h3 className="text-sm font-bold text-slate-900">Tasks Assigned Direct To Me</h3>
                <div className="divide-y divide-slate-100">
                  {filteredTasks.length === 0 ? (
                    <p className="py-6 text-center text-xs text-slate-400">No tasks currently assigned to you.</p>
                  ) : (
                    filteredTasks.map((t) => (
                      <div key={t._id} className="py-3.5 flex items-center justify-between gap-4">
                        <div>
                          <button
                            onClick={() => setViewingTaskDetail(t)}
                            className="font-bold text-slate-900 text-sm hover:text-[#FF6B2C] hover:underline text-left"
                          >
                            {t.title}
                          </button>
                          {t.description && <p className="text-xs text-slate-500 mt-0.5 line-clamp-1">{t.description}</p>}
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <button
                            onClick={() => setViewingTaskDetail(t)}
                            className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 text-[10px] font-bold"
                          >
                            Details →
                          </button>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600">
                            {t.priority}
                          </span>
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-emerald-100 text-emerald-800">
                            {t.status}
                          </span>
                        </div>
                      </div>
                    ))
                  )}
                </div>
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 7. TASKS & KANBAN BOARD VIEW                                               */}
          {/* ========================================================================= */}
          {activeTab === 'tasks' && can(userRole, 'VIEW_TASKS_BOARD') && (
            <KanbanBoard
              tasks={filteredTasks}
              users={users}
              projects={projects}
              userRole={userRole}
              currentUserId={currentUser?.userId || currentUser?._id}
              viewMode={viewMode}
              onStatusChange={handleTaskStatusChange}
              onEditTask={(task) => {
                setEditingTask(task);
                setIsTaskModalOpen(true);
              }}
              onDeleteTask={handleDeleteTask}
              onOpenNewTaskModal={(status) => {
                setTaskModalDefaultStatus(status || 'TO_DO');
                setEditingTask(null);
                setIsTaskModalOpen(true);
              }}
              onSelectTaskDetail={(task) => setViewingTaskDetail(task)}
            />
          )}

          {/* ========================================================================= */}
          {/* 8. PROJECTS VIEW                                                           */}
          {/* ========================================================================= */}
          {(activeTab === 'projects' || activeTab === 'assigned-projects') && can(userRole, 'VIEW_PROJECTS') && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {userRole === 'SuperAdmin' ? 'Global Projects' : 'Organization Projects'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {userRole === 'SuperAdmin'
                      ? 'Platform-wide, read-only view of every project across all tenant organizations.'
                      : 'Manage and track your active project portfolio.'}
                  </p>
                </div>
                {can(userRole, 'CREATE_PROJECT') && (
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs shadow-md shadow-[#FF6B2C]/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>+ New Project</span>
                  </button>
                )}
              </div>

              {/* SuperAdmin Organization-Grouped Projects View */}
              {userRole === 'SuperAdmin' ? (
                <div className="space-y-6">
                  {organizations.map((org) => {
                    const orgProjects = projects.filter((p) => {
                      const pOrgId = typeof p.orgId === 'object' ? p.orgId?._id : p.orgId;
                      return String(pOrgId) === String(org._id);
                    });

                    return (
                      <div key={org._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-gradient-to-tr from-[#FF6B2C] to-[#FF8F5C] text-white font-bold text-sm flex items-center justify-center shadow-xs">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base">{org.name}</h3>
                              <p className="text-xs text-slate-500 font-mono">Slug: {org.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingOrgDetail(org)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors"
                            >
                              Org Details →
                            </button>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-blue-100 text-blue-800 uppercase">
                              {org.plan} Tier
                            </span>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {orgProjects.length} Projects
                            </span>
                          </div>
                        </div>

                        {orgProjects.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">No projects created in this organization yet.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 pt-1">
                            {orgProjects.map((proj) => (
                              <div key={proj._id} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3 flex flex-col justify-between hover:bg-slate-100/60 transition-colors">
                                <div className="space-y-1.5">
                                  <div className="flex items-center justify-between">
                                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-200 text-slate-700 uppercase">
                                      {proj.status}
                                    </span>
                                    <button
                                      onClick={() => setViewingProjectDetail(proj)}
                                      className="text-xs text-purple-700 font-bold hover:underline"
                                    >
                                      Details →
                                    </button>
                                  </div>
                                  <h4 className="font-bold text-slate-900 text-sm">{proj.name}</h4>
                                  {proj.description && <p className="text-xs text-slate-500 line-clamp-2">{proj.description}</p>}
                                </div>

                                <div className="pt-2 border-t border-slate-200/80 flex items-center justify-between text-xs text-slate-500">
                                  <span>Manager: {typeof proj.managerId === 'object' ? proj.managerId?.fullName : 'PM'}</span>
                                  <button
                                    onClick={() => {
                                      setSelectedProjectId(proj._id);
                                      setActiveTab('tasks');
                                    }}
                                    className="text-[#FF6B2C] font-bold hover:underline"
                                  >
                                    View Tasks →
                                  </button>
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Non-SuperAdmin Flat Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                  {projects.map((proj) => (
                    <div key={proj._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs hover:shadow-md transition-all space-y-4 flex flex-col justify-between">
                      <div className="space-y-2">
                        <div className="flex items-center justify-between">
                          <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-600 uppercase">
                            {proj.status}
                          </span>
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => setViewingProjectDetail(proj)}
                              className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md transition-colors"
                            >
                              Details
                            </button>
                            {can(userRole, 'EDIT_PROJECT') && (
                              <>
                                <button
                                  onClick={() => {
                                    setEditingProject(proj);
                                    setIsProjectModalOpen(true);
                                  }}
                                  className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                                  title="Edit Project"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                  </svg>
                                </button>
                                <button
                                  onClick={() => handleDeleteProject(proj._id)}
                                  className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                                  title="Delete Project"
                                >
                                  <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                  </svg>
                                </button>
                              </>
                            )}
                          </div>
                        </div>
                        <h3 className="font-bold text-slate-900 text-base">{proj.name}</h3>
                        {proj.description && <p className="text-xs text-slate-500 line-clamp-2">{proj.description}</p>}
                      </div>

                      <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-500">
                        <span>Manager: {typeof proj.managerId === 'object' ? proj.managerId?.fullName : 'PM'}</span>
                        <button
                          onClick={() => {
                            setSelectedProjectId(proj._id);
                            setActiveTab('tasks');
                          }}
                          className="text-[#FF6B2C] font-semibold hover:underline"
                        >
                          View Tasks →
                        </button>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 9. TEAMS VIEW                                                              */}
          {/* ========================================================================= */}
          {activeTab === 'teams' && can(userRole, 'VIEW_TEAMS') && (
            <div className="p-8 space-y-6 max-w-7xl mx-auto">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-2xl font-extrabold text-slate-900 tracking-tight">
                    {userRole === 'SuperAdmin' ? 'Team Rosters' : 'Teams Directory'}
                  </h2>
                  <p className="text-sm text-slate-500 mt-1">
                    {userRole === 'SuperAdmin'
                      ? 'Platform-wide, read-only view of team structures across all tenants.'
                      : 'Manage team structures and member assignments.'}
                  </p>
                </div>
                {can(userRole, 'MANAGE_TEAMS') && (
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setIsTeamModalOpen(true);
                    }}
                    className="px-4 py-2.5 rounded-xl bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs shadow-md shadow-[#FF6B2C]/20 transition-all flex items-center gap-2"
                  >
                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M12 4v16m8-8H4" />
                    </svg>
                    <span>+ New Team</span>
                  </button>
                )}
              </div>

              {/* SuperAdmin Organization-Grouped Teams View */}
              {userRole === 'SuperAdmin' ? (
                <div className="space-y-6">
                  {organizations.map((org) => {
                    const orgTeams = teams.filter((tm) => {
                      const tmOrgId = typeof tm.orgId === 'object' ? tm.orgId?._id : tm.orgId;
                      return String(tmOrgId) === String(org._id);
                    });

                    return (
                      <div key={org._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                        <div className="flex items-center justify-between border-b border-slate-100 pb-3">
                          <div className="flex items-center gap-3">
                            <div className="w-9 h-9 rounded-xl bg-[#1E1F24] text-[#FF6B2C] border border-[#FF6B2C]/40 font-bold text-sm flex items-center justify-center">
                              {org.name.charAt(0).toUpperCase()}
                            </div>
                            <div>
                              <h3 className="font-extrabold text-slate-900 text-base">{org.name}</h3>
                              <p className="text-xs text-slate-500 font-mono">Tenant Slug: {org.slug}</p>
                            </div>
                          </div>
                          <div className="flex items-center gap-2">
                            <button
                              onClick={() => setViewingOrgDetail(org)}
                              className="px-2.5 py-1 rounded-lg bg-purple-50 hover:bg-purple-100 text-purple-700 font-bold text-[11px] transition-colors"
                            >
                              Org Details →
                            </button>
                            <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-700">
                              {orgTeams.length} Teams
                            </span>
                          </div>
                        </div>

                        {orgTeams.length === 0 ? (
                          <p className="text-xs text-slate-400 italic py-2">No teams configured in this organization.</p>
                        ) : (
                          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 pt-1">
                            {orgTeams.map((tm) => (
                              <div key={tm._id} className="bg-slate-50 rounded-xl p-4 border border-slate-200/80 space-y-3">
                                <div className="flex items-center justify-between">
                                  <h4 className="font-bold text-slate-900 text-sm">{tm.name}</h4>
                                  <button
                                    onClick={() => setViewingTeamDetail(tm)}
                                    className="text-xs text-purple-700 font-bold hover:underline"
                                  >
                                    View Roster →
                                  </button>
                                </div>
                                {tm.description && <p className="text-xs text-slate-500 mt-0.5">{tm.description}</p>}

                                <div className="space-y-1.5 pt-2 border-t border-slate-200/80">
                                  <p className="text-[10px] font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
                                  {tm.memberIds && tm.memberIds.length > 0 ? (
                                    tm.memberIds.map((m: any) => (
                                      <div key={m._id || m} className="flex items-center gap-2 py-1 px-2.5 rounded-lg bg-white border border-slate-200/60 text-xs">
                                        <div className="w-5 h-5 rounded-full bg-[#1E1F24] text-white text-[9px] font-bold flex items-center justify-center">
                                          {(m.fullName || 'M').charAt(0).toUpperCase()}
                                        </div>
                                        <span className="font-medium text-slate-800">{m.fullName || 'Team Member'}</span>
                                        {m.role && <span className="text-[10px] text-slate-400 ml-auto font-mono">({m.role})</span>}
                                      </div>
                                    ))
                                  ) : (
                                    <p className="text-xs text-slate-400 italic">No members assigned.</p>
                                  )}
                                </div>
                              </div>
                            ))}
                          </div>
                        )}
                      </div>
                    );
                  })}
                </div>
              ) : (
                /* Non-SuperAdmin Flat Grid View */
                <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                  {teams.map((tm) => (
                    <div key={tm._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="font-bold text-slate-900 text-base">{tm.name}</h3>
                        <div className="flex items-center gap-2">
                          <button
                            onClick={() => setViewingTeamDetail(tm)}
                            className="px-2 py-0.5 text-[10px] font-bold bg-purple-50 text-purple-700 hover:bg-purple-100 rounded-md transition-colors"
                          >
                            Details
                          </button>
                          {can(userRole, 'MANAGE_TEAMS') && (
                            <>
                              <button
                                onClick={() => {
                                  setEditingTeam(tm);
                                  setIsTeamModalOpen(true);
                                }}
                                className="p-1 text-slate-400 hover:text-slate-700 rounded-md"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                </svg>
                              </button>
                              <button
                                onClick={() => handleDeleteTeam(tm._id)}
                                className="p-1 text-slate-400 hover:text-rose-600 rounded-md"
                              >
                                <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                </svg>
                              </button>
                            </>
                          )}
                        </div>
                      </div>

                      {tm.description && <p className="text-xs text-slate-500">{tm.description}</p>}

                      {/* Member Add Row for OrgAdmin / PM */}
                      {can(userRole, 'MANAGE_TEAMS') && (
                        <div className="flex items-center gap-2 pt-2 border-t border-slate-100">
                          <select
                            value={selectedMemberToAdd[tm._id] || ''}
                            onChange={(e) =>
                              setSelectedMemberToAdd((prev) => ({ ...prev, [tm._id]: e.target.value }))
                            }
                            className="flex-1 text-xs px-3 py-1.5 rounded-xl border border-slate-200 focus:outline-none"
                          >
                            <option value="">-- Add User to Team --</option>
                            {users.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.fullName} ({u.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddTeamMember(tm._id)}
                            className="px-3 py-1.5 rounded-xl bg-slate-900 hover:bg-slate-800 text-white text-xs font-bold"
                          >
                            Add
                          </button>
                        </div>
                      )}

                      <div className="space-y-2">
                        <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
                        <div className="space-y-1">
                          {tm.memberIds && tm.memberIds.length > 0 ? (
                            tm.memberIds.map((m: any) => (
                              <div key={m._id || m} className="flex items-center justify-between py-1 px-2.5 rounded-lg bg-slate-50 text-xs">
                                <span className="font-semibold text-slate-800">{m.fullName || 'Team Member'}</span>
                                {can(userRole, 'MANAGE_TEAMS') && (
                                  <button
                                    onClick={() => handleRemoveTeamMember(tm._id, m._id || m)}
                                    className="text-rose-500 hover:underline text-[10px] font-bold"
                                  >
                                    Remove
                                  </button>
                                )}
                              </div>
                            ))
                          ) : (
                            <p className="text-xs text-slate-400 italic">No members assigned.</p>
                          )}
                        </div>
                      </div>
                    </div>
                  ))}
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 10. USERS MANAGEMENT VIEW (OrgAdmin ONLY)                                 */}
          {/* ========================================================================= */}
          {activeTab === 'users' && can(userRole, 'MANAGE_USERS') && (
            <UsersView
              currentUser={currentUser}
              users={users}
              onRefreshUsers={fetchData}
            />
          )}

          {/* ========================================================================= */}
          {/* 11. ORGANIZATION SETTINGS VIEW (OrgAdmin / SuperAdmin)                    */}
          {/* ========================================================================= */}
          {activeTab === 'settings' && (userRole === 'OrgAdmin' || userRole === 'SuperAdmin') && (
            <OrgSettingsView currentUser={currentUser} />
          )}

        </main>
      </div>

      {/* Shared Modals */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => {
          setIsTaskModalOpen(false);
          setEditingTask(null);
        }}
        onSave={handleSaveTask}
        task={editingTask}
        projects={projects}
        users={users}
        defaultStatus={taskModalDefaultStatus}
        selectedProjectId={selectedProjectId}
      />

      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => {
          setIsProjectModalOpen(false);
          setEditingProject(null);
        }}
        onSave={handleSaveProject}
        project={editingProject}
        teams={teams}
        users={users}
      />

      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => {
          setIsTeamModalOpen(false);
          setEditingTeam(null);
        }}
        onSave={handleSaveTeam}
        team={editingTeam}
        users={users}
      />

      <ProfileModal
        isOpen={isProfileModalOpen}
        onClose={() => setIsProfileModalOpen(false)}
        user={currentUser}
        onProfileUpdated={fetchData}
      />

      {/* SuperAdmin Detail View Modals */}
      <OrgDetailModal
        isOpen={!!viewingOrgDetail}
        onClose={() => setViewingOrgDetail(null)}
        org={viewingOrgDetail}
        users={users}
        projects={projects}
        teams={teams}
        onSelectProjectDetail={(p) => {
          setViewingOrgDetail(null);
          setViewingProjectDetail(p);
        }}
        onSelectTeamDetail={(t) => {
          setViewingOrgDetail(null);
          setViewingTeamDetail(t);
        }}
      />

      <ProjectDetailModal
        isOpen={!!viewingProjectDetail}
        onClose={() => setViewingProjectDetail(null)}
        project={viewingProjectDetail}
        tasks={tasks}
        teams={teams}
        users={users}
        onSelectTaskDetail={(t) => {
          setViewingProjectDetail(null);
          setViewingTaskDetail(t);
        }}
        onSelectTeamDetail={(tm) => {
          setViewingProjectDetail(null);
          setViewingTeamDetail(tm);
        }}
      />

      <TaskDetailModal
        isOpen={!!viewingTaskDetail}
        onClose={() => setViewingTaskDetail(null)}
        task={viewingTaskDetail}
        projects={projects}
        users={users}
        onSelectProjectDetail={(p) => {
          setViewingTaskDetail(null);
          setViewingProjectDetail(p);
        }}
      />

      <TeamDetailModal
        isOpen={!!viewingTeamDetail}
        onClose={() => setViewingTeamDetail(null)}
        team={viewingTeamDetail}
        users={users}
        projects={projects}
        onSelectProjectDetail={(p) => {
          setViewingTeamDetail(null);
          setViewingProjectDetail(p);
        }}
      />
    </div>
  );
}
