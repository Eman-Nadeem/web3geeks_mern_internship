'use client';

import React from 'react';
import { useTheme } from './ThemeProvider';
import { Sun, Moon } from 'lucide-react';

export function ThemeToggle({ className = '' }: { className?: string }) {
  const { theme, toggleTheme } = useTheme();

  return (
    <button
      type="button"
      onClick={toggleTheme}
      aria-label={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      title={`Switch to ${theme === 'dark' ? 'light' : 'dark'} mode`}
      className={`relative p-2 rounded-lg border border-(--border-dark) bg-(--bg-canvas) text-(--text-on-dark-muted) hover:text-(--text-on-dark) hover:border-[#1E7A56] transition-colors duration-150 focus:outline-none cursor-pointer flex items-center justify-center ${className}`}
    >
      {theme === 'dark' ? (
        <Sun className="w-4 h-4 text-amber-300 transition-transform duration-200" />
      ) : (
        <Moon className="w-4 h-4 text-emerald-800 transition-transform duration-200" />
      )}
    </button>
  );
}
