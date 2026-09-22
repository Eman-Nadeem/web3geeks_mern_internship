"use client";

import React, { useEffect, useMemo } from "react";
import { useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { OrganizationDTO } from "@/types";
import { Button } from "@/components/ui/button";
import { Building2, Plus, Loader2 } from "lucide-react";
import NextLink from "next/link";

export default function DashboardRedirectPage() {
  const router = useRouter();

  const { data, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>(
        "/organizations"
      );
      return res.organizations;
    },
  });

  const organizations = useMemo(() => data || [], [data]);

  useEffect(() => {
    if (!isLoading && organizations.length > 0) {
      const lastSlug = localStorage.getItem("last_org_slug");
      const targetOrg =
        organizations.find((org) => org.slug === lastSlug) || organizations[0];
      router.replace(`/dashboard/${targetOrg.slug}`);
    }
  }, [isLoading, organizations, router]);

  if (isLoading) {
    return (
      <div className="flex flex-col items-center justify-center py-20 gap-3 text-slate-500 dark:text-slate-400">
        <Loader2 className="w-8 h-8 animate-spin text-blue-500" />
        <p className="text-sm font-medium">Finding your workspaces...</p>
      </div>
    );
  }

  if (organizations.length === 0) {
    return (
      <div className="flex flex-col items-center justify-center py-20 px-4 text-center">
        <div className="p-4 rounded-2xl bg-blue-500/10 dark:bg-blue-600/10 border border-blue-500/20 text-blue-600 dark:text-blue-400 mb-4">
          <Building2 className="w-12 h-12" />
        </div>
        <h2 className="text-2xl font-bold text-slate-900 dark:text-white mb-2">
          No organizations yet
        </h2>
        <p className="text-sm text-slate-600 dark:text-slate-400 max-w-md mb-6">
          Organizations are workspaces where you and your team collaborate on
          projects, manage tasks, and configure permissions.
        </p>
        <NextLink href="/organizations/new">
          <Button variant="primary" size="lg">
            <Plus className="w-4 h-4 mr-2" />
            <span>Create your first organization</span>
          </Button>
        </NextLink>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center py-20">
      <Loader2 className="w-6 h-6 animate-spin text-blue-500" />
    </div>
  );
}
