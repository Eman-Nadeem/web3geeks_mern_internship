"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  FileText,
  Clock,
  ArrowUpRight,
} from "lucide-react";
import { NewDocumentButton } from "@/components/documents/new-document-button";

export interface DocumentViewModel {
  id: string;
  title: string;
  previewText: string;
  wordCount: number;
  category: string;
  status: { label: string; textClass: string; bgClass: string };
  updatedAt: string;
  collaborators: Array<{ initials: string; name: string; bg: string }>;
}

interface DocumentsViewContainerProps {
  initialDocuments: DocumentViewModel[];
}

export function DocumentsViewContainer({ initialDocuments }: DocumentsViewContainerProps) {
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Just now"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  return (
    <div className="space-y-4">
      {/* View Switcher Bar */}
      <div className="flex items-center justify-between">
        <div className="text-xs font-semibold text-(--text-secondary) uppercase tracking-wider">
          All Documents ({initialDocuments.length})
        </div>

        <div className="flex items-center gap-1 bg-(--bg-surface) border border-(--border-subtle) p-1 rounded-lg shadow-clarity">
          <button
            onClick={() => setViewMode("grid")}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "grid"
                ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
                : "text-(--text-tertiary) hover:text-(--text-primary)"
            }`}
            title="Grid view"
          >
            <LayoutGrid className="w-4 h-4" />
          </button>
          <button
            onClick={() => setViewMode("table")}
            className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
              viewMode === "table"
                ? "bg-(--accent-soft-bg) text-(--accent-primary) font-semibold"
                : "text-(--text-tertiary) hover:text-(--text-primary)"
            }`}
            title="Table list view"
          >
            <List className="w-4 h-4" />
          </button>
        </div>
      </div>

      {initialDocuments.length === 0 ? (
        <div className="text-center py-16 px-4 bg-(--bg-surface) rounded-xl border border-(--border-subtle) space-y-3 shadow-clarity">
          <div className="w-10 h-10 rounded-full bg-(--accent-soft-bg) text-(--accent-primary) flex items-center justify-center mx-auto font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-(--text-primary)">No documents in workspace</h3>
          <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
            Create your first document to start writing. Your changes will automatically persist.
          </p>
          <div className="pt-2 max-w-xs mx-auto">
            <NewDocumentButton showSparkleAffordance={false} />
          </div>
        </div>
      ) : viewMode === "grid" ? (
        /* Document Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {initialDocuments.map((doc) => (
            <Link
              key={doc.id}
              href={`/documents/${doc.id}`}
              className="group bg-(--bg-surface) border border-(--border-subtle) hover:border-(--border-default) rounded-xl p-5 shadow-clarity transition-all flex flex-col justify-between space-y-4 hover:-translate-y-0.5"
            >
              {/* Thumbnail Preview Surface */}
              <div className="space-y-3">
                <div className="flex items-center justify-between">
                  <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-(--bg-surface-muted) text-(--text-secondary) border border-(--border-subtle)">
                    {doc.category}
                  </span>
                  <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${doc.status.bgClass} ${doc.status.textClass}`}>
                    {doc.status.label}
                  </span>
                </div>

                {/* Faint Content Preview Thumbnail Box */}
                <div className="h-20 bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg p-3 overflow-hidden text-[11px] text-(--text-tertiary) leading-relaxed relative">
                  <p className="line-clamp-3 select-none">{doc.previewText}</p>
                </div>

                <h3 className="text-sm font-semibold text-(--text-primary) truncate group-hover:text-(--accent-primary) transition-colors">
                  {doc.title}
                </h3>
              </div>

              {/* Card Footer Meta */}
              <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between text-xs text-(--text-secondary)">
                {/* Stacked Collaborators */}
                <div className="flex items-center -space-x-1.5">
                  {doc.collaborators.map((c, i) => (
                    <div
                      key={i}
                      className={`w-6 h-6 rounded-full ${c.bg} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white`}
                      title={c.name}
                    >
                      {c.initials}
                    </div>
                  ))}
                </div>

                <div className="flex items-center gap-1 text-[11px] text-(--text-tertiary)">
                  <Clock className="w-3 h-3" />
                  <span>{formatDate(doc.updatedAt)}</span>
                </div>
              </div>
            </Link>
          ))}
        </div>
      ) : (
        /* Document Table List View */
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-xl shadow-clarity overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--bg-surface-muted) border-b border-(--border-subtle) text-[11px] font-semibold text-(--text-tertiary) uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Collaborators</th>
                  <th className="py-3 px-4">Last Edited</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {initialDocuments.map((doc) => (
                  <tr
                    key={doc.id}
                    className="hover:bg-(--bg-surface-muted) transition-colors group cursor-pointer"
                  >
                    <td className="py-3.5 px-4 font-medium text-(--text-primary)">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="flex items-center gap-2.5 hover:text-(--accent-primary) transition-colors"
                      >
                        <FileText className="w-4 h-4 text-(--text-secondary)" />
                        <span className="font-semibold text-sm">{doc.title}</span>
                      </Link>
                    </td>

                    <td className="py-3.5 px-4 text-(--text-secondary)">
                      <span className="text-[11px] font-medium px-2 py-0.5 rounded-md bg-(--bg-surface-muted) text-(--text-secondary) border border-(--border-subtle)">
                        {doc.category}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${doc.status.bgClass} ${doc.status.textClass}`}>
                        {doc.status.label}
                      </span>
                    </td>

                    <td className="py-3.5 px-4">
                      <div className="flex items-center -space-x-1.5">
                        {doc.collaborators.map((c, i) => (
                          <div
                            key={i}
                            className={`w-6 h-6 rounded-full ${c.bg} text-white text-[10px] font-bold flex items-center justify-center ring-2 ring-white`}
                            title={c.name}
                          >
                            {c.initials}
                          </div>
                        ))}
                      </div>
                    </td>

                    <td className="py-3.5 px-4 text-(--text-tertiary) font-normal">
                      {formatDate(doc.updatedAt)}
                    </td>

                    <td className="py-3.5 px-4 text-right">
                      <Link
                        href={`/documents/${doc.id}`}
                        className="p-1 text-(--text-tertiary) hover:text-(--accent-primary) rounded transition-colors inline-block"
                      >
                        <ArrowUpRight className="w-4 h-4" />
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  );
}
