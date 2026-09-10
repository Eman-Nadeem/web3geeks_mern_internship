import { NextRequest, NextResponse } from "next/server";
import {
  deleteDocument,
  getDocumentById,
  updateDocument,
  getUserDocumentAccess,
} from "@/lib/db/documents";
import { updateDocumentSchema } from "@/lib/validation/document";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to view this document." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const accessRole = await getUserDocumentAccess(user.id, id);
    if (accessRole === "none") {
      return NextResponse.json(
        { error: "Forbidden: You do not have permission to access this document" },
        { status: 403 }
      );
    }

    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: document, accessRole }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to fetch document" },
      { status: 500 }
    );
  }
}

export async function PUT(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to update this document." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Missing JSON payload" }, { status: 400 });
    }

    const parseResult = updateDocumentSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid document update payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const result = await updateDocument(id, user.id, parseResult.data);
    if (!result.success) {
      if (result.status === 409) {
        return NextResponse.json(
          {
            error: result.error,
            currentVersion: result.currentVersion,
            content: result.content,
          },
          { status: 409 }
        );
      }
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export const PATCH = PUT;

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to delete this document." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const result = await deleteDocument(id, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { message: "Document deleted successfully", id: result.data.id },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to delete document" },
      { status: 500 }
    );
  }
}
