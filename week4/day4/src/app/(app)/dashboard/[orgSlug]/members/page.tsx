"use client";

import React from "react";
import { useParams } from "next/navigation";
import Link from "next/link";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { OrganizationDTO, OrganizationDetailDTO, UserRole } from "@/types";
import { MemberManagement } from "@/components/organizations/member-management";
import { OrgSubNav } from "@/components/layout/org-sub-nav";
import { Button } from "@/components/ui/button";
import { Skeleton } from "@/components/ui/skeleton";
import { Alert } from "@/components/ui/alert";
import {
  Users,
  ArrowLeft,
  LayoutDashboard,
  Settings,
} from "lucide-react";

export default function OrgMembersPage() {
  const params = useParams();
  const orgSlug = typeof params.orgSlug === "string" ? params.orgSlug : "";

  // 1. Fetch user's allowed organizations list
  const { data: userOrgs, isLoading: isOrgsLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>("/organizations");
      return res.organizations;
    },
  });

  const matchingOrg = (userOrgs || []).find((org) => org.slug === orgSlug);

  // 2. Fetch org details
  const {
    data: orgDetail,
    isLoading: isDetailLoading,
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

  if (isOrgsLoading || isDetailLoading) {
    return (
      <div className="space-y-6">
        <Skeleton className="h-10 w-48" />
        <Skeleton className="h-64 rounded-2xl" />
      </div>
    );
  }

  if (!matchingOrg) {
    return (
      <div className="text-center py-20">
        <Alert variant="error">Organization not found or access denied.</Alert>
        <Link href="/dashboard" className="mt-4 inline-block">
          <Button variant="secondary">Back to Dashboard</Button>
        </Link>
      </div>
    );
  }

  const role = (orgDetail?.currentUserRole || matchingOrg.role || "MEMBER") as UserRole;

  return (
    <div className="space-y-8 max-w-5xl mx-auto">
      {/* Top Header & Navigation */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-slate-200 dark:border-slate-800">
        <div className="flex items-center gap-3">
          <Link href={`/dashboard/${orgSlug}`}>
            <Button variant="ghost" size="sm" className="h-9 px-2.5">
              <ArrowLeft className="w-4 h-4 mr-1.5" />
              <span>Back</span>
            </Button>
          </Link>
          <div>
            <h1 className="text-2xl font-bold text-slate-900 dark:text-white tracking-tight flex items-center gap-2.5">
              <Users className="w-6 h-6 text-blue-600 dark:text-blue-400" />
              <span>Team Members & Invitations</span>
            </h1>
            <p className="text-xs text-slate-500 dark:text-slate-400 mt-0.5">
              Manage collaborators and pending invitations for {orgDetail?.name || matchingOrg.name}
            </p>
          </div>
        </div>

        {/* Sub-nav tabs */}
        <OrgSubNav orgSlug={orgSlug} />
      </div>

      {/* Main Member Management Container */}
      <div className="rounded-2xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/60 backdrop-blur-xl p-6 shadow-sm dark:shadow-xl">
        <MemberManagement organizationId={matchingOrg.id} actorRole={role} />
      </div>
    </div>
  );
}
