"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import {
  OrganizationDTO,
  OrganizationDetailDTO,
  ProjectListItemDTO,
  TaskDTO,
  TaskStatus,
  TaskPriority,
} from "@/types";
import { OrgSubNav } from "@/components/layout/org-sub-nav";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  CheckSquare,
  Search,
  Clock,
  ArrowRight,
  FolderKanban,
  CheckCircle2,
  ShieldAlert,
  ArrowLeft,
} from "lucide-react";

export default function MyTasksPage() {
  const params = useParams();
  const queryClient = useQueryClient();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  const [search, setSearch] = useState("");
  const [filterProjectId, setFilterProjectId] = useState<string>("ALL");
  const [filterStatus, setFilterStatus] = useState<string>("ALL");
  const [filterPriority, setFilterPriority] = useState<string>("ALL");
  const [onlyOverdue, setOnlyOverdue] = useState(false);

  // 1. Fetch user's organizations
  const { data: userOrgs, isLoading: isOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>("/organizations");
      return res.organizations;
    },
  });

  const matchingOrg = (userOrgs || []).find((org) => org.slug === orgSlug);

  // 2. Fetch org details
  const { data: orgDetail } = useQuery({
    queryKey: ["organization", matchingOrg?.id],
    queryFn: async () => {
      if (!matchingOrg) throw new Error("No organization");
      const res = await api.get<{ organization: OrganizationDetailDTO }>(
        `/organizations/${matchingOrg.id}`
      );
      return res.organization;
    },
    enabled: !!matchingOrg?.id,
  });

  // 3. Fetch workspace projects for the filter dropdown
  const { data: projectsData } = useQuery({
    queryKey: ["projects", matchingOrg?.id],
    queryFn: async () => {
      if (!matchingOrg) return [];
      const res = await api.get<{ projects: ProjectListItemDTO[] }>(
        `/organizations/${matchingOrg.id}/projects`
      );
      return res.projects;
    },
    enabled: !!matchingOrg?.id,
  });

  // 4. Fetch My Tasks across all projects
  const { data: tasksData, isLoading: isTasksLoading } = useQuery({
    queryKey: [
      "my-tasks",
      matchingOrg?.id,
      {
        search,
        projectId: filterProjectId !== "ALL" ? filterProjectId : undefined,
        status: filterStatus !== "ALL" ? filterStatus : undefined,
        priority: filterPriority !== "ALL" ? filterPriority : undefined,
        overdue: onlyOverdue,
      },
    ],
    queryFn: async () => {
      if (!matchingOrg) return [];
      const qs = new URLSearchParams();
      qs.set("assigneeId", "me");
      if (search.trim()) qs.set("search", search.trim());
      if (filterProjectId !== "ALL") qs.set("projectId", filterProjectId);
      if (filterStatus !== "ALL") qs.set("status", filterStatus);
      if (filterPriority !== "ALL") qs.set("priority", filterPriority);
      if (onlyOverdue) qs.set("overdue", "true");

      const res = await api.get<{ tasks: TaskDTO[] }>(
        `/organizations/${matchingOrg.id}/tasks?${qs.toString()}`
      );
      return res.tasks;
    },
    enabled: !!matchingOrg?.id,
  });

  // Inline status triage
  const inlineStatusMutation = useMutation({
    mutationFn: async ({
      projectId,
      taskId,
      newStatus,
    }: {
      projectId: string;
      taskId: string;
      newStatus: TaskStatus;
    }) => {
      if (!matchingOrg) return;
      return api.patch(
        `/organizations/${matchingOrg.id}/projects/${projectId}/tasks/${taskId}`,
        { status: newStatus }
      );
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["my-tasks", matchingOrg?.id] });
      queryClient.invalidateQueries({ queryKey: ["organization", matchingOrg?.id] });
    },
  });

  if (isOrgsLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-full rounded-xl" />
        <Skeleton className="h-64 w-full rounded-2xl" />
      </div>
    );
  }

  if (!matchingOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Workspace Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You do not have access to this organization.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Dashboard</span>
          </Button>
        </Link>
      </div>
    );
  }

  const tasks = tasksData || [];
  const projects = projectsData || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header & Sub-Nav */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-emerald-500/10 dark:bg-emerald-600/20 border border-emerald-500/30 text-emerald-600 dark:text-emerald-400">
              <CheckSquare className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">My Tasks</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Work items assigned to you across all projects in{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">{orgDetail?.name || matchingOrg.name}</span>
              </p>
            </div>
          </div>
        </div>

        <OrgSubNav orgSlug={orgSlug} />
      </div>

      {/* Filter Bar */}
      <div className="flex flex-col gap-4 rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-5 shadow-xs">
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          {/* Search */}
          <div className="relative flex-1 max-w-sm">
            <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
            <input
              type="text"
              placeholder="Search your tasks..."
              value={search}
              onChange={(e) => setSearch(e.target.value)}
              className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 text-xs text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
            />
          </div>

          <div className="text-xs text-slate-500 dark:text-slate-400">
            Showing <span className="font-semibold text-slate-900 dark:text-white">{tasks.length}</span> assigned items
          </div>
        </div>

        {/* Filter Controls Row */}
        <div className="flex flex-wrap items-center gap-3 pt-3 border-t border-slate-200 dark:border-slate-800/70 text-xs">
          {/* Project filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Project:</span>
            <select
              value={filterProjectId}
              onChange={(e) => setFilterProjectId(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none max-w-[160px] truncate"
            >
              <option value="ALL">All Projects</option>
              {projects.map((p) => (
                <option key={p.id} value={p.id}>
                  {p.name}
                </option>
              ))}
            </select>
          </div>

          {/* Status filter */}
          <div className="flex items-center gap-1.5">
            <span className="text-slate-600 dark:text-slate-400">Status:</span>
            <select
              value={filterStatus}
              onChange={(e) => setFilterStatus(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
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
            <span className="text-slate-600 dark:text-slate-400">Priority:</span>
            <select
              value={filterPriority}
              onChange={(e) => setFilterPriority(e.target.value)}
              className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950 px-2.5 py-1 text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
            >
              <option value="ALL">All Priorities</option>
              <option value={TaskPriority.LOW}>Low</option>
              <option value={TaskPriority.MEDIUM}>Medium</option>
              <option value={TaskPriority.HIGH}>High</option>
              <option value={TaskPriority.URGENT}>Urgent</option>
            </select>
          </div>

          {/* Overdue toggle */}
          <button
            type="button"
            onClick={() => setOnlyOverdue(!onlyOverdue)}
            className={`px-3 py-1 rounded-lg border text-xs font-medium transition-all ${
              onlyOverdue
                ? "bg-red-100 dark:bg-red-950/60 border-red-300 dark:border-red-500/40 text-red-700 dark:text-red-300 shadow-xs"
                : "bg-white dark:bg-slate-950 border-slate-300 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-slate-200"
            }`}
          >
            Overdue Only
          </button>
        </div>
      </div>

      {/* Task List Table */}
      {isTasksLoading ? (
        <div className="space-y-2">
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
          <Skeleton className="h-12 w-full rounded-xl" />
        </div>
      ) : tasks.length === 0 ? (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/30 p-12 text-center shadow-xs">
          <CheckCircle2 className="w-8 h-8 text-emerald-500/80 mx-auto mb-2" />
          <h4 className="text-sm font-semibold text-slate-700 dark:text-slate-300">All caught up!</h4>
          <p className="text-xs text-slate-500 mt-1 max-w-sm mx-auto">
            You don&apos;t have any active tasks matching your current filter in this workspace.
          </p>
          <Link href={`/dashboard/${orgSlug}/projects`} className="mt-4 inline-block">
            <Button variant="secondary" size="sm">
              <FolderKanban className="w-3.5 h-3.5 mr-1.5" />
              <span>Browse Projects</span>
            </Button>
          </Link>
        </div>
      ) : (
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-xs dark:shadow-xl">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="border-b border-slate-200 dark:border-slate-800 bg-slate-50 dark:bg-slate-950/60 text-slate-600 dark:text-slate-400 uppercase font-semibold">
                <tr>
                  <th className="py-3 px-4">Project</th>
                  <th className="py-3 px-4">Task</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Priority</th>
                  <th className="py-3 px-4">Due Date</th>
                  <th className="py-3 px-4 text-right">View</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-200 dark:divide-slate-800/60 text-slate-700 dark:text-slate-300">
                {tasks.map((task) => {
                  const isOverdue =
                    task.dueDate &&
                    new Date(task.dueDate) < new Date() &&
                    task.status !== TaskStatus.COMPLETED;

                  return (
                    <tr key={task.id} className="hover:bg-slate-50 dark:hover:bg-slate-800/40 transition-colors">
                      {/* Project Link */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <Link
                          href={`/dashboard/${orgSlug}/projects/${task.projectId}`}
                          className="font-medium text-blue-600 dark:text-blue-400 hover:text-blue-500 dark:hover:text-blue-300 hover:underline flex items-center gap-1.5"
                        >
                          <FolderKanban className="w-3.5 h-3.5" />
                          <span>{task.project?.name || "Project"}</span>
                        </Link>
                      </td>

                      {/* Task Title & Desc */}
                      <td className="py-3.5 px-4 max-w-xs sm:max-w-md">
                        <div className="font-medium text-slate-900 dark:text-white line-clamp-1">{task.title}</div>
                        {task.description && (
                          <div className="text-[11px] text-slate-500 line-clamp-1 mt-0.5">
                            {task.description}
                          </div>
                        )}
                      </td>

                      {/* Inline Status Dropdown */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        <select
                          value={task.status}
                          onChange={(e) =>
                            inlineStatusMutation.mutate({
                              projectId: task.projectId,
                              taskId: task.id,
                              newStatus: e.target.value as TaskStatus,
                            })
                          }
                          className="rounded-lg border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-950/80 px-2 py-1 text-xs text-slate-900 dark:text-slate-200 focus:border-blue-500 focus:outline-none"
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

                      {/* Due Date */}
                      <td className="py-3.5 px-4 whitespace-nowrap">
                        {task.dueDate ? (
                          <div
                            className={`flex items-center gap-1.5 ${
                              isOverdue ? "text-red-600 dark:text-red-400 font-medium" : "text-slate-600 dark:text-slate-400"
                            }`}
                          >
                            {isOverdue && <Clock className="w-3.5 h-3.5" />}
                            <span>{new Date(task.dueDate).toLocaleDateString()}</span>
                          </div>
                        ) : (
                          <span className="text-slate-400 dark:text-slate-600">—</span>
                        )}
                      </td>

                      {/* Link to project */}
                      <td className="py-3.5 px-4 text-right whitespace-nowrap">
                        <Link href={`/dashboard/${orgSlug}/projects/${task.projectId}`}>
                          <Button variant="ghost" size="sm">
                            <span>Open</span>
                            <ArrowRight className="w-3.5 h-3.5 ml-1" />
                          </Button>
                        </Link>
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
  );
}
