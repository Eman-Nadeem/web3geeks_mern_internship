"use client";

import React, { useState } from "react";
import { useQuery } from "@tanstack/react-query";
import {
  Activity,
  CheckCircle2,
  Clock,
  MessageSquare,
  PlusCircle,
  Trash2,
  UserPlus,
  UserMinus,
  Shield,
  FolderPlus,
  Edit,
  Loader2,
  ChevronLeft,
  ChevronRight,
} from "lucide-react";
import { api } from "@/lib/api-client";
import type { ActivityDTO, ActivityType } from "@/types";

interface ActivityFeedProps {
  organizationId: string;
  projectId?: string;
}

function formatRelativeTime(dateString: string): string {
  const now = Date.now();
  const date = new Date(dateString).getTime();
  const diffSec = Math.floor((now - date) / 1000);

  if (diffSec < 60) return "Just now";
  const diffMin = Math.floor(diffSec / 60);
  if (diffMin < 60) return `${diffMin}m ago`;
  const diffHours = Math.floor(diffMin / 60);
  if (diffHours < 24) return `${diffHours}h ago`;
  const diffDays = Math.floor(diffHours / 24);
  if (diffDays < 7) return `${diffDays}d ago`;
  return new Date(dateString).toLocaleDateString();
}

function getActivityIcon(type: ActivityType) {
  switch (type) {
    case "TASK_CREATED":
      return <PlusCircle className="w-4 h-4 text-emerald-500" />;
    case "TASK_UPDATED":
    case "PROJECT_UPDATED":
      return <Edit className="w-4 h-4 text-blue-500" />;
    case "TASK_STATUS_CHANGED":
      return <CheckCircle2 className="w-4 h-4 text-purple-500" />;
    case "TASK_COMMENT_ADDED":
      return <MessageSquare className="w-4 h-4 text-sky-500" />;
    case "TASK_DELETED":
    case "TASK_COMMENT_DELETED":
    case "PROJECT_DELETED":
      return <Trash2 className="w-4 h-4 text-rose-500" />;
    case "MEMBER_ADDED":
      return <UserPlus className="w-4 h-4 text-green-500" />;
    case "MEMBER_REMOVED":
      return <UserMinus className="w-4 h-4 text-amber-500" />;
    case "MEMBER_ROLE_CHANGED":
      return <Shield className="w-4 h-4 text-indigo-500" />;
    case "PROJECT_CREATED":
      return <FolderPlus className="w-4 h-4 text-indigo-500" />;
    default:
      return <Activity className="w-4 h-4 text-slate-400" />;
  }
}

function formatActivityMessage(activity: ActivityDTO): { action: string; target: string } {
  const meta = (activity.meta || {}) as Record<string, any>;
  switch (activity.type) {
    case "TASK_CREATED":
      return { action: "created task", target: meta.title || "a task" };
    case "TASK_UPDATED":
      return { action: "updated task", target: meta.title || "a task" };
    case "TASK_STATUS_CHANGED":
      return {
        action: `changed status to ${meta.to || "updated"} on`,
        target: meta.title || "task",
      };
    case "TASK_DELETED":
      return { action: "deleted task", target: meta.title || "a task" };
    case "TASK_ASSIGNED":
      return { action: "assigned task", target: meta.title || "a task" };
    case "TASK_COMMENT_ADDED":
      return { action: "commented on task", target: meta.taskTitle || "a task" };
    case "TASK_COMMENT_DELETED":
      return { action: "deleted comment on task", target: meta.taskTitle || "a task" };
    case "PROJECT_CREATED":
      return { action: "created project", target: meta.name || "a project" };
    case "PROJECT_UPDATED":
      return { action: "updated project", target: meta.name || "a project" };
    case "PROJECT_DELETED":
      return { action: "deleted project", target: meta.name || "a project" };
    case "MEMBER_ADDED":
      return { action: "added team member", target: meta.email || "a member" };
    case "MEMBER_REMOVED":
      return { action: "removed team member", target: meta.email || "a member" };
    case "MEMBER_ROLE_CHANGED":
      return { action: `changed role to ${meta.newRole || "new role"} for`, target: meta.email || "member" };
    default:
      return { action: "performed action", target: "" };
  }
}

export function ActivityFeed({ organizationId, projectId }: ActivityFeedProps) {
  const [page, setPage] = useState(1);
  const [filterType, setFilterType] = useState<string>("ALL");

  const endpoint = projectId
    ? `/organizations/${organizationId}/projects/${projectId}/activity`
    : `/organizations/${organizationId}/activity`;

  const { data, isLoading } = useQuery({
    queryKey: ["activity", { organizationId, projectId, page, filterType }],
    queryFn: async () => {
      const params = new URLSearchParams({
        page: String(page),
        limit: "20",
      });
      if (filterType !== "ALL") {
        params.set("type", filterType);
      }
      const res = await api.get<{
        activities: ActivityDTO[];
        total: number;
        page: number;
        limit: number;
        totalPages: number;
      }>(`${endpoint}?${params}`);
      return res;
    },
    enabled: !!organizationId,
  });

  const activities = data?.activities || [];
  const totalPages = data?.totalPages || 1;

  return (
    <div className="space-y-4">
      {/* Filters */}
      <div className="flex items-center justify-between gap-2 flex-wrap">
        <div className="flex items-center gap-1.5 overflow-x-auto pb-1 text-xs">
          {[
            { label: "All Activity", value: "ALL" },
            { label: "Tasks", value: "TASK_CREATED" },
            { label: "Comments", value: "TASK_COMMENT_ADDED" },
            { label: "Members", value: "MEMBER_ADDED" },
          ].map((item) => (
            <button
              key={item.value}
              type="button"
              onClick={() => {
                setFilterType(item.value);
                setPage(1);
              }}
              className={`px-3 py-1.5 rounded-lg font-medium transition-all ${
                filterType === item.value
                  ? "bg-blue-600 text-white shadow-sm shadow-blue-500/20"
                  : "bg-slate-100 dark:bg-slate-800/80 text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white"
              }`}
            >
              {item.label}
            </button>
          ))}
        </div>

        <div className="text-xs text-slate-400">
          Total: <span className="font-semibold text-slate-700 dark:text-slate-300">{data?.total || 0}</span>
        </div>
      </div>

      {/* Timeline List */}
      <div className="bg-white dark:bg-[#0f172a] rounded-2xl border border-slate-200 dark:border-slate-800 shadow-sm overflow-hidden">
        {isLoading ? (
          <div className="py-16 flex flex-col items-center justify-center gap-2 text-slate-400">
            <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
            <span className="text-xs">Loading activity log...</span>
          </div>
        ) : activities.length === 0 ? (
          <div className="py-16 text-center">
            <div className="w-10 h-10 mx-auto rounded-full bg-slate-100 dark:bg-slate-800 flex items-center justify-center text-slate-400 mb-2">
              <Activity className="w-5 h-5" />
            </div>
            <p className="text-sm font-medium text-slate-700 dark:text-slate-300">
              No activity recorded yet
            </p>
            <p className="text-xs text-slate-400 dark:text-slate-500 mt-0.5">
              Actions and events will appear here in chronological order.
            </p>
          </div>
        ) : (
          <div className="divide-y divide-slate-100 dark:divide-slate-800/60">
            {activities.map((item) => {
              const { action, target } = formatActivityMessage(item);
              return (
                <div
                  key={item.id}
                  className="p-4 flex items-start gap-3 hover:bg-slate-50/60 dark:hover:bg-slate-800/30 transition-colors"
                >
                  <div className="p-2 rounded-xl bg-slate-100 dark:bg-slate-800/80 shrink-0">
                    {getActivityIcon(item.type)}
                  </div>

                  <div className="flex-1 min-w-0">
                    <p className="text-xs text-slate-900 dark:text-slate-200 leading-relaxed">
                      <span className="font-semibold text-slate-900 dark:text-white">
                        {item.actor?.name || "Someone"}
                      </span>{" "}
                      <span className="text-slate-600 dark:text-slate-400">{action}</span>{" "}
                      {target && (
                        <span className="font-medium text-slate-900 dark:text-slate-100">
                          &ldquo;{target}&rdquo;
                        </span>
                      )}
                    </p>

                    <div className="flex items-center gap-2 mt-1 text-[11px] text-slate-400">
                      <Clock className="w-3 h-3" />
                      <span>{formatRelativeTime(item.createdAt)}</span>
                    </div>
                  </div>
                </div>
              );
            })}
          </div>
        )}

        {/* Pagination Bar */}
        {totalPages > 1 && (
          <div className="px-4 py-3 border-t border-slate-100 dark:border-slate-800/80 flex items-center justify-between text-xs bg-slate-50/50 dark:bg-slate-900/50">
            <span className="text-slate-500">
              Page {page} of {totalPages}
            </span>
            <div className="flex items-center gap-1.5">
              <button
                type="button"
                disabled={page <= 1}
                onClick={() => setPage((p) => Math.max(p - 1, 1))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronLeft className="w-3.5 h-3.5" />
              </button>
              <button
                type="button"
                disabled={page >= totalPages}
                onClick={() => setPage((p) => Math.min(p + 1, totalPages))}
                className="p-1.5 rounded-lg border border-slate-200 dark:border-slate-800 text-slate-600 dark:text-slate-400 hover:bg-slate-100 dark:hover:bg-slate-800 disabled:opacity-40 transition-colors"
              >
                <ChevronRight className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
