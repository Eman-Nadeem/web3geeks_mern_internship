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

export default function DashboardPage() {
  const router = useRouter();

  // State Management
  const [currentUser, setCurrentUser] = useState<any>(null);
  const [projects, setProjects] = useState<any[]>([]);
  const [tasks, setTasks] = useState<any[]>([]);
  const [teams, setTeams] = useState<any[]>([]);
  const [users, setUsers] = useState<any[]>([]);
  const [logs, setLogs] = useState<any[]>([]);
  const [notifications, setNotifications] = useState<any[]>([]);

  const [isLoading, setIsLoading] = useState(true);
  const [selectedProjectId, setSelectedProjectId] = useState<string | null>(null);
  const [activeTab, setActiveTab] = useState<string>('overview');
  const [viewMode, setViewMode] = useState<'board' | 'list'>('board');

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

  const [selectedMemberToAdd, setSelectedMemberToAdd] = useState<{ [teamId: string]: string }>({});

  // Fetch Session and Real Data
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
      setCurrentUser(meData.user);

      // 2. Read Projects (/api/projects)
      const projectsRes = await fetch('/api/projects');
      if (projectsRes.ok) {
        const pData = await projectsRes.json();
        setProjects(pData.projects || []);
      }

      // 3. Read Tasks (/api/tasks)
      const tasksRes = await fetch('/api/tasks');
      if (tasksRes.ok) {
        const tData = await tasksRes.json();
        setTasks(tData.tasks || []);
      }

      // 4. Read Teams (/api/teams)
      const teamsRes = await fetch('/api/teams');
      if (teamsRes.ok) {
        const tmData = await teamsRes.json();
        setTeams(tmData.teams || []);
      }

      // 5. Read Users (/api/users)
      const usersRes = await fetch('/api/users');
      if (usersRes.ok) {
        const uData = await usersRes.json();
        setUsers(uData.users || []);
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

  // Auth Logout
  const handleLogout = async () => {
    try {
      await fetch('/api/auth/logout', { method: 'POST' });
    } catch (e) {
      // Ignore
    }
    router.push('/login');
  };

  // -------------------------------------------------------------
  // TASK CRUD OPERATIONS (POST, PATCH, DELETE)
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save task');
    }

    fetchData();
  };

  const handleDeleteTask = async (taskId: string) => {
    if (!confirm('Are you sure you want to delete this task?')) return;

    try {
      const res = await fetch(`/api/tasks/${taskId}`, {
        method: 'DELETE',
      });

      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }

      setTasks((prev) => prev.filter((t) => t._id !== taskId));
    } catch (error: any) {
      alert(`Delete error: ${error.message}`);
    }
  };

  // -------------------------------------------------------------
  // PROJECT CRUD OPERATIONS (POST, PATCH, DELETE)
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save project');
    }

    fetchData();
  };

  const handleDeleteProject = async (projectId: string) => {
    if (!confirm('Are you sure you want to delete this project?')) return;

    try {
      let res = await fetch(`/api/projects/${projectId}`, {
        method: 'DELETE',
      });

      if (res.status === 400) {
        const err = await res.json();
        if (confirm(`${err.message}\nDo you want to force delete this project along with its active tasks?`)) {
          res = await fetch(`/api/projects/${projectId}?force=true`, {
            method: 'DELETE',
          });
        } else {
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }

      if (selectedProjectId === projectId) {
        setSelectedProjectId(null);
      }
      fetchData();
    } catch (error: any) {
      alert(`Project delete error: ${error.message}`);
    }
  };

  // -------------------------------------------------------------
  // TEAM CRUD OPERATIONS (POST, PATCH, DELETE, ADD/REMOVE MEMBERS)
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

    const data = await res.json();
    if (!res.ok) {
      throw new Error(data.message || 'Failed to save team');
    }

    fetchData();
  };

  const handleDeleteTeam = async (teamId: string) => {
    if (!confirm('Are you sure you want to delete this team?')) return;

    try {
      let res = await fetch(`/api/teams/${teamId}`, {
        method: 'DELETE',
      });

      if (res.status === 400) {
        const err = await res.json();
        if (confirm(`${err.message}\nDo you want to force delete this team?`)) {
          res = await fetch(`/api/teams/${teamId}?force=true`, {
            method: 'DELETE',
          });
        } else {
          return;
        }
      }

      if (!res.ok) {
        const err = await res.json();
        alert(`Delete failed: ${err.message || 'Permission denied'}`);
        return;
      }

      fetchData();
    } catch (error: any) {
      alert(`Team delete error: ${error.message}`);
    }
  };

  const handleAddTeamMember = async (teamId: string) => {
    const memberId = selectedMemberToAdd[teamId];
    if (!memberId) {
      alert('Please select a member to add.');
      return;
    }

    try {
      const res = await fetch(`/api/teams/${teamId}/members`, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ userId: memberId }),
      });

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to add member');
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

      const data = await res.json();
      if (!res.ok) {
        alert(data.message || 'Failed to remove member');
        return;
      }

      fetchData();
    } catch (error: any) {
      alert(`Remove member error: ${error.message}`);
    }
  };

  // Filter Tasks
  const filteredTasks = tasks.filter((task) => {
    if (selectedProjectId) {
      const pId = typeof task.projectId === 'object' ? task.projectId?._id : task.projectId;
      if (pId !== selectedProjectId) return false;
    }

    if (searchQuery.trim()) {
      const q = searchQuery.toLowerCase();
      const matchTitle = task.title.toLowerCase().includes(q);
      const matchDesc = task.description?.toLowerCase().includes(q);
      if (!matchTitle && !matchDesc) return false;
    }

    if (statusFilter && task.status !== statusFilter) return false;
    if (priorityFilter && task.priority !== priorityFilter) return false;

    if (assigneeFilter) {
      const aId = typeof task.assigneeId === 'object' ? task.assigneeId?._id : task.assigneeId;
      if (aId !== assigneeFilter) return false;
    }

    if (isMyTasksOnly && currentUser) {
      const aId = typeof task.assigneeId === 'object' ? task.assigneeId?._id : task.assigneeId;
      if (aId !== currentUser.id && aId !== currentUser.userId) return false;
    }

    return true;
  });

  if (isLoading) {
    return (
      <div className="min-h-screen bg-[#F4F5F8] flex items-center justify-center">
        <div className="flex flex-col items-center gap-3">
          <div className="w-10 h-10 border-4 border-[#FF6B2C] border-t-transparent rounded-full animate-spin"></div>
          <p className="text-xs font-bold text-slate-600">Loading Multi-Tenant Workspace...</p>
        </div>
      </div>
    );
  }

  const userRole = currentUser?.role || 'TeamMember';
  const selectedProject = projects.find((p) => p._id === selectedProjectId);

  // Tab Header Titles
  let headerTitle = 'Workspace Dashboard';
  if (selectedProject) {
    headerTitle = selectedProject.name;
  } else if (activeTab === 'overview') {
    if (userRole === 'SuperAdmin') headerTitle = 'Platform Super Admin Overview';
    else if (userRole === 'OrgAdmin') headerTitle = 'Organization Executive Overview';
    else if (userRole === 'ProjectManager') headerTitle = 'Project Manager Command Center';
    else headerTitle = 'My Work & Task Dashboard';
  } else if (activeTab === 'projects') {
    headerTitle = 'Projects Directory';
  } else if (activeTab === 'teams') {
    headerTitle = 'Teams & Members';
  } else if (activeTab === 'activity') {
    headerTitle = 'Activity Audit Stream';
  }

  // Filter tasks assigned to currently logged-in user
  const myAssignedTasks = tasks.filter((t) => {
    const aId = typeof t.assigneeId === 'object' ? t.assigneeId?._id : t.assigneeId;
    return aId === currentUser?.id || aId === currentUser?.userId;
  });

  return (
    <div className="min-h-screen bg-[#F4F5F8] flex w-full max-w-full overflow-x-hidden">
      {/* Sidebar Component */}
      <Sidebar
        user={currentUser}
        projects={projects}
        selectedProjectId={selectedProjectId}
        activeTab={activeTab}
        onTabChange={(tab) => {
          setActiveTab(tab);
          if (tab === 'activity') setIsActivityDrawerOpen(true);
        }}
        onSelectProject={(pId) => {
          setSelectedProjectId(pId);
          setActiveTab('tasks');
        }}
        onNewProject={() => {
          setEditingProject(null);
          setIsProjectModalOpen(true);
        }}
        onLogout={handleLogout}
      />

      {/* Main Content Area */}
      <div className="flex-1 pl-64 flex flex-col min-h-screen min-w-0 w-full overflow-x-hidden">
        {/* Top Header */}
        <TopHeader
          title={headerTitle}
          viewMode={viewMode}
          userRole={userRole}
          showViewToggle={activeTab === 'tasks'}
          onViewModeChange={(mode) => setViewMode(mode)}
          onOpenNewTaskModal={() => {
            setEditingTask(null);
            setTaskModalDefaultStatus('TO_DO');
            setIsTaskModalOpen(true);
          }}
          onOpenNewProjectModal={() => {
            setEditingProject(null);
            setIsProjectModalOpen(true);
          }}
          unreadNotificationsCount={notifications.filter((n) => !n.read).length}
          onToggleNotifications={() => setIsNotificationPopoverOpen(!isNotificationPopoverOpen)}
        />

        {/* Notifications Popover */}
        <NotificationPopover
          isOpen={isNotificationPopoverOpen}
          onClose={() => setIsNotificationPopoverOpen(false)}
          notifications={notifications}
          onMarkAsRead={(nId) =>
            setNotifications((prev) =>
              prev.map((n) => (n._id === nId ? { ...n, read: true } : n))
            )
          }
        />

        {/* Filter Bar ONLY rendered on Tasks Tab */}
        {activeTab === 'tasks' && (
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
          />
        )}

        {/* Main Body Area */}
        <main className="flex-1 overflow-y-auto w-full min-w-0">
          
          {/* ========================================================================= */}
          {/* 1. OVERVIEW TAB: ROLE-BASED DASHBOARDS (RBAC Matrix Compliant)            */}
          {/* ========================================================================= */}
          {activeTab === 'overview' && (
            <div className="p-8 space-y-8 w-full min-w-0">
              
              {/* --------------------------------------------------------------------- */}
              {/* ROLE 1: SUPER ADMIN (Platform Owner)                                  */}
              {/* --------------------------------------------------------------------- */}
              {userRole === 'SuperAdmin' && (
                <div className="space-y-6">
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
                      <p className="text-3xl font-extrabold text-purple-600">2</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Total System Users</p>
                      <p className="text-3xl font-extrabold text-slate-900">{users.length || 8}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Global Projects</p>
                      <p className="text-3xl font-extrabold text-emerald-600">{projects.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">System Audit Logs</p>
                      <p className="text-3xl font-extrabold text-[#FF6B2C]">{logs.length}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <h3 className="text-sm font-bold text-slate-900">Tenant Organizations Roster</h3>
                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3">Organization Name</th>
                            <th className="px-4 py-3">Slug</th>
                            <th className="px-4 py-3">Subscription Plan</th>
                            <th className="px-4 py-3">Status</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          <tr>
                            <td className="px-4 py-3 font-bold text-slate-900">Acme Corp</td>
                            <td className="px-4 py-3 font-mono text-slate-500">acme-corp</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-blue-100 text-blue-800 text-[10px] font-bold">PRO</span></td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE</span></td>
                          </tr>
                          <tr>
                            <td className="px-4 py-3 font-bold text-slate-900">Stark Industries</td>
                            <td className="px-4 py-3 font-mono text-slate-500">stark-industries</td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-purple-100 text-purple-800 text-[10px] font-bold">ENTERPRISE</span></td>
                            <td className="px-4 py-3"><span className="px-2 py-0.5 rounded bg-emerald-100 text-emerald-800 text-[10px] font-bold">ACTIVE</span></td>
                          </tr>
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------------- */}
              {/* ROLE 2: ORGANIZATION ADMIN (Tenant Owner)                            */}
              {/* --------------------------------------------------------------------- */}
              {userRole === 'OrgAdmin' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 bg-blue-100 text-blue-800 font-bold text-xs rounded-full">
                        Organization Admin (Tenant Owner)
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
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Organization Members</p>
                      <p className="text-3xl font-extrabold text-purple-600">{users.length}</p>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                    {/* Projects Overview List */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Tenant Projects Summary</h3>
                        <button onClick={() => setActiveTab('projects')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                          View All →
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {projects.slice(0, 5).map((p) => (
                          <div key={p._id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{p.name}</p>
                              <p className="text-[11px] text-slate-500">Manager: {typeof p.managerId === 'object' ? p.managerId?.fullName : 'Assigned PM'}</p>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#FF6B2C]/10 text-[#FF6B2C]">
                              {p.status}
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>

                    {/* Team Roster Summary */}
                    <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                      <div className="flex items-center justify-between">
                        <h3 className="text-sm font-bold text-slate-900">Teams & Rosters</h3>
                        <button onClick={() => setActiveTab('teams')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                          Manage Teams →
                        </button>
                      </div>
                      <div className="divide-y divide-slate-100">
                        {teams.map((t) => (
                          <div key={t._id} className="py-3 flex items-center justify-between">
                            <div>
                              <p className="text-xs font-bold text-slate-900">{t.name}</p>
                              <p className="text-[11px] text-slate-500">{t.memberIds?.length || 0} Members</p>
                            </div>
                            <span className="px-2 py-0.5 text-[10px] font-bold bg-slate-100 text-slate-700 rounded">
                              Active
                            </span>
                          </div>
                        ))}
                      </div>
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------------- */}
              {/* ROLE 3: PROJECT MANAGER (Team Lead)                                   */}
              {/* --------------------------------------------------------------------- */}
              {userRole === 'ProjectManager' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 bg-amber-100 text-amber-800 font-bold text-xs rounded-full">
                        Project Manager / Team Lead
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2">Manager Command Center</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Managed Projects</p>
                      <p className="text-3xl font-extrabold text-slate-900">{projects.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Project Tasks</p>
                      <p className="text-3xl font-extrabold text-[#FF6B2C]">{tasks.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Urgent / High Priority</p>
                      <p className="text-3xl font-extrabold text-rose-600">
                        {tasks.filter((t) => t.priority === 'URGENT' || t.priority === 'HIGH').length}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Team Members</p>
                      <p className="text-3xl font-extrabold text-emerald-600">{users.length}</p>
                    </div>
                  </div>

                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <h3 className="text-sm font-bold text-slate-900">Managed Projects Status</h3>
                      <button onClick={() => setActiveTab('tasks')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                        Open Board →
                      </button>
                    </div>
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                      {projects.map((p) => (
                        <div key={p._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200 space-y-2">
                          <div className="flex items-center justify-between">
                            <h4 className="font-bold text-slate-900 text-xs">{p.name}</h4>
                            <span className="px-2 py-0.5 text-[10px] font-bold rounded bg-[#FF6B2C]/10 text-[#FF6B2C]">{p.status}</span>
                          </div>
                          <p className="text-[11px] text-slate-500 line-clamp-1">{p.description || 'No description'}</p>
                        </div>
                      ))}
                    </div>
                  </div>
                </div>
              )}

              {/* --------------------------------------------------------------------- */}
              {/* ROLE 4: TEAM MEMBER (Individual Contributor)                           */}
              {/* --------------------------------------------------------------------- */}
              {userRole === 'TeamMember' && (
                <div className="space-y-6">
                  <div className="flex items-center justify-between">
                    <div>
                      <span className="px-3 py-1 bg-sky-100 text-sky-800 font-bold text-xs rounded-full">
                        Individual Contributor (Team Member)
                      </span>
                      <h2 className="text-xl font-extrabold text-slate-900 mt-2">My Work & Task Workspace</h2>
                    </div>
                  </div>

                  <div className="grid grid-cols-1 md:grid-cols-4 gap-6">
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Assigned to Me</p>
                      <p className="text-3xl font-extrabold text-[#FF6B2C]">{myAssignedTasks.length}</p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">In Progress</p>
                      <p className="text-3xl font-extrabold text-amber-600">
                        {myAssignedTasks.filter((t) => t.status === 'IN_PROGRESS').length}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Under Review</p>
                      <p className="text-3xl font-extrabold text-sky-600">
                        {myAssignedTasks.filter((t) => t.status === 'UNDER_REVIEW').length}
                      </p>
                    </div>
                    <div className="bg-white p-5 rounded-2xl border border-slate-200 shadow-xs space-y-1">
                      <p className="text-xs font-bold text-slate-400 uppercase tracking-wider">Completed Tasks</p>
                      <p className="text-3xl font-extrabold text-emerald-600">
                        {myAssignedTasks.filter((t) => t.status === 'COMPLETED').length}
                      </p>
                    </div>
                  </div>

                  {/* My Assigned Tasks List with Inline Status Transition Selector */}
                  <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="text-sm font-bold text-slate-900">My Assigned Tasks</h3>
                        <p className="text-xs text-slate-500">Update status of your assigned tasks</p>
                      </div>
                      <button onClick={() => setActiveTab('tasks')} className="text-xs text-[#FF6B2C] font-semibold hover:underline">
                        Open Board View →
                      </button>
                    </div>

                    <div className="overflow-x-auto">
                      <table className="w-full text-left text-xs text-slate-700">
                        <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase">
                          <tr>
                            <th className="px-4 py-3">Task Title</th>
                            <th className="px-4 py-3">Priority</th>
                            <th className="px-4 py-3">Status Progress</th>
                            <th className="px-4 py-3">Due Date</th>
                          </tr>
                        </thead>
                        <tbody className="divide-y divide-slate-100 font-medium">
                          {myAssignedTasks.length === 0 ? (
                            <tr>
                              <td colSpan={4} className="px-4 py-8 text-center text-slate-400">
                                No tasks currently assigned to you.
                              </td>
                            </tr>
                          ) : (
                            myAssignedTasks.map((t) => (
                              <tr key={t._id} className="hover:bg-slate-50">
                                <td className="px-4 py-3 font-bold text-slate-900">{t.title}</td>
                                <td className="px-4 py-3">
                                  <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-slate-100 text-slate-800">
                                    {t.priority}
                                  </span>
                                </td>
                                <td className="px-4 py-3">
                                  <select
                                    value={t.status}
                                    onChange={(e) => handleTaskStatusChange(t._id, e.target.value)}
                                    className="text-xs font-semibold bg-slate-100 text-slate-800 rounded-lg px-2.5 py-1 border border-slate-200 focus:ring-1 focus:ring-[#FF6B2C]"
                                  >
                                    <option value="TO_DO">To Do</option>
                                    <option value="IN_PROGRESS">In Progress</option>
                                    <option value="UNDER_REVIEW">Review</option>
                                    <option value="COMPLETED">Complete</option>
                                  </select>
                                </td>
                                <td className="px-4 py-3 text-slate-500 font-mono">
                                  {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                                </td>
                              </tr>
                            ))
                          )}
                        </tbody>
                      </table>
                    </div>
                  </div>
                </div>
              )}
            </div>
          )}

          {/* ========================================================================= */}
          {/* 2. TASKS & KANBAN BOARD TAB                                               */}
          {/* ========================================================================= */}
          {activeTab === 'tasks' && (
            viewMode === 'board' ? (
              <KanbanBoard
                tasks={filteredTasks}
                users={users}
                projects={projects}
                userRole={userRole}
                onStatusChange={handleTaskStatusChange}
                onEditTask={(task) => {
                  setEditingTask(task);
                  setIsTaskModalOpen(true);
                }}
                onDeleteTask={handleDeleteTask}
                onOpenNewTaskModal={(status) => {
                  setEditingTask(null);
                  setTaskModalDefaultStatus(status || 'TO_DO');
                  setIsTaskModalOpen(true);
                }}
              />
            ) : (
              <div className="p-8 w-full min-w-0">
                <div className="bg-white rounded-2xl border border-slate-200 shadow-xs overflow-hidden w-full">
                  <table className="w-full text-left text-xs text-slate-700">
                    <thead className="bg-slate-50 border-b border-slate-200 text-[11px] font-bold text-slate-500 uppercase tracking-wider">
                      <tr>
                        <th className="px-6 py-3.5">Task Title</th>
                        <th className="px-6 py-3.5">Status</th>
                        <th className="px-6 py-3.5">Priority</th>
                        <th className="px-6 py-3.5">Assignee</th>
                        <th className="px-6 py-3.5">Due Date</th>
                        <th className="px-6 py-3.5 text-right">Actions</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-slate-100 font-medium">
                      {filteredTasks.length === 0 ? (
                        <tr>
                          <td colSpan={6} className="px-6 py-12 text-center text-slate-400">
                            No tasks match the selected filters.
                          </td>
                        </tr>
                      ) : (
                        filteredTasks.map((t) => (
                          <tr key={t._id} className="hover:bg-slate-50 transition-colors">
                            <td className="px-6 py-4 font-bold text-slate-900">{t.title}</td>
                            <td className="px-6 py-4">
                              <select
                                value={t.status}
                                onChange={(e) => handleTaskStatusChange(t._id, e.target.value)}
                                className="text-[11px] font-semibold bg-slate-100 text-slate-700 rounded-lg px-2.5 py-1 border border-slate-200"
                              >
                                <option value="TO_DO">To Do</option>
                                <option value="IN_PROGRESS">In Progress</option>
                                <option value="UNDER_REVIEW">Review</option>
                                <option value="COMPLETED">Complete</option>
                              </select>
                            </td>
                            <td className="px-6 py-4">
                              <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold bg-slate-100 text-slate-800">
                                {t.priority}
                              </span>
                            </td>
                            <td className="px-6 py-4 text-slate-600">
                              {typeof t.assigneeId === 'object'
                                ? t.assigneeId?.fullName
                                : 'Unassigned'}
                            </td>
                            <td className="px-6 py-4 text-slate-500 font-mono">
                              {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : '-'}
                            </td>
                            <td className="px-6 py-4 text-right space-x-1">
                              {(userRole === 'SuperAdmin' || userRole === 'OrgAdmin' || userRole === 'ProjectManager') ? (
                                <>
                                  <button
                                    onClick={() => {
                                      setEditingTask(t);
                                      setIsTaskModalOpen(true);
                                    }}
                                    title="Edit Task"
                                    className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                                    </svg>
                                  </button>
                                  <button
                                    onClick={() => handleDeleteTask(t._id)}
                                    title="Delete Task"
                                    className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                                  >
                                    <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                                    </svg>
                                  </button>
                                </>
                              ) : (
                                <span className="text-[10px] text-slate-400 italic">View only</span>
                              )}
                            </td>
                          </tr>
                        ))
                      )}
                    </tbody>
                  </table>
                </div>
              </div>
            )
          )}

          {/* ========================================================================= */}
          {/* 3. PROJECTS DIRECTORY TAB                                                 */}
          {/* ========================================================================= */}
          {activeTab === 'projects' && (
            <div className="p-8 space-y-6 w-full min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Projects Directory & Management</h2>
                  <p className="text-xs text-slate-500 font-medium">Create, edit, and delete tenant projects</p>
                </div>
                {(userRole === 'SuperAdmin' || userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                  <button
                    onClick={() => {
                      setEditingProject(null);
                      setIsProjectModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    + New Project
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
                {projects.map((proj) => (
                  <div key={proj._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs flex flex-col justify-between space-y-4">
                    <div className="space-y-3">
                      <div className="flex items-center justify-between">
                        <span className="px-2.5 py-1 rounded-full text-[10px] font-bold bg-[#FF6B2C]/10 text-[#FF6B2C]">
                          {proj.status}
                        </span>
                        {(userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                          <div className="flex items-center gap-1">
                            <button
                              onClick={() => {
                                setEditingProject(proj);
                                setIsProjectModalOpen(true);
                              }}
                              title="Edit Project"
                              className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                              </svg>
                            </button>
                            <button
                              onClick={() => handleDeleteProject(proj._id)}
                              title="Delete Project"
                              className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                            >
                              <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                              </svg>
                            </button>
                          </div>
                        )}
                      </div>
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{proj.name}</h3>
                        <p className="text-xs text-slate-500 mt-1 line-clamp-2">{proj.description || 'No description provided.'}</p>
                      </div>
                    </div>

                    <div className="pt-3 border-t border-slate-100 flex items-center justify-between text-xs text-slate-600">
                      <span>Manager: <strong className="text-slate-900">{typeof proj.managerId === 'object' ? proj.managerId?.fullName : 'Assigned PM'}</strong></span>
                      <button
                        onClick={() => {
                          setSelectedProjectId(proj._id);
                          setActiveTab('tasks');
                        }}
                        className="text-[#FF6B2C] font-bold hover:underline"
                      >
                        View Board →
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 4. TEAMS DIRECTORY TAB                                                    */}
          {/* ========================================================================= */}
          {activeTab === 'teams' && (
            <div className="p-8 space-y-6 w-full min-w-0">
              <div className="flex items-center justify-between">
                <div>
                  <h2 className="text-xl font-extrabold text-slate-900">Tenant Teams & Member Management</h2>
                  <p className="text-xs text-slate-500 font-medium">Manage teams & team roster members</p>
                </div>
                {(userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                  <button
                    onClick={() => {
                      setEditingTeam(null);
                      setIsTeamModalOpen(true);
                    }}
                    className="px-4 py-2 bg-[#FF6B2C] hover:bg-[#E0561B] text-white font-bold text-xs rounded-xl shadow-md transition-all"
                  >
                    + New Team
                  </button>
                )}
              </div>

              <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
                {teams.map((team) => (
                  <div key={team._id} className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                    <div className="flex items-center justify-between">
                      <div>
                        <h3 className="font-bold text-slate-900 text-base">{team.name}</h3>
                        <p className="text-xs text-slate-500 mt-0.5">{team.description || 'No description'}</p>
                      </div>
                      {(userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                        <div className="flex items-center gap-1">
                          <button
                            onClick={() => {
                              setEditingTeam(team);
                              setIsTeamModalOpen(true);
                            }}
                            title="Edit Team"
                            className="p-1.5 text-slate-400 hover:text-slate-700 hover:bg-slate-100 rounded-lg transition-colors inline-flex items-center"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15.232 5.232l3.536 3.536m-2.036-5.036a2.5 2.5 0 113.536 3.536L6.5 21.036H3v-3.572L16.732 3.732z" />
                            </svg>
                          </button>
                          <button
                            onClick={() => handleDeleteTeam(team._id)}
                            title="Delete Team"
                            className="p-1.5 text-slate-400 hover:text-rose-600 hover:bg-rose-50 rounded-lg transition-colors inline-flex items-center"
                          >
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                            </svg>
                          </button>
                        </div>
                      )}
                    </div>

                    <div className="pt-3 border-t border-slate-100 space-y-3">
                      <div className="flex items-center justify-between">
                        <p className="text-xs font-bold text-slate-700">Team Members ({team.memberIds?.length || 0}):</p>
                      </div>

                      <div className="flex flex-wrap gap-2">
                        {team.memberIds?.map((m: any, idx: number) => {
                          const mId = typeof m === 'object' ? m._id : m;
                          const mName = typeof m === 'object' ? m.fullName : 'Member';
                          return (
                            <span key={idx} className="px-2.5 py-1 bg-slate-100 rounded-lg text-xs font-semibold text-slate-700 flex items-center gap-1.5 border border-slate-200">
                              <span>{mName}</span>
                              {(userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                                <button
                                  onClick={() => handleRemoveTeamMember(team._id, mId)}
                                  title="Remove member from team"
                                  className="text-slate-400 hover:text-rose-600 font-bold ml-1"
                                >
                                  ✕
                                </button>
                              )}
                            </span>
                          );
                        })}
                      </div>

                      {(userRole === 'OrgAdmin' || userRole === 'ProjectManager') && (
                        <div className="pt-2 flex items-center gap-2">
                          <select
                            value={selectedMemberToAdd[team._id] || ''}
                            onChange={(e) =>
                              setSelectedMemberToAdd((prev) => ({ ...prev, [team._id]: e.target.value }))
                            }
                            className="bg-slate-50 border border-slate-200 rounded-xl px-3 py-1.5 text-xs text-slate-800 focus:outline-none focus:ring-1 focus:ring-[#FF6B2C] flex-1"
                          >
                            <option value="">Select User to Add...</option>
                            {users.map((u) => (
                              <option key={u._id} value={u._id}>
                                {u.fullName} ({u.role})
                              </option>
                            ))}
                          </select>
                          <button
                            onClick={() => handleAddTeamMember(team._id)}
                            className="px-3 py-1.5 bg-slate-900 hover:bg-slate-800 text-white font-semibold text-xs rounded-xl transition-all"
                          >
                            + Add
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {/* ========================================================================= */}
          {/* 5. ACTIVITY LOG STREAM TAB                                                */}
          {/* ========================================================================= */}
          {activeTab === 'activity' && (
            <div className="p-8 space-y-6 w-full min-w-0">
              <div>
                <h2 className="text-xl font-extrabold text-slate-900">Audit & Activity Log Stream</h2>
                <p className="text-xs text-slate-500 font-medium">Real-time tenant activity and compliance logs</p>
              </div>

              <div className="bg-white rounded-2xl p-6 border border-slate-200 shadow-xs space-y-4">
                {logs.length === 0 ? (
                  <p className="text-xs text-slate-400 text-center py-8">No activity logs found.</p>
                ) : (
                  logs.map((log) => (
                    <div key={log._id} className="p-4 bg-slate-50 rounded-xl border border-slate-200/80 flex items-center justify-between">
                      <div>
                        <span className="text-xs font-bold text-[#FF6B2C]">{log.action}</span>
                        <p className="text-xs text-slate-700 mt-0.5">{log.entityType}</p>
                      </div>
                      <span className="text-[10px] text-slate-400 font-mono">{new Date(log.createdAt).toLocaleString()}</span>
                    </div>
                  ))
                )}
              </div>
            </div>
          )}
        </main>
      </div>

      {/* Task Modal */}
      <TaskModal
        isOpen={isTaskModalOpen}
        onClose={() => setIsTaskModalOpen(false)}
        onSave={handleSaveTask}
        initialTask={editingTask}
        defaultStatus={taskModalDefaultStatus}
        projects={projects}
        users={users}
      />

      {/* Project Modal */}
      <ProjectModal
        isOpen={isProjectModalOpen}
        onClose={() => setIsProjectModalOpen(false)}
        onSave={handleSaveProject}
        initialProject={editingProject}
        users={users}
        teams={teams}
      />

      {/* Team Modal */}
      <TeamModal
        isOpen={isTeamModalOpen}
        onClose={() => setIsTeamModalOpen(false)}
        onSave={handleSaveTeam}
        initialTeam={editingTeam}
        users={users}
      />

      {/* Activity Drawer */}
      <ActivityLogDrawer
        isOpen={isActivityDrawerOpen}
        onClose={() => setIsActivityDrawerOpen(false)}
        logs={logs}
      />
    </div>
  );
}
