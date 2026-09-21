"use client";

import { useEffect } from "react";
import { AlertTriangle, RotateCcw } from "lucide-react";
import { Button } from "@/components/ui/button";

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error("Global Error boundary caught:", error);
  }, [error]);

  return (
    <div className="min-h-screen flex items-center justify-center p-4 bg-[#0b0f17]">
      <div className="max-w-md w-full text-center space-y-6">
        <div className="inline-flex p-3 rounded-2xl bg-red-600/10 border border-red-500/20 text-red-400">
          <AlertTriangle className="w-10 h-10" />
        </div>

        <div className="space-y-2">
          <h1 className="text-2xl font-bold tracking-tight text-white">Something went wrong</h1>
          <p className="text-sm text-slate-400">
            An unexpected error occurred. Please try reloading the page.
          </p>
        </div>

        <div className="flex justify-center gap-3">
          <Button onClick={() => reset()} variant="primary">
            <RotateCcw className="w-4 h-4" />
            <span>Try Again</span>
          </Button>
        </div>
      </div>
    </div>
  );
}
