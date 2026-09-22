"use client";

import React, { useState } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { OrganizationDTO, OrganizationDetailDTO, ProjectListItemDTO, ProjectStatus } from "@/types";
import { OrgSubNav } from "@/components/layout/org-sub-nav";
import { ProjectCard } from "@/components/projects/project-card";
import { CreateProjectModal } from "@/components/projects/create-project-modal";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import {
  FolderKanban,
  Plus,
  Search,
  SlidersHorizontal,
  FolderOpen,
  ArrowLeft,
  ShieldAlert,
} from "lucide-react";

const STATUS_FILTERS: Array<{ label: string; value: string }> = [
  { label: "All Projects", value: "ALL" },
  { label: "Planning", value: ProjectStatus.PLANNING },
  { label: "Active", value: ProjectStatus.ACTIVE },
  { label: "On Hold", value: ProjectStatus.ON_HOLD },
  { label: "Completed", value: ProjectStatus.COMPLETED },
  { label: "Archived", value: ProjectStatus.ARCHIVED },
];

export default function OrgProjectsPage() {
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  const [selectedStatus, setSelectedStatus] = useState<string>("ALL");
  const [searchQuery, setSearchQuery] = useState<string>("");
  const [isCreateOpen, setIsCreateOpen] = useState(false);

  // 1. Fetch user's organizations to verify membership and get org ID
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
      if (!matchingOrg) throw new Error("No access to organization");
      const res = await api.get<{ organization: OrganizationDetailDTO }>(
        `/organizations/${matchingOrg.id}`
      );
      return res.organization;
    },
    enabled: !!matchingOrg?.id,
  });

  // 3. Fetch projects list
  const {
    data: projectsData,
    isLoading: isProjectsLoading,
  } = useQuery({
    queryKey: [
      "projects",
      matchingOrg?.id,
      { status: selectedStatus === "ALL" ? undefined : selectedStatus, search: searchQuery },
    ],
    queryFn: async () => {
      if (!matchingOrg) return [];
      const queryParams = new URLSearchParams();
      if (selectedStatus !== "ALL") {
        queryParams.set("status", selectedStatus);
      }
      if (searchQuery.trim()) {
        queryParams.set("search", searchQuery.trim());
      }
      const qs = queryParams.toString() ? `?${queryParams.toString()}` : "";
      const res = await api.get<{ projects: ProjectListItemDTO[] }>(
        `/organizations/${matchingOrg.id}/projects${qs}`
      );
      return res.projects;
    },
    enabled: !!matchingOrg?.id,
  });

  if (isOrgsLoading) {
    return (
      <div className="space-y-6 max-w-6xl mx-auto">
        <Skeleton className="h-12 w-full rounded-xl" />
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      </div>
    );
  }

  if (!matchingOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">Organization Not Found</h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You do not have permission to view projects for this workspace.
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

  const role = orgDetail?.currentUserRole || matchingOrg.role;
  const canCreate = role === "OWNER" || role === "ADMIN";
  const projects = projectsData || [];

  return (
    <div className="space-y-8 max-w-6xl mx-auto">
      {/* Top Header & Workspace Sub-Navigation */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div>
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-purple-500/10 dark:bg-purple-600/20 border border-purple-500/30 text-purple-600 dark:text-purple-400">
              <FolderKanban className="w-5 h-5" />
            </div>
            <div>
              <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">Projects</h1>
              <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
                Manage milestones, cross-functional initiatives, and roadmaps for{" "}
                <span className="text-slate-700 dark:text-slate-300 font-medium">{orgDetail?.name || matchingOrg.name}</span>
              </p>
            </div>
          </div>
        </div>

        <OrgSubNav orgSlug={orgSlug} />
      </div>

      {/* Control Bar: Search, Status Filter Pills & New Project Button */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        {/* Search input */}
        <div className="relative flex-1 max-w-md">
          <Search className="absolute left-3.5 top-1/2 -translate-y-1/2 w-4 h-4 text-slate-400 dark:text-slate-500" />
          <input
            type="text"
            placeholder="Search projects by name..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="w-full pl-10 pr-4 py-2 rounded-xl border border-slate-300 dark:border-slate-800 bg-white dark:bg-slate-900/60 text-sm text-slate-900 dark:text-slate-200 placeholder-slate-400 dark:placeholder-slate-500 focus:border-blue-500 focus:outline-none focus:ring-1 focus:ring-blue-500"
          />
        </div>

        {/* Right side actions */}
        <div className="flex items-center gap-3">
          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-1.5" />
              <span>New Project</span>
            </Button>
          )}
        </div>
      </div>

      {/* Status Filter Tabs */}
      <div className="flex items-center gap-2 overflow-x-auto pb-1">
        {STATUS_FILTERS.map((f) => {
          const isActive = selectedStatus === f.value;
          return (
            <button
              key={f.value}
              onClick={() => setSelectedStatus(f.value)}
              className={`px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 shrink-0 border ${
                isActive
                  ? "bg-blue-50 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-300 dark:border-blue-500/40 shadow-xs"
                  : "bg-white dark:bg-slate-900/40 text-slate-600 dark:text-slate-400 border-slate-200 dark:border-slate-800/80 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-slate-200"
              }`}
            >
              {f.label}
            </button>
          );
        })}
      </div>

      {/* Projects Grid */}
      {isProjectsLoading ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
          <Skeleton className="h-48 rounded-2xl" />
        </div>
      ) : projects.length > 0 ? (
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {projects.map((project) => (
            <ProjectCard key={project.id} project={project} orgSlug={orgSlug} />
          ))}
        </div>
      ) : (
        /* Empty State */
        <div className="rounded-2xl border border-slate-200 dark:border-slate-800/80 bg-white dark:bg-slate-900/30 backdrop-blur-xl p-12 text-center shadow-xs">
          <div className="mx-auto w-14 h-14 rounded-2xl bg-purple-500/10 dark:bg-purple-600/10 border border-purple-500/20 text-purple-600 dark:text-purple-400 flex items-center justify-center mb-4">
            <FolderOpen className="w-7 h-7" />
          </div>
          <h3 className="text-lg font-semibold text-slate-900 dark:text-white mb-1.5">
            {searchQuery.trim() || selectedStatus !== "ALL"
              ? "No matching projects"
              : "No projects created yet"}
          </h3>
          <p className="text-sm text-slate-500 dark:text-slate-400 max-w-sm mx-auto mb-6">
            {searchQuery.trim() || selectedStatus !== "ALL"
              ? "Try adjusting your filters or search keywords to find what you're looking for."
              : "Get started by organizing tasks, sprints, and initiatives within this workspace."}
          </p>
          {canCreate && (
            <Button onClick={() => setIsCreateOpen(true)}>
              <Plus className="w-4 h-4 mr-2" />
              <span>Create First Project</span>
            </Button>
          )}
        </div>
      )}

      {/* Create Project Modal */}
      {matchingOrg && (
        <CreateProjectModal
          isOpen={isCreateOpen}
          onClose={() => setIsCreateOpen(false)}
          organizationId={matchingOrg.id}
        />
      )}
    </div>
  );
}
