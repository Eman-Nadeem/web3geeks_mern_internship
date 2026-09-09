import { getAllDocuments } from "@/lib/db/documents";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { DocumentsViewContainer } from "./documents-view-container";
import { TrendingUp, FileCheck2 } from "lucide-react";
import { getCurrentUser } from "@/lib/auth/session";
import { redirect } from "next/navigation";

export const revalidate = 0; // Dynamic route

export default async function DocumentsPage() {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const rawDocuments = await getAllDocuments(user.id);

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
  };

  const documents = rawDocuments.map((doc) => {
    const textContent = stripHtml(doc.content);
    const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;
    const category = doc.category || "General";
    const statusLabel = doc.status || "Draft";
    const status = {
      label: statusLabel,
      textClass:
        statusLabel === "Complete"
          ? "text-[#1DAA61]"
          : statusLabel === "In Review"
          ? "text-[#E08A2E]"
          : "text-[#6B6B76]",
      bgClass:
        statusLabel === "Complete"
          ? "bg-[#E7F7EE]"
          : statusLabel === "In Review"
          ? "bg-[#FDF1E3]"
          : "bg-[#F1F1F4]",
    };

    const ownerName = doc.owner?.name || user.name || "Owner";
    const ownerObj = {
      id: doc.owner?.id || doc.ownerId,
      name: ownerName,
      initials: ownerName.slice(0, 2).toUpperCase(),
      avatarUrl: doc.owner?.avatarUrl || user.avatarUrl,
      isOwner: true,
    };

    const collaboratorObjs = (doc.collaborators || []).map((c) => {
      const name = c.user?.name || "Collaborator";
      return {
        id: c.user?.id || c.userId,
        name,
        initials: name.slice(0, 2).toUpperCase(),
        avatarUrl: c.user?.avatarUrl,
        isOwner: false,
      };
    });

    return {
      id: doc.id,
      title: doc.title || "Untitled Document",
      previewText: textContent || "Empty document canvas...",
      wordCount,
      category,
      status,
      accessRole: doc.accessRole,
      updatedAt: doc.updatedAt.toISOString(),
      collaborators: [ownerObj, ...collaboratorObjs],
    };
  });

  const totalWords = documents.reduce((acc, curr) => acc + curr.wordCount, 0);

  return (
    <div className="flex-1 p-6 md:p-8 max-w-7xl mx-auto w-full space-y-6">
      {/* Top Welcome Header & Workspace Activity Widget */}
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4 pb-4 border-b border-(--border-subtle)">
        <div>
          <h1 className="text-2xl font-semibold tracking-[-0.02em] text-(--text-primary)">
            Documents Overview
          </h1>
          <p className="text-xs text-(--text-secondary) mt-1">
            Welcome back, <strong className="font-semibold text-(--text-primary)">{user.name}</strong>. Access your owned and shared documents.
          </p>
        </div>

        {/* Stats & Quick Actions */}
        <div className="flex flex-wrap items-center gap-3">
          <div className="bg-(--bg-surface) border border-(--border-subtle) px-4 py-2.5 rounded-xl shadow-clarity flex items-center gap-3">
            <div className="p-2 rounded-lg bg-(--accent-soft-bg) text-(--accent-primary)">
              <FileCheck2 className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-(--text-tertiary) uppercase font-semibold">Total Docs</div>
              <div className="text-sm font-semibold text-(--text-primary)">{documents.length}</div>
            </div>
          </div>

          <div className="bg-(--bg-surface) border border-(--border-subtle) px-4 py-2.5 rounded-xl shadow-clarity flex items-center gap-3">
            <div className="p-2 rounded-lg bg-[#E7F7EE] text-[#1DAA61]">
              <TrendingUp className="w-4 h-4" />
            </div>
            <div>
              <div className="text-[11px] text-(--text-tertiary) uppercase font-semibold">Word Count</div>
              <div className="text-sm font-semibold text-(--text-primary)">{totalWords.toLocaleString()}</div>
            </div>
          </div>

          <NewDocumentButton showText={false} />
        </div>
      </div>

      {/* Main Documents Grid & Table List View Container */}
      <DocumentsViewContainer initialDocuments={documents} />
    </div>
  );
}
