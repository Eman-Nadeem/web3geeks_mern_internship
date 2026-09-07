import { getDocumentById } from "@/lib/db/documents";
import { notFound } from "next/navigation";
import { EditorClientContainer } from "./editor-client-container";

interface DocumentPageProps {
  params: Promise<{ id: string }>;
}

export const revalidate = 0; // Dynamic route

export default async function DocumentPage({ params }: DocumentPageProps) {
  const { id } = await params;
  if (!id) {
    notFound();
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
    />
  );
}
