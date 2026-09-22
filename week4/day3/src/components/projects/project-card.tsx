"use client";

import React from "react";
import Link from "next/link";
import { ProjectListItemDTO } from "@/types";
import { Badge } from "@/components/ui/badge";
import { Avatar } from "@/components/ui/avatar";
import { Users, CheckSquare, ArrowRight } from "lucide-react";

interface ProjectCardProps {
  project: ProjectListItemDTO;
  orgSlug: string;
}

export function ProjectCard({ project, orgSlug }: ProjectCardProps) {
  const completion = Math.round(project.completionPercentage || 0);

  return (
    <Link
      href={`/dashboard/${orgSlug}/projects/${project.id}`}
      className="group block relative rounded-2xl border border-slate-800/80 bg-slate-900/40 p-6 backdrop-blur-xl transition-all duration-200 hover:border-blue-500/40 hover:bg-slate-900/70 hover:shadow-xl hover:shadow-blue-500/5"
    >
      <div className="flex items-start justify-between gap-3 mb-3">
        <h3 className="text-base font-semibold text-white group-hover:text-blue-400 transition-colors line-clamp-1">
          {project.name}
        </h3>
        <Badge status={project.status} />
      </div>

      <p className="text-xs text-slate-400 line-clamp-2 min-h-[32px] mb-5">
        {project.description || "No description provided."}
      </p>

      {/* Completion progress bar */}
      <div className="space-y-1.5 mb-5">
        <div className="flex items-center justify-between text-xs">
          <span className="text-slate-400">Progress</span>
          <span className="font-semibold text-slate-200">{completion}%</span>
        </div>
        <div className="h-1.5 w-full rounded-full bg-slate-800 overflow-hidden">
          <div
            className="h-full rounded-full bg-gradient-to-r from-blue-500 to-emerald-400 transition-all duration-500"
            style={{ width: `${completion}%` }}
          />
        </div>
      </div>

      {/* Footer Info */}
      <div className="flex items-center justify-between pt-4 border-t border-slate-800/70 text-xs text-slate-400">
        {/* Owner */}
        <div className="flex items-center gap-2">
          <Avatar
            name={project.owner?.name || "Owner"}
            avatarUrl={project.owner?.avatar}
            size="sm"
          />
          <span className="text-slate-300 font-medium truncate max-w-[100px]">
            {project.owner?.name || "Owner"}
          </span>
        </div>

        {/* Stats */}
        <div className="flex items-center gap-3">
          <div className="flex items-center gap-1" title={`${project.memberCount} members`}>
            <Users className="w-3.5 h-3.5 text-slate-500" />
            <span>{project.memberCount}</span>
          </div>
          <div className="flex items-center gap-1" title={`${project.taskCount} tasks`}>
            <CheckSquare className="w-3.5 h-3.5 text-slate-500" />
            <span>{project.taskCount}</span>
          </div>
          <ArrowRight className="w-3.5 h-3.5 text-slate-500 group-hover:text-blue-400 group-hover:translate-x-0.5 transition-all" />
        </div>
      </div>
    </Link>
  );
}
