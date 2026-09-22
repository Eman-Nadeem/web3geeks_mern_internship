"use client";

import React from "react";
import Link from "next/link";
import { usePathname } from "next/navigation";
import { LayoutDashboard, FolderKanban, CheckSquare, Users, Settings } from "lucide-react";
import { cn } from "@/lib/utils";

interface OrgSubNavProps {
  orgSlug: string;
  className?: string;
}

export function OrgSubNav({ orgSlug, className }: OrgSubNavProps) {
  const pathname = usePathname();

  const base = `/dashboard/${orgSlug}`;
  const tabs = [
    {
      name: "Overview",
      href: base,
      icon: LayoutDashboard,
      isActive: pathname === base,
    },
    {
      name: "Projects",
      href: `${base}/projects`,
      icon: FolderKanban,
      isActive: pathname.startsWith(`${base}/projects`),
    },
    {
      name: "My Tasks",
      href: `${base}/my-tasks`,
      icon: CheckSquare,
      isActive: pathname.startsWith(`${base}/my-tasks`),
    },
    {
      name: "Members",
      href: `${base}/members`,
      icon: Users,
      isActive: pathname.startsWith(`${base}/members`),
    },
    {
      name: "Settings",
      href: `${base}/settings`,
      icon: Settings,
      isActive: pathname.startsWith(`${base}/settings`),
    },
  ];

  return (
    <nav
      aria-label="Workspace Navigation"
      className={cn(
        "flex items-center gap-1.5 overflow-x-auto p-1 rounded-xl bg-slate-200/60 dark:bg-slate-950/60 border border-slate-300/80 dark:border-slate-800/80 backdrop-blur-md transition-colors",
        className
      )}
    >
      {tabs.map((tab) => {
        const Icon = tab.icon;
        return (
          <Link key={tab.name} href={tab.href}>
            <button
              type="button"
              className={cn(
                "flex items-center gap-2 px-3.5 py-1.5 rounded-lg text-xs font-medium transition-all duration-150 whitespace-nowrap",
                tab.isActive
                  ? "bg-white dark:bg-blue-600/20 text-blue-600 dark:text-blue-400 border border-slate-300/80 dark:border-blue-500/30 shadow-sm"
                  : "text-slate-600 hover:text-slate-900 hover:bg-white/70 dark:text-slate-400 dark:hover:text-slate-200 dark:hover:bg-slate-900/60 border border-transparent"
              )}
            >
              <Icon className={cn("w-3.5 h-3.5", tab.isActive ? "text-blue-600 dark:text-blue-400" : "text-slate-500 dark:text-slate-400")} />
              <span>{tab.name}</span>
            </button>
          </Link>
        );
      })}
    </nav>
  );
}
