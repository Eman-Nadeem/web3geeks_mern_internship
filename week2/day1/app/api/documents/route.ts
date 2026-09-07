import { NextRequest, NextResponse } from "next/server";
import { createDocument, getAllDocuments } from "@/lib/db/documents";
import { createDocumentSchema } from "@/lib/validation/document";

export async function GET() {
  try {
    const documents = await getAllDocuments();
    return NextResponse.json({ data: documents }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to retrieve documents" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest) {
  try {
    const body = await req.json().catch(() => ({}));
    const parseResult = createDocumentSchema.safeParse(body);

    if (!parseResult.success) {
      return NextResponse.json(
        {
          error: "Invalid document creation payload",
          details: parseResult.error.flatten(),
        },
        { status: 400 }
      );
    }

    const newDocument = await createDocument("user_demo_123", parseResult.data);
    return NextResponse.json({ data: newDocument }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents error:", error);
    return NextResponse.json(
      { error: "Failed to create document" },
      { status: 500 }
    );
  }
}
