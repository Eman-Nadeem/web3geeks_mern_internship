import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { restoreDocumentVersion } from "@/lib/db/documents";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const restoreSchema = z.object({
  versionNumber: z.number().int().positive({ message: "versionNumber must be positive" }),
});

/**
 * POST /api/documents/[id]/restore
 * Restores a historical document version.
 * - Owner and Editor only (Viewers rejected with 403).
 * - Creates a NEW version snapshot with the historical content.
 * - Triggers real-time document_restored broadcast to all active room sessions.
 */
export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json(
        { error: "Unauthorized. Please log in to restore versions." },
        { status: 401 }
      );
    }

    const { id } = await params;
    if (!id) {
      return NextResponse.json({ error: "Document ID missing" }, { status: 400 });
    }

    const body = await req.json().catch(() => null);
    const parseResult = restoreSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Invalid payload", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { versionNumber } = parseResult.data;
    const result = await restoreDocumentVersion(id, versionNumber, user.id);
    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    const { document: doc, newVersion } = result.data;

    // Trigger real-time WebSocket broadcast via internal socket bridge
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    try {
      await fetch(`${socketUrl}/api/socket/document-restored`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-bridge-secret": process.env.INTERNAL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          documentId: id,
          version: doc.version,
          restoredFromVersion: versionNumber,
          title: doc.title,
          content: doc.content,
          jsonContent: doc.jsonContent,
          restoredBy: {
            id: user.id,
            name: user.name,
            email: user.email,
            avatarUrl: user.avatarUrl,
          },
          restoredAt: new Date().toISOString(),
        }),
      }).catch((err) => {
        console.warn("[Restore] Notice: Could not contact socket bridge for live broadcast:", err.message);
      });
    } catch {
      // Non-blocking bridge call
    }

    return NextResponse.json(
      {
        message: `Successfully restored version ${versionNumber}`,
        data: {
          document: doc,
          newVersion,
          restoredFromVersion: versionNumber,
        },
      },
      { status: 200 }
    );
  } catch (error) {
    console.error("POST /api/documents/[id]/restore error:", error);
    return NextResponse.json(
      { error: "Failed to restore document version" },
      { status: 500 }
    );
  }
}
