"use client";

import React from "react";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api-client";
import { MembershipDTO } from "@/types";
import { Avatar } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Skeleton } from "@/components/ui/skeleton";
import { formatDate } from "@/lib/utils";
import { Users } from "lucide-react";

interface MemberListProps {
  organizationId: string;
}

export function MemberList({ organizationId }: MemberListProps) {
  const { data, isLoading, error } = useQuery({
    queryKey: ["org", organizationId, "members"],
    queryFn: async () => {
      const res = await api.get<{ members: MembershipDTO[] }>(
        `/organizations/${organizationId}/members`
      );
      return res.members;
    },
    enabled: !!organizationId,
  });

  const members = data || [];

  if (isLoading) {
    return (
      <div className="space-y-3">
        {[1, 2, 3].map((i) => (
          <div
            key={i}
            className="flex items-center justify-between p-3.5 rounded-lg border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40"
          >
            <div className="flex items-center gap-3">
              <Skeleton className="w-9 h-9 rounded-full" />
              <div className="space-y-1.5">
                <Skeleton className="w-28 h-3.5" />
                <Skeleton className="w-40 h-3" />
              </div>
            </div>
            <Skeleton className="w-16 h-5 rounded-full" />
          </div>
        ))}
      </div>
    );
  }

  if (error) {
    return (
      <div className="p-4 rounded-lg bg-red-50 dark:bg-red-950/20 border border-red-200 dark:border-red-900/40 text-red-700 dark:text-red-300 text-xs">
        Failed to load organization members.
      </div>
    );
  }

  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between pb-2 border-b border-slate-200 dark:border-slate-800/80">
        <div className="flex items-center gap-2 text-xs font-semibold uppercase tracking-wider text-slate-500 dark:text-slate-400">
          <Users className="w-4 h-4 text-blue-600 dark:text-blue-400" />
          <span>Members ({members.length})</span>
        </div>
      </div>

      <div className="divide-y divide-slate-200 dark:divide-slate-800/60 rounded-xl border border-slate-200 dark:border-slate-800 bg-white dark:bg-slate-900/40 overflow-hidden shadow-xs">
        {members.map((member) => (
          <div
            key={member.id}
            className="flex items-center justify-between p-4 hover:bg-slate-50 dark:hover:bg-slate-800/30 transition-colors"
          >
            <div className="flex items-center gap-3">
              <Avatar
                name={member.user.name}
                avatarUrl={member.user.avatar}
                size="md"
              />
              <div>
                <p className="text-sm font-medium text-slate-900 dark:text-white">{member.user.name}</p>
                <p className="text-xs text-slate-500 dark:text-slate-400">{member.user.email}</p>
              </div>
            </div>

            <div className="flex items-center gap-4">
              <span className="text-xs text-slate-400 dark:text-slate-500 hidden sm:inline">
                Joined {formatDate(member.joinedAt)}
              </span>
              <Badge role={member.role} />
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
