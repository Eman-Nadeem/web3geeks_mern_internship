import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  getDocumentCollaborators,
  addDocumentCollaborator,
  getUserDocumentAccess,
} from "@/lib/db/documents";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string }>;
}

const addCollaboratorSchema = z.object({
  email: z.string().min(1, { message: "Email or username is required" }),
  role: z.enum(["editor", "viewer"]).default("editor"),
});

export async function GET(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const access = await getUserDocumentAccess(user.id, id);
    if (access === "none") {
      return NextResponse.json(
        { error: "Forbidden: You do not have access to this document" },
        { status: 403 }
      );
    }

    const collaborators = await getDocumentCollaborators(id);
    return NextResponse.json({ data: collaborators, callerRole: access }, { status: 200 });
  } catch (error) {
    console.error("GET /api/documents/[id]/collaborators error:", error);
    return NextResponse.json(
      { error: "Failed to fetch collaborators" },
      { status: 500 }
    );
  }
}

export async function POST(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = addCollaboratorSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { email, role } = parseResult.data;
    const result = await addDocumentCollaborator(id, email, role, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    // Trigger live broadcast to active document sessions
    const socketUrl = process.env.NEXT_PUBLIC_SOCKET_URL || "http://localhost:3001";
    try {
      await fetch(`${socketUrl}/api/socket/collaborator-added`, {
        method: "POST",
        headers: {
          "Content-Type": "application/json",
          "x-internal-bridge-secret": process.env.INTERNAL_BRIDGE_SECRET || "",
        },
        body: JSON.stringify({
          documentId: id,
          collaborator: {
            id: result.data.id,
            userId: result.data.userId,
            role: result.data.role,
            user: result.data.user,
            addedAt: new Date().toISOString(),
          },
        }),
      }).catch(() => {});
    } catch {}

    return NextResponse.json({ data: result.data }, { status: 201 });
  } catch (error) {
    console.error("POST /api/documents/[id]/collaborators error:", error);
    return NextResponse.json(
      { error: "Failed to add collaborator" },
      { status: 500 }
    );
  }
}
