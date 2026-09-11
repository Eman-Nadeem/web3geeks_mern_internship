import { NextRequest, NextResponse } from "next/server";
import { getDocumentVersions } from "@/lib/db/documents";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

/**
 * GET /api/documents/[id]/versions
 * Fetches all versions for a document (newest first).
 * Accessible by Owner, Editor, and Viewer.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view version history." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const result = await getDocumentVersions(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents/[id]/versions error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document versions" },
      { status: 500 }
    );
  }
}
