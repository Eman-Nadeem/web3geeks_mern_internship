import React, { HTMLAttributes } from "react";
import { cn } from "@/lib/utils";
import { UserRole } from "@/types";

export interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  variant?: "default" | "owner" | "admin" | "member" | "secondary" | "outline";
  role?: UserRole;
}

export function Badge({
  className,
  variant = "default",
  role,
  children,
  ...props
}: BadgeProps) {
  let effectiveVariant = variant;
  if (role) {
    effectiveVariant = role.toLowerCase() as any;
  }

  const variantStyles = {
    default: "bg-slate-800 text-slate-200 border-slate-700",
    owner:
      "bg-purple-950/70 text-purple-300 border-purple-800/80 shadow-[0_0_10px_rgba(168,85,247,0.15)]",
    admin:
      "bg-blue-950/70 text-blue-300 border-blue-800/80 shadow-[0_0_10px_rgba(59,130,246,0.15)]",
    member:
      "bg-emerald-950/70 text-emerald-300 border-emerald-800/80 shadow-[0_0_10px_rgba(16,185,129,0.15)]",
    secondary: "bg-slate-800/80 text-slate-300 border-slate-700",
    outline: "border border-slate-700 text-slate-300 bg-transparent",
  };

  return (
    <span
      className={cn(
        "inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold tracking-wide transition-colors uppercase",
        variantStyles[effectiveVariant] || variantStyles.default,
        className
      )}
      {...props}
    >
      {children || role}
    </span>
  );
}
