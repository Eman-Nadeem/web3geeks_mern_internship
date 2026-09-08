import { getDocumentById, getUserDocumentAccess } from "@/lib/db/documents";
import { notFound, redirect } from "next/navigation";
import { EditorClientContainer } from "./editor-client-container";
import { getCurrentUser } from "@/lib/auth/session";
import Link from "next/link";
import { ShieldAlert, ArrowLeft } from "lucide-react";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Dynamic route

export default async function DocumentPage({ params }: DocumentPageProps) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  const { id } = await params;
  if (!id) {
    notFound();
  }

  const accessRole = await getUserDocumentAccess(user.id, id);

  if (accessRole === "none") {
    return (
      <div className="flex-1 flex items-center justify-center p-6 min-h-[80vh]">
        <div className="bg-(--bg-surface) border border-(--border-subtle) rounded-2xl p-8 max-w-md w-full text-center space-y-4 shadow-clarity">
          <div className="w-12 h-12 rounded-xl bg-rose-50 text-rose-600 flex items-center justify-center mx-auto border border-rose-200">
            <ShieldAlert className="w-6 h-6" />
          </div>
          <div className="space-y-1">
            <h2 className="text-lg font-semibold text-(--text-primary)">
              Access Denied
            </h2>
            <p className="text-xs text-(--text-secondary) leading-relaxed">
              You do not have permission to view this document. Please request access from the document owner.
            </p>
          </div>
          <div className="pt-2">
            <Link
              href="/documents"
              className="inline-flex items-center gap-2 px-4 py-2 rounded-lg bg-(--accent-primary) hover:bg-(--accent-primary-hover) text-white text-xs font-semibold shadow-clarity transition-all"
            >
              <ArrowLeft className="w-3.5 h-3.5" />
              <span>Back to Documents</span>
            </Link>
          </div>
        </div>
      </div>
    );
  }

  const document = await getDocumentById(id);
  if (!document) {
    notFound();
  }

  return (
    <EditorClientContainer
      id={document.id}
      initialTitle={document.title}
      initialContent={document.content}
      initialUpdatedAt={document.updatedAt.toISOString()}
      initialStatus={document.status || "Draft"}
      initialCategory={document.category || "General"}
      accessRole={accessRole}
      ownerName={document.owner?.name || "Document Owner"}
      ownerEmail={document.owner?.email}
      ownerAvatarUrl={document.owner?.avatarUrl}
    />
  );
}
