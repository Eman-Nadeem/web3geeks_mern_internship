import { NextRequest, NextResponse } from "next/server";
import {
  deleteDocument,
  getDocumentById,
  updateDocument,
} from "@/lib/db/documents";
import { updateDocumentSchema } from "@/lib/validation/document";

interface RouteParams {
  params: Promise<{ id: string }>;
}

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const document = await getDocumentById(id);
    if (!document) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: document }, { status: 200 });
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

    const updatedDoc = await updateDocument(id, "user_demo_123", parseResult.data);
    if (!updatedDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json({ data: updatedDoc }, { status: 200 });
  } catch (error) {
    console.error("PUT /api/documents/[id] error:", error);
    return NextResponse.json(
      { error: "Failed to update document" },
      { status: 500 }
    );
  }
}

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const deletedDoc = await deleteDocument(id);
    if (!deletedDoc) {
      return NextResponse.json(
        { error: "Document not found" },
        { status: 404 }
      );
    }

    return NextResponse.json(
      { message: "Document deleted successfully", id: deletedDoc.id },
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
