"use client";

import dynamic from "next/dynamic";
import "swagger-ui-react/swagger-ui.css";
import Link from "next/link";
import { ArrowLeft, BookOpen } from "lucide-react";

const SwaggerUI = dynamic(() => import("swagger-ui-react"), { ssr: false });

export default function DocsPage() {
  return (
    <div className="min-h-screen bg-(--bg-canvas) text-(--text-primary) flex flex-col">
      <header className="border-b border-(--border-subtle) bg-(--bg-surface) px-6 py-3.5 flex items-center justify-between sticky top-0 z-50 shadow-clarity">
        <div className="flex items-center gap-3">
          <Link
            href="/documents"
            className="px-3 py-1.5 rounded-lg bg-(--bg-surface-muted) hover:bg-slate-100 text-(--text-primary) border border-(--border-subtle) transition-colors flex items-center gap-2 text-xs font-medium"
          >
            <ArrowLeft className="w-4 h-4 text-(--text-secondary)" />
            Back to Editor
          </Link>
          <div className="h-4 w-px bg-(--border-subtle)" />
          <div className="flex items-center gap-2">
            <BookOpen className="w-4 h-4 text-(--accent-primary)" />
            <h1 className="text-sm font-semibold text-(--text-primary)">OpenAPI / Swagger Specs</h1>
          </div>
        </div>
        <span className="text-[11px] px-2.5 py-0.5 rounded-md bg-(--accent-soft-bg) text-(--accent-primary) font-mono font-medium">
          v1.0.0
        </span>
      </header>

      <main className="flex-1 p-6 max-w-7xl mx-auto w-full bg-white rounded-xl my-6 shadow-clarity border border-(--border-subtle) overflow-hidden">
        <SwaggerUI url="/api/openapi.json" />
      </main>
    </div>
  );
}
