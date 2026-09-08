"use client";

import { useState } from "react";
import Link from "next/link";
import {
  LayoutGrid,
  List,
  FileText,
  Clock,
  ArrowUpRight,
  Shield,
  Edit3,
  Eye,
  Search,
  ChevronDown,
  CheckCircle2,
  Filter,
} from "lucide-react";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { AccessRole, VALID_STATUSES, VALID_CATEGORIES } from "@/lib/db/documents";
import {
  CollaboratorAvatarGroup,
  CollaboratorInfo,
} from "@/components/documents/collaborator-avatar-group";

export interface DocumentViewModel {
  id: string;
  title: string;
  previewText: string;
  wordCount: number;
  category: string;
  status: { label: string; textClass: string; bgClass: string };
  accessRole?: AccessRole;
  updatedAt: string;
  collaborators: CollaboratorInfo[];
}

interface DocumentsViewContainerProps {
  initialDocuments: DocumentViewModel[];
}

export function DocumentsViewContainer({ initialDocuments }: DocumentsViewContainerProps) {
  const [documents, setDocuments] = useState<DocumentViewModel[]>(initialDocuments);
  const [viewMode, setViewMode] = useState<"grid" | "table">("grid");
  const [searchQuery, setSearchQuery] = useState("");
  const [selectedStatus, setSelectedStatus] = useState<string>("All");
  const [selectedCategory, setSelectedCategory] = useState<string>("All");
  const [activeMenuDocId, setActiveMenuDocId] = useState<{ id: string; type: "status" | "category" } | null>(null);

  const formatDate = (dateStr: string) => {
    const d = new Date(dateStr);
    return isNaN(d.getTime())
      ? "Just now"
      : d.toLocaleDateString(undefined, { month: "short", day: "numeric", year: "numeric" });
  };

  const handleUpdateStatus = async (docId: string, newStatus: string) => {
    setActiveMenuDocId(null);
    setDocuments((prev) =>
      prev.map((d) => {
        if (d.id !== docId) return d;
        const textClass =
          newStatus === "Complete"
            ? "text-[#1DAA61]"
            : newStatus === "In Review"
            ? "text-[#E08A2E]"
            : "text-[#6B6B76]";
        const bgClass =
          newStatus === "Complete"
            ? "bg-[#E7F7EE]"
            : newStatus === "In Review"
            ? "bg-[#FDF1E3]"
            : "bg-[#F1F1F4]";
        return { ...d, status: { label: newStatus, textClass, bgClass } };
      })
    );

    try {
      await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ status: newStatus }),
      });
    } catch (e) {
      console.error("Failed to update status:", e);
    }
  };

  const handleUpdateCategory = async (docId: string, newCategory: string) => {
    setActiveMenuDocId(null);
    setDocuments((prev) =>
      prev.map((d) => (d.id === docId ? { ...d, category: newCategory } : d))
    );

    try {
      await fetch(`/api/documents/${docId}`, {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ category: newCategory }),
      });
    } catch (e) {
      console.error("Failed to update category:", e);
    }
  };

  const renderAccessBadge = (role?: AccessRole) => {
    if (role === "editor") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-blue-50 text-blue-700 border border-blue-200">
          <Edit3 className="w-2.5 h-2.5" />
          Editor
        </span>
      );
    }
    if (role === "viewer") {
      return (
        <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-slate-100 text-slate-700 border border-slate-200">
          <Eye className="w-2.5 h-2.5" />
          Viewer
        </span>
      );
    }
    return (
      <span className="inline-flex items-center gap-1 text-[10px] font-semibold px-2 py-0.5 rounded-md bg-emerald-50 text-emerald-700 border border-emerald-200">
        <Shield className="w-2.5 h-2.5" />
        Owner
      </span>
    );
  };

  // Filtered documents
  const filteredDocuments = documents.filter((doc) => {
    const matchesSearch =
      doc.title.toLowerCase().includes(searchQuery.toLowerCase()) ||
      doc.previewText.toLowerCase().includes(searchQuery.toLowerCase());
    const matchesStatus = selectedStatus === "All" || doc.status.label === selectedStatus;
    const matchesCategory = selectedCategory === "All" || doc.category === selectedCategory;
    return matchesSearch && matchesStatus && matchesCategory;
  });

  return (
    <div className="space-y-4">
      {/* Filtering & View Switcher Bar */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-3 bg-(--bg-surface) p-3 rounded-xl border border-(--border-subtle) shadow-clarity">
        {/* Search Input */}
        <div className="relative flex-1 max-w-sm">
          <Search className="w-4 h-4 absolute left-3 top-1/2 -translate-y-1/2 text-(--text-tertiary)" />
          <input
            type="text"
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            placeholder="Search documents..."
            className="w-full pl-9 pr-3 py-1.5 text-xs rounded-lg bg-(--bg-surface-muted) border border-(--border-subtle) text-(--text-primary) placeholder-(--text-tertiary) focus:outline-none focus:border-blue-500 transition-colors"
          />
        </div>

        {/* Filter Controls & View Switcher */}
        <div className="flex flex-wrap items-center gap-2">
          {/* Status Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-(--text-tertiary) hidden sm:inline">Status:</span>
            <select
              value={selectedStatus}
              onChange={(e) => setSelectedStatus(e.target.value)}
              className="text-xs bg-(--bg-surface-muted) border border-(--border-subtle) text-(--text-secondary) rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="All">All Statuses</option>
              {VALID_STATUSES.map((st) => (
                <option key={st} value={st}>
                  {st}
                </option>
              ))}
            </select>
          </div>

          {/* Category Filter */}
          <div className="flex items-center gap-1">
            <span className="text-[11px] font-medium text-(--text-tertiary) hidden sm:inline">Category:</span>
            <select
              value={selectedCategory}
              onChange={(e) => setSelectedCategory(e.target.value)}
              className="text-xs bg-(--bg-surface-muted) border border-(--border-subtle) text-(--text-secondary) rounded-lg px-2.5 py-1.5 focus:outline-none focus:border-blue-500 font-medium"
            >
              <option value="All">All Categories</option>
              {VALID_CATEGORIES.map((cat) => (
                <option key={cat} value={cat}>
                  {cat}
                </option>
              ))}
            </select>
          </div>

          <div className="h-4 w-px bg-(--border-subtle) mx-1 hidden sm:block" />

          {/* View Mode Toggle */}
          <div className="flex items-center gap-1 bg-(--bg-surface-muted) border border-(--border-subtle) p-0.5 rounded-lg">
            <button
              onClick={() => setViewMode("grid")}
              className={`p-1.5 rounded-md text-xs font-medium transition-colors cursor-pointer ${
                viewMode === "grid"
                  ? "bg-white dark:bg-slate-800 text-blue-600 font-semibold shadow-xs"
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
                  ? "bg-white dark:bg-slate-800 text-blue-600 font-semibold shadow-xs"
                  : "text-(--text-tertiary) hover:text-(--text-primary)"
              }`}
              title="Table list view"
            >
              <List className="w-4 h-4" />
            </button>
          </div>
        </div>
      </div>

      {/* Main Viewport Content */}
      {filteredDocuments.length === 0 ? (
        <div className="p-12 text-center bg-(--bg-surface) border border-(--border-subtle) rounded-xl shadow-clarity space-y-3">
          <div className="w-10 h-10 rounded-full bg-(--accent-soft-bg) text-(--accent-primary) flex items-center justify-center mx-auto font-bold">
            <FileText className="w-5 h-5" />
          </div>
          <h3 className="text-sm font-semibold text-(--text-primary)">
            {documents.length === 0 ? "No documents in workspace" : "No matching documents found"}
          </h3>
          <p className="text-xs text-(--text-secondary) max-w-sm mx-auto">
            {documents.length === 0
              ? "Create your first document to start writing. Your changes will automatically persist."
              : "Try adjusting your filters or search query."}
          </p>
          {documents.length === 0 && (
            <div className="pt-2 max-w-xs mx-auto">
              <NewDocumentButton />
            </div>
          )}
        </div>
      ) : viewMode === "grid" ? (
        /* Document Cards Grid View */
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
          {filteredDocuments.map((doc) => {
            const isViewer = doc.accessRole === "viewer";
            const isMenuOpen = activeMenuDocId?.id === doc.id;

            return (
              <div
                key={doc.id}
                className="group bg-(--bg-surface) border border-(--border-subtle) hover:border-(--border-default) rounded-xl p-5 shadow-clarity transition-all flex flex-col justify-between space-y-4 hover:-translate-y-0.5 relative"
              >
                {/* Thumbnail Preview Surface */}
                <div className="space-y-3">
                  <div className="flex items-center justify-between gap-1">
                    <div className="flex items-center gap-1.5 relative">
                      {/* Category Badge / Selector */}
                      {isViewer ? (
                        <span className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-(--bg-surface-muted) text-(--text-secondary) border border-(--border-subtle)">
                          {doc.category}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuDocId(
                              isMenuOpen && activeMenuDocId?.type === "category"
                                ? null
                                : { id: doc.id, type: "category" }
                            )
                          }
                          className="text-[11px] font-semibold px-2 py-0.5 rounded-md bg-(--bg-surface-muted) hover:bg-slate-200/60 text-(--text-secondary) hover:text-(--text-primary) border border-(--border-subtle) flex items-center gap-1 transition-colors cursor-pointer"
                        >
                          <span>{doc.category}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      )}

                      {/* Category Dropdown */}
                      {isMenuOpen && activeMenuDocId?.type === "category" && (
                        <div className="absolute left-0 top-7 w-36 bg-white dark:bg-slate-900 border border-(--border-subtle) rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          {VALID_CATEGORIES.map((cat) => (
                            <button
                              key={cat}
                              type="button"
                              onClick={() => handleUpdateCategory(doc.id, cat)}
                              className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                doc.category === cat ? "font-semibold text-blue-600" : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              <span>{cat}</span>
                              {doc.category === cat && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      )}

                      {renderAccessBadge(doc.accessRole)}
                    </div>

                    {/* Status Badge / Selector */}
                    <div className="relative">
                      {isViewer ? (
                        <span className={`text-[11px] font-semibold px-2 py-0.5 rounded-md ${doc.status.bgClass} ${doc.status.textClass}`}>
                          {doc.status.label}
                        </span>
                      ) : (
                        <button
                          type="button"
                          onClick={() =>
                            setActiveMenuDocId(
                              isMenuOpen && activeMenuDocId?.type === "status"
                                ? null
                                : { id: doc.id, type: "status" }
                            )
                          }
                          className={`text-[11px] font-semibold px-2 py-0.5 rounded-md flex items-center gap-1 transition-colors cursor-pointer ${doc.status.bgClass} ${doc.status.textClass}`}
                        >
                          <span>{doc.status.label}</span>
                          <ChevronDown className="w-2.5 h-2.5 opacity-60" />
                        </button>
                      )}

                      {/* Status Dropdown */}
                      {isMenuOpen && activeMenuDocId?.type === "status" && (
                        <div className="absolute right-0 top-7 w-36 bg-white dark:bg-slate-900 border border-(--border-subtle) rounded-lg shadow-lg py-1 z-30 animate-in fade-in zoom-in-95 duration-100">
                          {VALID_STATUSES.map((st) => (
                            <button
                              key={st}
                              type="button"
                              onClick={() => handleUpdateStatus(doc.id, st)}
                              className={`w-full text-left px-2.5 py-1.5 text-xs flex items-center justify-between hover:bg-slate-100 dark:hover:bg-slate-800 transition-colors ${
                                doc.status.label === st ? "font-semibold text-blue-600" : "text-slate-700 dark:text-slate-200"
                              }`}
                            >
                              <span>{st}</span>
                              {doc.status.label === st && <CheckCircle2 className="w-3 h-3 text-blue-600" />}
                            </button>
                          ))}
                        </div>
                      )}
                    </div>
                  </div>

                  {/* Content Preview Thumbnail Box */}
                  <Link href={`/documents/${doc.id}`} className="block">
                    <div className="h-20 bg-(--bg-surface-muted) border border-(--border-subtle) rounded-lg p-3 overflow-hidden text-[11px] text-(--text-tertiary) leading-relaxed relative">
                      <p className="line-clamp-3 select-none">{doc.previewText}</p>
                    </div>

                    <h3 className="text-sm font-semibold text-(--text-primary) truncate group-hover:text-(--accent-primary) transition-colors mt-3">
                      {doc.title}
                    </h3>
                  </Link>
                </div>

                {/* Card Footer Meta */}
                <div className="pt-3 border-t border-(--border-subtle) flex items-center justify-between text-xs text-(--text-secondary)">
                  {/* Stacked Collaborators using CollaboratorAvatarGroup */}
                  <CollaboratorAvatarGroup collaborators={doc.collaborators} maxDisplay={3} size="md" />

                  <div className="flex items-center gap-1 text-[11px] text-(--text-tertiary)">
                    <Clock className="w-3 h-3" />
                    <span>{formatDate(doc.updatedAt)}</span>
                  </div>
                </div>
              </div>
            );
          })}
        </div>
      ) : (
        /* Document Table List View */
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-xl shadow-clarity overflow-hidden">
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead className="bg-(--bg-surface-muted) border-b border-(--border-subtle) text-[11px] font-semibold text-(--text-tertiary) uppercase tracking-wider">
                <tr>
                  <th className="py-3 px-4">Name</th>
                  <th className="py-3 px-4">Role</th>
                  <th className="py-3 px-4">Category</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Collaborators</th>
                  <th className="py-3 px-4">Last Edited</th>
                  <th className="py-3 px-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-(--border-subtle)">
                {filteredDocuments.map((doc) => (
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

                    <td className="py-3.5 px-4">
                      {renderAccessBadge(doc.accessRole)}
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
                      {/* Stacked Collaborators in List View */}
                      <CollaboratorAvatarGroup collaborators={doc.collaborators} maxDisplay={4} size="sm" />
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
