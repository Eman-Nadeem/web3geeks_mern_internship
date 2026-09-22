"use client";

import React, { useState } from "react";
import { useParams, useRouter } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api, ApiError } from "@/lib/api-client";
import {
  OrganizationDTO,
  ProjectDetailDTO,
  ProjectDashboardDTO,
  TaskDTO,
  TaskStatus,
  TaskPriority,
  ProjectStatus,
} from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Avatar } from "@/components/ui/avatar";
import { Alert } from "@/components/ui/alert";
import { Dialog } from "@/components/ui/dialog";
import { Input } from "@/components/ui/input";
import { CreateTaskModal } from "@/components/tasks/create-task-modal";
import { EditTaskModal } from "@/components/tasks/edit-task-modal";
import { AddProjectMemberModal } from "@/components/projects/add-project-member-modal";
import {
  FolderKanban,
  ArrowLeft,
  LayoutDashboard,
  CheckSquare,
  Users,
  Settings,
  Plus,
  Search,
  AlertTriangle,
  Clock,
  Trash2,
  Save,
  ShieldAlert,
  UserMinus,
} from "lucide-react";

type ProjectTab = "dashboard" | "tasks" | "members" | "settings";

export default function ProjectDetailPage() {
  const params = useParams();
  const router = useRouter();
  const queryClient = useQueryClient();

  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";
  const projectId = typeof params.projectId === "string" ? params.projectId : "";

  // Tab selection
  const [activeTab, setActiveTab] = useState<ProjectTab>("dashboard");

  // Task filtering state
  const [searchTask, setSearchTask] = useState("");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [filterAssignee, setFilterAssignee] = useState<string>("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState<boolean>(false);

  // Modals state
  const [isCreateTaskOpen, setIsCreateTaskOpen] = useState(false);
  const [editingTask, setEditingTask] = useState<TaskDTO | null>(null);
  const [isAddMemberOpen, setIsAddMemberOpen] = useState(false);
  const [memberToRemove, setMemberToRemove] = useState<{ id: string; name: string } | null>(null);
  const [isDeleteProjectOpen, setIsDeleteProjectOpen] = useState(false);

  // Settings form state
  const [editName, setEditName] = useState("");
  const [editDescription, setEditDescription] = useState("");
  const [editStatus, setEditStatus] = useState<ProjectStatus>(ProjectStatus.PLANNING);
  const [editOwnerId, setEditOwnerId] = useState("");
  const [settingsSuccess, setSettingsSuccess] = useState<string | null>(null);
  const [settingsError, setSettingsError] = useState<string | null>(null);

  // 1. Fetch user's organizations
  const { data: userOrgs, isLoading: isOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>("/organizations");
      return res.organizations;
    },
  });

  const matchingOrg = (userOrgs || []).find((org) => org.slug === orgSlug);

  // 2. Fetch Project Detail
  const {
    data: project,
    isLoading: isProjectLoading,
    error: projectError,
  } = useQuery({
    queryKey: ["project", projectId],
    queryFn: async () => {
      if (!matchingOrg) throw new Error("No organization found");
      const res = await api.get<{ project: ProjectDetailDTO }>(
        `/organizations/${matchingOrg.id}/projects/${projectId}`
      );
      return res.project;
    },
    enabled: !!matchingOrg?.id && !!projectId,
  });

  // Populate settings form when project loads
  React.useEffect(() => {
    if (project) {
      setEditName(project.name);
      setEditDescription(project.description || "");
      setEditStatus(project.status);
      setEditOwnerId(project.ownerId);
    }
  }, [project]);

  // 3. Fetch Project Dashboard Stats
  const { data: dashboardStats, isLoading: isStatsLoading } = useQuery({
    queryKey: ["project-dashboard", projectId],
    queryFn: async () => {
      if (!matchingOrg) return null;
      const res = await api.get<{ dashboard: ProjectDashboardDTO }>(
        `/organizations/${matchingOrg.id}/projects/${projectId}/dashboard`
      );
      return res.dashboard;
    },
    enabled: !!matchingOrg?.id && !!projectId && activeTab === "dashboard",
  });

  // 4. Fetch Tasks with search & filters
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: [
      "tasks",
      projectId,
      {
        search: searchTask,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        priority: filterPriority !== "ALL" ? filterPriority : undefined,
        assigneeId:
          filterAssignee === "UNASSIGNED"
            ? "unassigned"
            : filterAssignee !== "ALL"
            ? filterAssignee
            : undefined,
        overdue: onlyOverdue,
      },
    ],
    queryFn: async () => {
      if (!matchingOrg) return [];
      const qs = new URLSearchParams();
      if (searchTask.trim()) qs.set("search", searchTask.trim());
      if (filterStatus !== "ALL") qs.set("status", filterStatus);
      if (filterPriority !== "ALL") qs.set("priority", filterPriority);
      if (filterAssignee === "UNASSIGNED") {
        qs.set("assigneeId", "unassigned");
      } else if (filterAssignee !== "ALL") {
        qs.set("assigneeId", filterAssignee);
      }
      if (onlyOverdue) qs.set("overdue", "true");

      const queryStr = qs.toString() ? `?${qs.toString()}` : "";
      const res = await api.get<{ tasks: TaskDTO[] }>(
        `/organizations/${matchingOrg.id}/projects/${projectId}/tasks${queryStr}`
      );
      return res.tasks;
    },
    enabled: !!matchingOrg?.id && !!projectId && activeTab === "tasks",
  });

  // Inline status triage mutation
  const inlineStatusMutation = useMutation({
    mutationFn: async ({ taskId, newStatus }: { taskId: string; newStatus: TaskStatus }) => {
      if (!matchingOrg) return;
      return api.patch(
        `/organizations/${matchingOrg.id}/projects/${projectId}/tasks/${taskId}`,
        { status: newStatus }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["tasks", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", matchingOrg?.id] });
    },
  });

  // Remove member mutation
  const removeMemberMutation = useMutation({
    mutationFn: async (userId: string) => {
      if (!matchingOrg) return;
      return api.delete(
        `/organizations/${matchingOrg.id}/projects/${projectId}/members/${userId}`
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["project-dashboard", projectId] });
      setMemberToRemove(null);
    },
  });

  // Save Settings mutation
  const updateProjectMutation = useMutation({
    mutationFn: async () => {
      if (!matchingOrg) return;
      return api.patch(`/organizations/${matchingOrg.id}/projects/${projectId}`, {
        name: editName.trim(),
        description: editDescription.trim() || null,
        status: editStatus,
        ownerId: editOwnerId || undefined,
      });
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["project", projectId] });
      queryClient.invalidateQueries({ queryKey: ["projects", matchingOrg?.id] });
      setSettingsSuccess("Project details updated successfully.");
      setSettingsError(null);
      setTimeout(() => setSettingsSuccess(null), 4000);
    },
    onError: (err) => {
      if (err instanceof ApiError) {
        setSettingsError(err.message);
      } else {
        setSettingsError("Failed to update project details.");
      }
    },
  });

  // Delete Project mutation
  const deleteProjectMutation = useMutation({
    mutationFn: async () => {
      if (!matchingOrg) return;
      return api.delete(`/organizations/${matchingOrg.id}/projects/${projectId}`);
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects", matchingOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ["organization", matchingOrg?.id] });
      router.push(`/dashboard/${orgSlug}/projects`);
    },
  });

  if (isOrgsLoading || isProjectLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-40 rounded-2xl" />
        <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  if (!matchingOrg || !project || projectError) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-white mb-2">Project Access Restricted</h2>
        <p className="text-sm text-slate-400 max-w-md mb-6">
          This project does not exist or you do not have permission to view it.
        </p>
        <Link href={`/dashboard/${orgSlug}/projects`}>
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Projects</span>
          </Button>
        </Link>
      </div>
    );
  }

  const role = matchingOrg.role;
  const isOrgAdmin = role === "OWNER" || role === "ADMIN";
  const tasks = tasksData || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header with Breadcrumbs & Meta */}
      <div className="rounded-2xl border border-slate-800 bg-slate-900/60 backdrop-blur-xl p-6 shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-2 text-xs text-slate-400">
              <Link
                href={`/dashboard/${orgSlug}/projects`}
                className="hover:text-blue-400 transition-colors flex items-center gap-1"
              >
                <ArrowLeft className="w-3.5 h-3.5" />
                <span>Projects</span>
              </Link>
              <span>/</span>
              <span className="text-slate-200 font-medium">{project.name}</span>
            </div>

            <div className="flex items-center gap-3">
              <h1 className="text-2xl sm:text-3xl font-bold text-white tracking-tight">
                {project.name}
              </h1>
              <Badge status={project.status} />
            </div>

            {project.description && (
              <p className="text-xs text-slate-300 max-w-2xl leading-relaxed">
                {project.description}
              </p>
            )}

            <div className="flex items-center gap-4 text-xs text-slate-400 pt-1">
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Lead:</span>
                <span className="text-slate-200 font-medium">{project.owner.name}</span>
              </div>
              <div className="flex items-center gap-1.5">
                <span className="text-slate-500">Members:</span>
                <span className="text-slate-200 font-medium">{project.members.length}</span>
              </div>
            </div>
          </div>

          {/* Tab buttons */}
          <div className="flex items-center gap-1 bg-slate-950/70 p-1.5 rounded-xl border border-slate-800 self-start md:self-auto overflow-x-auto">
            <button
              onClick={() => setActiveTab("dashboard")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "dashboard"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              <span>Dashboard</span>
            </button>

            <button
              onClick={() => setActiveTab("tasks")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "tasks"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <CheckSquare className="w-3.5 h-3.5" />
              <span>Tasks</span>
            </button>

            <button
              onClick={() => setActiveTab("members")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "members"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Users className="w-3.5 h-3.5" />
              <span>Members</span>
            </button>

            <button
              onClick={() => setActiveTab("settings")}
              className={`flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all ${
                activeTab === "settings"
                  ? "bg-blue-600/20 text-blue-400 border border-blue-500/30"
                  : "text-slate-400 hover:text-white"
              }`}
            >
              <Settings className="w-3.5 h-3.5" />
              <span>Settings</span>
            </button>
          </div>
        </div>
      </div>

      {/* ================= TAB 1: DASHBOARD ================= */}
      {activeTab === "dashboard" && (
        <div className="space-y-6">
          {isStatsLoading || !dashboardStats ? (
            <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
              <Skeleton className="h-28 rounded-xl" />
            </div>
          ) : (
            <>
              {/* Metric Cards Row */}
              <div className="grid grid-cols-1 sm:grid-cols-4 gap-4">
                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Total Tasks
                  </div>
                  <div className="text-3xl font-bold text-white">
                    {dashboardStats.totalTasks}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Across all project tracks</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Completion
                  </div>
                  <div className="text-3xl font-bold text-emerald-400">
                    {Math.round(dashboardStats.completionPercentage)}%
                  </div>
                  <div className="text-xs text-slate-500 mt-1">
                    {dashboardStats.tasksByStatus.completed} completed tasks
                  </div>
                </div>

                <div
                  className={`rounded-xl border p-5 ${
                    dashboardStats.overdueTasks.count > 0
                      ? "border-red-500/30 bg-red-950/10 text-red-400"
                      : "border-slate-800 bg-slate-900/40 text-slate-400"
                  }`}
                >
                  <div className="text-xs font-semibold uppercase tracking-wider mb-1">
                    Overdue Tasks
                  </div>
                  <div
                    className={`text-3xl font-bold ${
                      dashboardStats.overdueTasks.count > 0 ? "text-red-400" : "text-white"
                    }`}
                  >
                    {dashboardStats.overdueTasks.count}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Requires immediate attention</div>
                </div>

                <div className="rounded-xl border border-slate-800 bg-slate-900/40 p-5">
                  <div className="text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1">
                    Active Collaborators
                  </div>
                  <div className="text-3xl font-bold text-blue-400">
                    {dashboardStats.members.length}
                  </div>
                  <div className="text-xs text-slate-500 mt-1">Working on deliverables</div>
                </div>
              </div>

              {/* Status Breakdown Bar */}
              <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                <h3 className="text-sm font-semibold text-white mb-3">Status Breakdown</h3>
                <div className="h-3 w-full rounded-full bg-slate-800 overflow-hidden flex mb-4">
                  {dashboardStats.totalTasks > 0 ? (
                    <>
                      <div
                        style={{
                          width: `${(dashboardStats.tasksByStatus.todo / dashboardStats.totalTasks) * 100}%`,
                        }}
                        className="bg-slate-500 transition-all duration-500"
                        title={`Todo: ${dashboardStats.tasksByStatus.todo}`}
                      />
                      <div
                        style={{
                          width: `${(dashboardStats.tasksByStatus.inProgress / dashboardStats.totalTasks) * 100}%`,
                        }}
                        className="bg-blue-500 transition-all duration-500"
                        title={`In Progress: ${dashboardStats.tasksByStatus.inProgress}`}
                      />
                      <div
                        style={{
                          width: `${(dashboardStats.tasksByStatus.review / dashboardStats.totalTasks) * 100}%`,
                        }}
                        className="bg-amber-500 transition-all duration-500"
                        title={`Review: ${dashboardStats.tasksByStatus.review}`}
                      />
                      <div
                        style={{
                          width: `${(dashboardStats.tasksByStatus.completed / dashboardStats.totalTasks) * 100}%`,
                        }}
                        className="bg-emerald-500 transition-all duration-500"
                        title={`Completed: ${dashboardStats.tasksByStatus.completed}`}
                      />
                    </>
                  ) : (
                    <div className="w-full bg-slate-800" />
                  )}
                </div>

                <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 text-xs">
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-slate-500" />
                    <span className="text-slate-400">To Do:</span>
                    <span className="font-semibold text-white">
                      {dashboardStats.tasksByStatus.todo}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-blue-500" />
                    <span className="text-slate-400">In Progress:</span>
                    <span className="font-semibold text-white">
                      {dashboardStats.tasksByStatus.inProgress}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-amber-500" />
                    <span className="text-slate-400">Review:</span>
                    <span className="font-semibold text-white">
                      {dashboardStats.tasksByStatus.review}
                    </span>
                  </div>
                  <div className="flex items-center gap-2">
                    <div className="w-2.5 h-2.5 rounded-full bg-emerald-500" />
                    <span className="text-slate-400">Completed:</span>
                    <span className="font-semibold text-white">
                      {dashboardStats.tasksByStatus.completed}
                    </span>
                  </div>
                </div>
              </div>

              {/* Two Column Grid: Overdue Tasks & Team Workload */}
              <div className="grid grid-cols-1 lg:grid-cols-2 gap-6">
                {/* Overdue Tasks List */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Clock className="w-4 h-4 text-red-400" />
                      <span>Overdue Tasks</span>
                    </h3>
                    <span className="text-xs px-2 py-0.5 rounded-full bg-red-950/60 border border-red-800/60 text-red-300 font-semibold">
                      {dashboardStats.overdueTasks.count}
                    </span>
                  </div>

                  {dashboardStats.overdueTasks.tasks.length === 0 ? (
                    <div className="py-8 text-center text-xs text-slate-500">
                      No overdue tasks! All timelines on track.
                    </div>
                  ) : (
                    <div className="space-y-2.5">
                      {dashboardStats.overdueTasks.tasks.slice(0, 5).map((t) => (
                        <div
                          key={t.id}
                          className="flex items-center justify-between p-3 rounded-xl border border-red-900/30 bg-red-950/10"
                        >
                          <div>
                            <div className="text-sm font-medium text-slate-200">{t.title}</div>
                            <div className="text-xs text-red-400 mt-0.5">
                              Due: {t.dueDate ? new Date(t.dueDate).toLocaleDateString() : ""}
                            </div>
                          </div>
                          <Badge priority={t.priority} />
                        </div>
                      ))}
                    </div>
                  )}
                </div>

                {/* Team Workload */}
                <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
                  <div className="flex items-center justify-between mb-4">
                    <h3 className="text-sm font-semibold text-white flex items-center gap-2">
                      <Users className="w-4 h-4 text-blue-400" />
                      <span>Team Workload</span>
                    </h3>
                    <span className="text-xs text-slate-400">
                      {dashboardStats.members.length} members
                    </span>
                  </div>

                  <div className="space-y-3">
                    {dashboardStats.members.map((m) => (
                      <div
                        key={m.id}
                        className="flex items-center justify-between p-2.5 rounded-xl border border-slate-800/60 bg-slate-950/40"
                      >
                        <div className="flex items-center gap-3">
                          <Avatar name={m.name} avatarUrl={m.avatar} size="sm" />
                          <div>
                            <div className="text-xs font-semibold text-slate-200">
                              {m.name} {m.role === "owner" && "★"}
                            </div>
                            <div className="text-[10px] text-slate-500">{m.email}</div>
                          </div>
                        </div>
                        <div className="text-right">
                          <div className="text-xs font-bold text-white">
                            {m.assignedTaskCount} tasks
                          </div>
                          <div className="text-[10px] text-slate-500">assigned</div>
                        </div>
                      </div>
                    ))}
                  </div>
                </div>
              </div>
            </>
          )}
        </div>
      )}

      {/* ================= TAB 2: TASKS ================= */}
      {activeTab === "tasks" && (
        <div className="space-y-6">
          {/* Action and Filter Bar */}
          <div className="flex flex-col gap-4 rounded-2xl border border-slate-800 bg-slate-900/40 p-5">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
              {/* Search */}
              <div className="relative flex-1 max-w-sm">
                <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-500" />
                <input
                  type="text"
                  placeholder="Filter tasks by keyword..."
                  value={searchTask}
                  onChange={(e) => setSearchTask(e.target.value)}
                  className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-800 bg-slate-950 text-xs text-slate-200 placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                />
              </div>

              {/* Action */}
              <Button onClick={() => setIsCreateTaskOpen(true)}>
                <Plus className="w-4 h-4 mr-1.5" />
                <span>New Task</span>
              </Button>
            </div>

            {/* Filters Row */}
            <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-800/70 text-xs">
              {/* Status filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Status:</span>
                <select
                  value={filterStatus}
                  onChange={(e) => setFilterStatus(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Statuses</option>
                  <option value={TaskStatus.TODO}>To Do</option>
                  <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                  <option value={TaskStatus.REVIEW}>Review</option>
                  <option value={TaskStatus.COMPLETED}>Completed</option>
                </select>
              </div>

              {/* Priority filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Priority:</span>
                <select
                  value={filterPriority}
                  onChange={(e) => setFilterPriority(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-200 focus:border-blue-500 focus:outline-none"
                >
                  <option value="ALL">All Priorities</option>
                  <option value={TaskPriority.LOW}>Low</option>
                  <option value={TaskPriority.MEDIUM}>Medium</option>
                  <option value={TaskPriority.HIGH}>High</option>
                  <option value={TaskPriority.URGENT}>Urgent</option>
                </select>
              </div>

              {/* Assignee filter */}
              <div className="flex items-center gap-1.5">
                <span className="text-slate-400">Assignee:</span>
                <select
                  value={filterAssignee}
                  onChange={(e) => setFilterAssignee(e.target.value)}
                  className="rounded-lg border border-slate-800 bg-slate-950 px-2.5 py-1 text-slate-200 focus:border-blue-500 focus:outline-none max-w-[160px] truncate"
                >
                  <option value="ALL">All Assignees</option>
                  <option value="UNASSIGNED">Unassigned</option>
                  {project.members.map((m) => (
                    <option key={m.userId} value={m.userId}>
                      {m.user.name}
                    </option>
                  ))}
                </select>
              </div>

              {/* Overdue toggle */}
              <button
                type="button"
                onClick={() => setOnlyOverdue(!onlyOverdue)}
                className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
                  onlyOverdue
                    ? "bg-red-950/60 border-red-500/40 text-red-300 shadow-sm"
                    : "bg-slate-950 border-slate-800 text-slate-400 hover:text-slate-200"
                }`}
              >
                Overdue Only
              </button>
            </div>
          </div>

          {/* Task Table */}
          {isTasksLoading ? (
            <div className="space-y-2">
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
              <Skeleton className="h-12 w-full rounded-xl" />
            </div>
          ) : tasks.length === 0 ? (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/30 p-12 text-center">
              <CheckSquare className="w-8 h-8 text-slate-600 mx-auto mb-2" />
              <h4 className="text-sm font-semibold text-slate-300">No tasks found</h4>
              <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
                No tasks match your filter criteria or none have been created yet.
              </p>
              <Button
                variant="secondary"
                size="sm"
                className="mt-4"
                onClick={() => setIsCreateTaskOpen(true)}
              >
                <Plus className="w-3.5 h-3.5 mr-1.5" />
                <span>Create Task</span>
              </Button>
            </div>
          ) : (
            <div className="rounded-2xl border border-slate-800 bg-slate-900/40 overflow-hidden shadow-xl">
              <div className="overflow-x-auto">
                <table className="w-full text-left text-xs">
                  <thead className="border-b border-slate-800 bg-slate-950/60 text-slate-400 uppercase font-semibold">
                    <tr>
                      <th className="py-3 px-4">Task</th>
                      <th className="py-3 px-4">Status</th>
                      <th className="py-3 px-4">Priority</th>
                      <th className="py-3 px-4">Assignee</th>
                      <th className="py-3 px-4">Due Date</th>
                      <th className="py-3 px-4 text-right">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-800/60 text-slate-300">
                    {tasks.map((task) => {
                      const isOverdue =
                        task.dueDate &&
                        new Date(task.dueDate) < new Date() &&
                        task.status !== TaskStatus.COMPLETED;
                      const isFormerMember = task.assigneeId && !task.isAssigneeActive;

                      return (
                        <tr
                          key={task.id}
                          className="hover:bg-slate-800/40 transition-colors cursor-pointer group"
                          onClick={() => setEditingTask(task)}
                        >
                          {/* Title & Desc */}
                          <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                            <div className="font-medium text-white group-hover:text-blue-400 transition-colors line-clamp-1">
                              {task.title}
                            </div>
                            {task.description && (
                              <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                                {task.description}
                              </div>
                            )}
                          </td>

                          {/* Inline Status Dropdown */}
                          <td
                            className="py-3.5 px-4 whitespace-nowrap"
                            onClick={(e) => e.stopPropagation()}
                          >
                            <select
                              value={task.status}
                              onChange={(e) =>
                                inlineStatusMutation.mutate({
                                  taskId: task.id,
                                  newStatus: e.target.value as TaskStatus,
                                })
                              }
                              className="rounded-lg border border-slate-800 bg-slate-950/80 px-2 py-1 text-xs text-slate-200 focus:border-blue-500 focus:outline-none"
                            >
                              <option value={TaskStatus.TODO}>To Do</option>
                              <option value={TaskStatus.IN_PROGRESS}>In Progress</option>
                              <option value={TaskStatus.REVIEW}>Review</option>
                              <option value={TaskStatus.COMPLETED}>Completed</option>
                            </select>
                          </td>

                          {/* Priority */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            <Badge priority={task.priority} />
                          </td>

                          {/* Assignee with Former Member warning */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.assignee ? (
                              <div className="flex items-center gap-2">
                                <Avatar
                                  name={task.assignee.name}
                                  avatarUrl={task.assignee.avatar}
                                  size="sm"
                                />
                                <div>
                                  <div className="font-medium text-slate-200">
                                    {task.assignee.name}
                                  </div>
                                  {isFormerMember && (
                                    <span className="inline-flex items-center gap-1 text-[10px] text-amber-400">
                                      <AlertTriangle className="w-2.5 h-2.5" />
                                      Former member
                                    </span>
                                  )}
                                </div>
                              </div>
                            ) : (
                              <span className="text-slate-500 italic">Unassigned</span>
                            )}
                          </td>

                          {/* Due date */}
                          <td className="py-3.5 px-4 whitespace-nowrap">
                            {task.dueDate ? (
                              <div
                                className={`flex items-center gap-1.5 ${
                                  isOverdue ? "text-red-400 font-medium" : "text-slate-400"
                                }`}
                              >
                                {isOverdue && <Clock className="w-3.5 h-3.5" />}
                                <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                              </div>
                            ) : (
                              <span className="text-slate-600">—</span>
                            )}
                          </td>

                          {/* Edit Action */}
                          <td className="py-3.5 px-4 text-right whitespace-nowrap">
                            <Button
                              variant="ghost"
                              size="sm"
                              onClick={(e) => {
                                e.stopPropagation();
                                setEditingTask(task);
                              }}
                            >
                              Edit
                            </Button>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ================= TAB 3: MEMBERS ================= */}
      {activeTab === "members" && (
        <div className="space-y-6">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-semibold text-white">Project Members</h3>
              <p className="text-xs text-slate-400 mt-0.5">
                Collaborators who have access to this project and can be assigned tasks.
              </p>
            </div>
            <Button onClick={() => setIsAddMemberOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>Add Member</span>
            </Button>
          </div>

          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 divide-y divide-slate-800/80 overflow-hidden">
            {project.members.map((m) => {
              const isOwner = m.role === "owner" || m.userId === project.ownerId;

              return (
                <div key={m.id} className="p-4 flex items-center justify-between gap-4">
                  <div className="flex items-center gap-3">
                    <Avatar name={m.user.name} avatarUrl={m.user.avatar} size="md" />
                    <div>
                      <div className="text-sm font-semibold text-white flex items-center gap-2">
                        <span>{m.user.name}</span>
                        {isOwner ? (
                          <Badge variant="owner">Project Owner</Badge>
                        ) : (
                          <Badge variant="secondary">Member</Badge>
                        )}
                      </div>
                      <div className="text-xs text-slate-400 mt-0.5">{m.user.email}</div>
                    </div>
                  </div>

                  {!isOwner && (
                    <Button
                      variant="ghost"
                      size="sm"
                      className="text-red-400 hover:text-red-300 hover:bg-red-950/40"
                      onClick={() => setMemberToRemove({ id: m.userId, name: m.user.name })}
                    >
                      <UserMinus className="w-4 h-4 mr-1.5" />
                      <span>Remove</span>
                    </Button>
                  )}
                </div>
              );
            })}
          </div>

          {/* Member Removal Confirmation Dialog */}
          <Dialog
            isOpen={!!memberToRemove}
            onClose={() => setMemberToRemove(null)}
            title="Remove Project Member"
            description={`Are you sure you want to remove ${memberToRemove?.name} from this project?`}
          >
            <div className="space-y-4 mt-2">
              <div className="p-3.5 rounded-xl bg-amber-950/30 border border-amber-800/50 text-xs text-amber-300 leading-relaxed">
                <span className="font-semibold">Task Retention Notice:</span> Any tasks currently
                assigned to {memberToRemove?.name} will remain in this project and marked with an
                inactive assignee indicator. You can reassign them at any time.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <Button variant="ghost" onClick={() => setMemberToRemove(null)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={removeMemberMutation.isPending}
                  onClick={() => memberToRemove && removeMemberMutation.mutate(memberToRemove.id)}
                >
                  {removeMemberMutation.isPending ? "Removing..." : "Confirm Removal"}
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      )}

      {/* ================= TAB 4: SETTINGS ================= */}
      {activeTab === "settings" && (
        <div className="space-y-8">
          {/* General Project Settings */}
          <div className="rounded-2xl border border-slate-800 bg-slate-900/40 p-6">
            <h3 className="text-base font-semibold text-white mb-1">Project Details</h3>
            <p className="text-xs text-slate-400 mb-5">
              Update project attributes, status roadmap, and project lead.
            </p>

            {settingsSuccess && <Alert variant="success">{settingsSuccess}</Alert>}
            {settingsError && <Alert variant="error">{settingsError}</Alert>}

            <div className="space-y-4 max-w-xl">
              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Project Name
                </label>
                <Input
                  value={editName}
                  onChange={(e) => setEditName(e.target.value)}
                  placeholder="Project name"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                  Description
                </label>
                <textarea
                  rows={3}
                  value={editDescription}
                  onChange={(e) => setEditDescription(e.target.value)}
                  className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500 resize-none"
                  placeholder="Goals and roadmap..."
                />
              </div>

              <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Status
                  </label>
                  <select
                    value={editStatus}
                    onChange={(e) => setEditStatus(e.target.value as ProjectStatus)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    <option value={ProjectStatus.PLANNING}>Planning</option>
                    <option value={ProjectStatus.ACTIVE}>Active</option>
                    <option value={ProjectStatus.ON_HOLD}>On Hold</option>
                    <option value={ProjectStatus.COMPLETED}>Completed</option>
                    <option value={ProjectStatus.ARCHIVED}>Archived</option>
                  </select>
                </div>

                <div>
                  <label className="block text-xs font-semibold uppercase tracking-wider text-slate-400 mb-1.5">
                    Project Owner
                  </label>
                  <select
                    value={editOwnerId}
                    onChange={(e) => setEditOwnerId(e.target.value)}
                    className="w-full rounded-xl border border-slate-800 bg-slate-950 px-3.5 py-2.5 text-sm text-slate-200 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
                  >
                    {project.members.map((m) => (
                      <option key={m.userId} value={m.userId}>
                        {m.user.name} ({m.user.email})
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="pt-2">
                <Button
                  onClick={() => updateProjectMutation.mutate()}
                  disabled={updateProjectMutation.isPending || !editName.trim()}
                >
                  <Save className="w-4 h-4 mr-2" />
                  <span>{updateProjectMutation.isPending ? "Saving..." : "Save Changes"}</span>
                </Button>
              </div>
            </div>
          </div>

          {/* Danger Zone: Project Deletion (Org Owner / Admin only) */}
          {isOrgAdmin && (
            <div className="rounded-2xl border border-red-900/40 bg-red-950/10 p-6">
              <h3 className="text-base font-semibold text-red-400 mb-1">Danger Zone</h3>
              <p className="text-xs text-slate-400 mb-4 max-w-xl leading-relaxed">
                Permanently delete this project. All associated tasks, milestones, and project
                memberships will be removed immediately. This action cannot be undone.
              </p>

              <Button
                variant="destructive"
                onClick={() => setIsDeleteProjectOpen(true)}
              >
                <Trash2 className="w-4 h-4 mr-2" />
                <span>Delete Project</span>
              </Button>
            </div>
          )}

          {/* Delete Project Confirmation Dialog */}
          <Dialog
            isOpen={isDeleteProjectOpen}
            onClose={() => setIsDeleteProjectOpen(false)}
            title="Delete Project Confirmation"
            description={`Are you sure you want to permanently delete "${project.name}"?`}
          >
            <div className="space-y-4 mt-2">
              <div className="p-3.5 rounded-xl bg-red-950/40 border border-red-800/80 text-xs text-red-300 leading-relaxed">
                Warning: This will permanently delete the project and all its {project.taskCounts.total} tasks.
              </div>

              <div className="flex items-center justify-end gap-3 pt-3 border-t border-slate-800/80">
                <Button variant="ghost" onClick={() => setIsDeleteProjectOpen(false)}>
                  Cancel
                </Button>
                <Button
                  variant="destructive"
                  disabled={deleteProjectMutation.isPending}
                  onClick={() => deleteProjectMutation.mutate()}
                >
                  {deleteProjectMutation.isPending ? "Deleting..." : "Permanently Delete"}
                </Button>
              </div>
            </div>
          </Dialog>
        </div>
      )}

      {/* Global Modals for this Project */}
      {matchingOrg && (
        <>
          <CreateTaskModal
            isOpen={isCreateTaskOpen}
            onClose={() => setIsCreateTaskOpen(false)}
            organizationId={matchingOrg.id}
            projectId={projectId}
            members={project.members}
          />

          <EditTaskModal
            isOpen={!!editingTask}
            onClose={() => setEditingTask(null)}
            task={editingTask}
            organizationId={matchingOrg.id}
            projectId={projectId}
            members={project.members}
          />

          <AddProjectMemberModal
            isOpen={isAddMemberOpen}
            onClose={() => setIsAddMemberOpen(false)}
            organizationId={matchingOrg.id}
            projectId={projectId}
            currentMembers={project.members}
          />
        </>
      )}
    </div>
  );
}
