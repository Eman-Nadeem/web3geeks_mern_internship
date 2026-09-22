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
    default: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800 dark:text-slate-200 dark:border-slate-700",
    owner:
      "bg-purple-100 text-purple-700 border-purple-200 dark:bg-purple-950/70 dark:text-purple-300 dark:border-purple-800/80 dark:shadow-[0_0_10px_rgba(168,85,247,0.15)]",
    admin:
      "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/70 dark:text-blue-300 dark:border-blue-800/80 dark:shadow-[0_0_10px_rgba(59,130,246,0.15)]",
    member:
      "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/70 dark:text-emerald-300 dark:border-emerald-800/80 dark:shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    secondary: "bg-slate-100 text-slate-700 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    outline: "border border-slate-300 text-slate-700 bg-transparent dark:border-slate-700 dark:text-slate-300",
    // Task Status
    todo: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/80 dark:text-slate-300 dark:border-slate-700",
    in_progress: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/60 dark:text-blue-400 dark:border-blue-800/60",
    review: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    completed: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    // Project Status
    planning: "bg-indigo-100 text-indigo-700 border-indigo-200 dark:bg-indigo-950/60 dark:text-indigo-300 dark:border-indigo-800/60",
    active: "bg-emerald-100 text-emerald-700 border-emerald-200 dark:bg-emerald-950/60 dark:text-emerald-300 dark:border-emerald-800/60",
    on_hold: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    archived: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-400 dark:border-slate-700",
    // Priority
    low: "bg-slate-100 text-slate-600 border-slate-200 dark:bg-slate-800/70 dark:text-slate-300 dark:border-slate-700",
    medium: "bg-blue-100 text-blue-700 border-blue-200 dark:bg-blue-950/50 dark:text-blue-300 dark:border-blue-800/50",
    high: "bg-amber-100 text-amber-700 border-amber-200 dark:bg-amber-950/60 dark:text-amber-300 dark:border-amber-800/60",
    urgent: "bg-red-100 text-red-700 border-red-200 dark:bg-red-950/70 dark:text-red-300 dark:border-red-800/70 dark:shadow-[0_0_8px_rgba(239,68,68,0.2)]",
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
