import { DocumentSidebar } from "@/components/documents/document-sidebar";
import { getAllDocuments } from "@/lib/db/documents";

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  let initialDocs: Array<{ id: string; title: string; updatedAt: string }> = [];

  try {
    const rawDocs = await getAllDocuments();
    initialDocs = rawDocs.map((doc) => ({
      id: doc.id,
      title: doc.title,
      updatedAt: doc.updatedAt.toISOString(),
    }));
  } catch (err) {
    console.error("Failed to load initial docs for dashboard layout:", err);
  }

  return (
    <div className="flex flex-col lg:flex-row min-h-screen bg-(--bg-canvas) text-(--text-primary)">
      <DocumentSidebar initialDocuments={initialDocs} />
      <div className="flex-1 flex flex-col min-w-0 bg-(--bg-canvas)">
        {children}
      </div>
    </div>
  );
}
