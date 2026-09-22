import React, { HTMLAttributes } from "react";
import { AlertCircle, CheckCircle, Info } from "lucide-react";
import { cn } from "@/lib/utils";

export interface AlertProps extends HTMLAttributes<HTMLDivElement> {
  variant?: "error" | "success" | "info";
}

export function Alert({
  className,
  variant = "error",
  children,
  ...props
}: AlertProps) {
  const variantStyles = {
    error: "bg-red-950/40 border-red-800/80 text-red-200",
    success: "bg-emerald-950/40 border-emerald-800/80 text-emerald-200",
    info: "bg-blue-950/40 border-blue-800/80 text-blue-200",
  };

  const icons = {
    error: <AlertCircle className="w-5 h-5 text-red-400 shrink-0" />,
    success: <CheckCircle className="w-5 h-5 text-emerald-400 shrink-0" />,
    info: <Info className="w-5 h-5 text-blue-400 shrink-0" />,
  };

  return (
    <div
      role="alert"
      className={cn(
        "flex items-start gap-3 rounded-lg border p-4 text-sm backdrop-blur-sm",
        variantStyles[variant],
        className
      )}
      {...props}
    >
      {icons[variant]}
      <div className="flex-1 text-left">{children}</div>
    </div>
  );
}
