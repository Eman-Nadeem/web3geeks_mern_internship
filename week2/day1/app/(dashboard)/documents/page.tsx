import { getAllDocuments } from "@/lib/db/documents";
import { NewDocumentButton } from "@/components/documents/new-document-button";
import { DocumentsViewContainer } from "./documents-view-container";
import { TrendingUp, FileCheck2 } from "lucide-react";

export const revalidate = 0; // Dynamic route

export default async function DocumentsPage() {
  const rawDocuments = await getAllDocuments();

  const stripHtml = (html: string) => {
    return html.replace(/<[^>]*>?/gm, " ").replace(/\s+/g, " ").trim();
  };

  const categories = ["Product", "Engineering", "Marketing", "Architecture", "Design"];
  const statuses = [
    { label: "Complete", textClass: "text-[#1DAA61]", bgClass: "bg-[#E7F7EE]" },
    { label: "In Review", textClass: "text-[#E08A2E]", bgClass: "bg-[#FDF1E3]" },
    { label: "Draft", textClass: "text-[#6B6B76]", bgClass: "bg-[#F1F1F4]" },
  ];

  const documents = rawDocuments.map((doc, idx) => {
    const textContent = stripHtml(doc.content);
    const wordCount = textContent ? textContent.split(/\s+/).filter(Boolean).length : 0;
    const category = categories[idx % categories.length];
    const status = statuses[idx % statuses.length];

    return {
      id: doc.id,
      title: doc.title || "Untitled Document",
      previewText: textContent || "Empty document canvas...",
      wordCount,
      category,
      status,
      updatedAt: doc.updatedAt.toISOString(),
      collaborators: [
        { initials: "DA", name: "Demo Architect", bg: "bg-(--accent-primary)" },
        { initials: "SJ", name: "Sarah Jenkins", bg: "bg-(--chart-blue)" },
        { initials: "AR", name: "Alex Rivera", bg: "bg-(--chart-orange)" },
      ],
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
            Streamlined workspace for creating, managing, and editing collaborative documents.
          </p>
        </div>

        {/* Workspace Summary Cards */}
        <div className="flex flex-wrap sm:flex-nowrap items-center gap-2.5 sm:gap-3">
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

          <NewDocumentButton showSparkleAffordance={true} />
        </div>
      </div>

      {/* Main Documents Grid & Table List View Container */}
      <DocumentsViewContainer initialDocuments={documents} />
    </div>
  );
}
