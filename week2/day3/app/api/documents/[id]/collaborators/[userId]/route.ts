import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import {
  removeDocumentCollaborator,
  updateCollaboratorRole,
} from "@/lib/db/documents";
import { getCurrentUser } from "@/lib/auth/session";

interface RouteParams {
  params: Promise<{ id: string; userId: string }>;
}

const updateRoleSchema = z.object({
  role: z.enum(["editor", "viewer"]),
});

export async function DELETE(_req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId: targetUserId } = await params;
    const result = await removeDocumentCollaborator(id, targetUserId, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json(
      { message: "Collaborator removed successfully", data: result.data },
      { status: 200 }
    );
  } catch (error) {
    console.error("DELETE /api/documents/[id]/collaborators/[userId] error:", error);
    return NextResponse.json(
      { error: "Failed to remove collaborator" },
      { status: 500 }
    );
  }
}

export async function PATCH(req: NextRequest, { params }: RouteParams) {
  try {
    const user = await getCurrentUser();
    if (!user) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const { id, userId: targetUserId } = await params;
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = updateRoleSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { role } = parseResult.data;
    const result = await updateCollaboratorRole(id, targetUserId, role, user.id);

    if (!result.success) {
      return NextResponse.json(
        { error: result.error },
        { status: result.status }
      );
    }

    return NextResponse.json({ data: result.data }, { status: 200 });
  } catch (error) {
    console.error("PATCH /api/documents/[id]/collaborators/[userId] error:", error);
    return NextResponse.json(
      { error: "Failed to update collaborator role" },
      { status: 500 }
    );
  }
}
