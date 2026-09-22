import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?:
    | "default"
    | "owner"
    | "admin"
    | "member"
    | "secondary"
    | "outline"
    | "todo"
    | "in_progress"
    | "review"
    | "completed"
    | "planning"
    | "active"
    | "on_hold"
    | "archived"
    | "low"
    | "medium"
    | "high"
    | "urgent";
  role?: UserRole;
  status?: string;
  priority?: string;
}

export function Badge({
  className,
  variant = "default",
  role,
  status,
  priority,
  children,
  ...props
}: BadgeProps) {
  let effectiveVariant = variant;
  if (role) {
    effectiveVariant = role.toLowerCase() as any;
  } else if (status) {
    effectiveVariant = status.toLowerCase() as any;
  } else if (priority) {
    effectiveVariant = priority.toLowerCase() as any;
  }

  const variantStyles: Record<string, string> = {
    default: "bg-slate-800 text-slate-200 border-slate-700",
    owner:
      "bg-purple-950/70 text-purple-300 border-purple-800/80 shadow-[0_0_10px_rgba(168,85,247,0.15)]",
    admin:
      "bg-blue-950/70 text-blue-300 border-blue-800/80 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
    member:
      "bg-emerald-950/70 text-emerald-300 border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    secondary: "bg-slate-800/80 text-slate-300 border-slate-700",
    outline: "border border-slate-700 text-slate-300 bg-transparent",
    // Task Status
    todo: "bg-slate-800/80 text-slate-300 border-slate-700",
    in_progress: "bg-blue-950/60 text-blue-400 border-blue-800/60",
    review: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    completed: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
    // Project Status
    planning: "bg-indigo-950/60 text-indigo-300 border-indigo-800/60",
    active: "bg-emerald-950/60 text-emerald-300 border-emerald-800/60",
    on_hold: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    archived: "bg-slate-800/70 text-slate-400 border-slate-700",
    // Priority
    low: "bg-slate-800/70 text-slate-300 border-slate-700",
    medium: "bg-blue-950/50 text-blue-300 border-blue-800/50",
    high: "bg-amber-950/60 text-amber-300 border-amber-800/60",
    urgent: "bg-red-950/70 text-red-300 border-red-800/70 shadow-[0_0_8px_rgba(239,68,68,0.2)]",
  };

  const displayText = children || role || status || priority;

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors uppercase whitespace-nowrap",
        variantStyles[effectiveVariant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {displayText}
    </span>
  );
}
