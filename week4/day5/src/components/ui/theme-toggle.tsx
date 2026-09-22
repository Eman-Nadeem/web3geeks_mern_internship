"use client";

import React, { useEffect, useState } from "react";
import { useTheme } from "@/providers/theme-provider";
import { Sun, Moon } from "lucide-react";
import { cn } from "@/lib/utils";

interface ThemeToggleProps {
  className?: string;
  showLabel?: boolean;
}

export function ThemeToggle({ className, showLabel = false }: ThemeToggleProps) {
  const { theme, toggleTheme } = useTheme();
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    setMounted(true);
  }, []);

  if (!mounted) {
    return (
      <div
        className={cn(
          "w-9 h-9 rounded-lg border border-slate-200 dark:border-slate-800 bg-slate-100 dark:bg-slate-900/60 animate-pulse",
          className
        )}
      />
    );
  }

  const isDark = theme === "dark";

  return (
    <button
      type="button"
      onClick={toggleTheme}
      className={cn(
        "relative flex items-center justify-center gap-2 p-2 rounded-lg text-xs font-medium transition-all duration-200",
        "border border-slate-200 dark:border-slate-800",
        "bg-white hover:bg-slate-100 text-slate-700 hover:text-slate-900",
        "dark:bg-slate-900/80 dark:hover:bg-slate-800 dark:text-slate-300 dark:hover:text-white",
        "focus:outline-none focus:ring-2 focus:ring-blue-500/40 shadow-sm select-none",
        className
      )}
      aria-label={`Switch to ${isDark ? "light" : "dark"} mode`}
      title={`Switch to ${isDark ? "light" : "dark"} mode`}
    >
      {isDark ? (
        <Sun className="w-4 h-4 text-amber-400 transition-transform duration-300 rotate-0 hover:rotate-45" />
      ) : (
        <Moon className="w-4 h-4 text-indigo-600 transition-transform duration-300 rotate-0 hover:-rotate-12" />
      )}
      {showLabel && (
        <span className="capitalize">{isDark ? "Light Mode" : "Dark Mode"}</span>
      )}
    </button>
  );
}
