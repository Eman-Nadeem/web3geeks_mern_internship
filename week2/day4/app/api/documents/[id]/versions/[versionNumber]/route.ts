import { NextRequest, NextResponse } from "next/server";
import { getDocumentVersion } from "@/lib/db/documents";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string; versionNumber: string }>;
}

/**
 * GET /api/documents/[id]/versions/[versionNumber]
 * Fetches a single historical version for read-only preview.
 * Accessible by Owner, Editor, and Viewer.
 */
export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view version preview." },
        { status: 401 }
      );
    }

    const { id, versionNumber } = await params;
    const vNum = parseInt(versionNumber, 10);
    if (isNaN(vNum) || vNum < 1) {
      return NextResponse.json({ error: "Invalid version number" }, { status: 400 });
    }

    const result = await getDocumentVersion(id, vNum, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents/[id]/versions/[versionNumber] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document version" },
      { status: 500 }
    );
  }
}
