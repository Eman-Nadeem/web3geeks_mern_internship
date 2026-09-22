"use client";

import React, { useState, useEffect } from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { OrganizationDTO, OrganizationDetailDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Button } from "@/components/ui/button";
import { Card, CardContent, CardHeader, CardTitle } from "@/components/ui/card";
import { Skeleton } from "@/components/ui/skeleton";
import { MemberManagement } from "@/components/organizations/member-management";
import { RenameOrgModal } from "@/components/organizations/rename-org-modal";
import { DeleteOrgModal } from "@/components/organizations/delete-org-modal";
import { OrgSubNav } from "@/components/layout/org-sub-nav";
import {
  Building2,
  Users,
  FolderKanban,
  CheckSquare,
  ShieldAlert,
  ArrowLeft,
  Settings,
  LayoutDashboard,
} from "lucide-react";

export default function OrgDashboardPage() {
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  const [isRenameOpen, setIsRenameOpen] = useState(false);
  const [isDeleteOpen, setIsDeleteOpen] = useState(false);

  // 1. Fetch user's allowed organizations list
  const {
    data: userOrgs,
    isLoading: isOrgsLoading,
  } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>(
        "/organizations"
      );
      return res.organizations;
    },
  });

  const matchingOrg = (userOrgs || []).find((org) => org.slug === orgSlug);

  // Save current slug to localStorage as last visited
  useEffect(() => {
    if (matchingOrg) {
      localStorage.setItem("last_org_slug", matchingOrg.slug);
    }
  }, [matchingOrg]);

  // 2. Fetch org details ONLY if the org is verified in the user's allowed list
  const {
    data: orgDetail,
  } = useQuery({
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

  if (isOrgsLoading) {
    return (
      <div className="space-y-6">
        <div className="flex items-center justify-between">
          <div className="space-y-2">
            <Skeleton className="h-8 w-48" />
            <Skeleton className="h-4 w-28" />
          </div>
          <Skeleton className="h-9 w-32" />
        </div>
        <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
          <Skeleton className="h-28 rounded-xl" />
        </div>
      </div>
    );
  }

  // If user does not belong to this org
  if (!matchingOrg) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400 mb-4">
          <ShieldAlert className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          Organization Not Found or Access Denied
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
          You do not belong to an organization with slug &ldquo;{orgSlug}&rdquo; or it does not exist.
        </p>
        <Link href="/dashboard">
          <Button variant="secondary">
            <ArrowLeft className="w-4 h-4 mr-2" />
            <span>Return to Your Dashboard</span>
          </Button>
        </Link>
      </div>
    );
  }

  const role = orgDetail?.currentUserRole || matchingOrg.role;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header Card */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm dark:shadow-xl">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="flex items-start gap-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 dark:bg-blue-600/20 border border-blue-500/30 text-blue-600 dark:text-blue-400 flex items-center justify-center overflow-hidden shrink-0 mt-0.5">
              {orgDetail?.logoUrl ? (
                <img
                  src={orgDetail.logoUrl}
                  alt={orgDetail.name}
                  className="w-full h-full object-cover"
                />
              ) : (
                <Building2 className="w-7 h-7" />
              )}
            </div>
            <div className="space-y-1">
              <div className="flex items-center gap-3">
                <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight">
                  {orgDetail?.name || matchingOrg.name}
                </h1>
                <Badge role={role} />
              </div>
              {orgDetail?.description ? (
                <p className="text-xs text-slate-600 dark:text-slate-300 max-w-xl line-clamp-2">
                  {orgDetail.description}
                </p>
              ) : (
                <p className="text-xs text-slate-500 dark:text-slate-400">
                  Workspace Slug: <span className="font-mono text-slate-700 dark:text-slate-300">/{orgSlug}</span>
                </p>
              )}
            </div>
          </div>

          {/* Sub-Nav */}
          <OrgSubNav orgSlug={orgSlug} />
        </div>
      </div>

      {/* Metrics Row */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
        {/* Members Count */}
        <Link href={`/dashboard/${orgSlug}/members`} className="block group">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-blue-600 dark:group-hover:text-blue-400 transition-colors">
                Members
              </CardTitle>
              <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {orgDetail ? orgDetail.counts.members : matchingOrg.memberCount}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active team collaborators</p>
            </CardContent>
          </Card>
        </Link>

        {/* Projects Card */}
        <Link href={`/dashboard/${orgSlug}/projects`} className="block group">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-purple-600 dark:group-hover:text-purple-400 transition-colors">
                Projects
              </CardTitle>
              <FolderKanban className="w-4 h-4 text-purple-600 dark:text-purple-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {orgDetail ? orgDetail.counts.projects : 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Active workspace projects</p>
            </CardContent>
          </Card>
        </Link>

        {/* Tasks Card */}
        <Link href={`/dashboard/${orgSlug}/my-tasks`} className="block group">
          <Card className="border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 hover:border-slate-300 dark:hover:border-slate-700 transition-colors shadow-xs">
            <CardHeader className="flex flex-row items-center justify-between pb-2 border-none">
              <CardTitle className="text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400 group-hover:text-emerald-600 dark:group-hover:text-emerald-400 transition-colors">
                Tasks
              </CardTitle>
              <CheckSquare className="w-4 h-4 text-emerald-600 dark:text-emerald-400" />
            </CardHeader>
            <CardContent>
              <div className="text-3xl font-bold text-slate-900 dark:text-white">
                {orgDetail ? orgDetail.counts.tasks : 0}
              </div>
              <p className="text-xs text-slate-500 mt-1">Workspace & personal tasks</p>
            </CardContent>
          </Card>
        </Link>
      </div>

      {/* Team Collaboration Section */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 p-6 shadow-sm dark:shadow-xl">
        <MemberManagement organizationId={matchingOrg.id} actorRole={role} />
      </div>

      {/* Modals */}
      {matchingOrg && (
        <>
          <RenameOrgModal
            isOpen={isRenameOpen}
            onClose={() => setIsRenameOpen(false)}
            organizationId={matchingOrg.id}
            currentName={orgDetail?.name || matchingOrg.name}
          />
          <DeleteOrgModal
            isOpen={isDeleteOpen}
            onClose={() => setIsDeleteOpen(false)}
            organizationId={matchingOrg.id}
            organizationName={orgDetail?.name || matchingOrg.name}
          />
        </>
      )}
    </div>
  );
}
