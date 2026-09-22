"use client";

import React from "react";
import Link from "next/link";
import { usePathname, useRouter } from "next/navigation";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { OrganizationDTO } from "@/types";
import { Building2, Plus, ChevronDown, Check } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgSwitcherProps {
  currentOrgSlug?: string;
}

export function OrgSwitcher({ currentOrgSlug }: OrgSwitcherProps) {
  const router = useRouter();
  const pathname = usePathname();

  const { data, isLoading } = useQuery({
    queryKey: ["organizations"],
    queryFn: async () => {
      const res = await api.get<{ organizations: OrganizationDTO[] }>(
        "/organizations"
      );
      return res.organizations;
    },
  });

  const organizations = data || [];

  const handleSelectOrg = (slug: string) => {
    localStorage.setItem("last_org_slug", slug);
    router.push(`/dashboard/${slug}`);
  };

  if (isLoading) {
    return (
      <div className="flex items-center gap-2">
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
        <div className="h-8 w-28 bg-slate-200 dark:bg-slate-800 animate-pulse rounded-lg" />
      </div>
    );
  }

  return (
    <div className="flex items-center gap-2 overflow-x-auto py-1">
      {organizations.map((org) => {
        const isActive = org.slug === currentOrgSlug;
        return (
          <button
            key={org.id}
            onClick={() => handleSelectOrg(org.slug)}
            className={cn(
              "flex items-center gap-2 px-3 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 border select-none shrink-0",
              isActive
                ? "bg-blue-600/10 dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border-blue-500/40 dark:border-blue-500/50 shadow-sm"
                : "bg-white dark:bg-slate-900/60 text-slate-700 dark:text-slate-300 border-slate-300 dark:border-slate-800 hover:bg-slate-100 dark:hover:bg-slate-800 hover:text-slate-900 dark:hover:text-white shadow-sm dark:shadow-none"
            )}
          >
            <Building2 className="w-3.5 h-3.5" />
            <span>{org.name}</span>
            {isActive && <Check className="w-3 h-3 text-blue-600 dark:text-blue-400" />}
          </button>
        );
      })}

      <Link
        href="/organizations/new"
        className="flex items-center gap-1.5 px-3 py-1.5 rounded-lg text-xs font-medium text-slate-600 dark:text-slate-400 hover:text-slate-900 dark:hover:text-white bg-slate-100 dark:bg-slate-900/40 hover:bg-slate-200 dark:hover:bg-slate-800/80 border border-dashed border-slate-300 dark:border-slate-700 transition-colors shrink-0"
      >
        <Plus className="w-3.5 h-3.5" />
        <span>New Organization</span>
      </Link>
    </div>
  );
}
