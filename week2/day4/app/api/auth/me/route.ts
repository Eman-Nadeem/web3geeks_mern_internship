import { NextRequest, NextResponse } from "next/server";
import { z } from "zod";
import { getCurrentUser, AUTH_COOKIE_NAME, getCookieOptions } from "@/lib/auth/session";
import { prisma } from "@/lib/db/prisma";
import { signToken } from "@/lib/auth/jwt";

const updateProfileSchema = z.object({
  name: z.string().min(1, { message: "Name cannot be empty" }).max(100).optional(),
  avatarUrl: z.string().url({ message: "Must be a valid image URL" }).optional().or(z.literal("")),
});

export async function GET() {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  return NextResponse.json({ data: currentUser }, { status: 200 });
}

export async function PUT(req: NextRequest) {
  const currentUser = await getCurrentUser();
  if (!currentUser) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  try {
    const body = await req.json().catch(() => null);
    if (!body) {
      return NextResponse.json({ error: "Invalid JSON payload" }, { status: 400 });
    }

    const parseResult = updateProfileSchema.safeParse(body);
    if (!parseResult.success) {
      return NextResponse.json(
        { error: "Validation failed", details: parseResult.error.flatten() },
        { status: 400 }
      );
    }

    const { name, avatarUrl } = parseResult.data;
    const updateData: { name?: string; avatarUrl?: string | null } = {};
    if (name !== undefined) updateData.name = name.trim();
    if (avatarUrl !== undefined) updateData.avatarUrl = avatarUrl || null;

    const updatedUser = await prisma.user.update({
      where: { id: currentUser.id },
      data: updateData,
      select: {
        id: true,
        email: true,
        name: true,
        avatarUrl: true,
      },
    });

    // Refresh JWT cookie with updated name/avatar
    const token = await signToken({
      id: updatedUser.id,
      email: updatedUser.email,
      name: updatedUser.name || "Collaborator",
      avatarUrl: updatedUser.avatarUrl,
    });

    const response = NextResponse.json(
      { data: updatedUser, message: "Profile updated successfully" },
      { status: 200 }
    );

    response.cookies.set(AUTH_COOKIE_NAME, token, getCookieOptions());
    return response;
  } catch (error) {
    console.error("PUT /api/auth/me error:", error);
    return NextResponse.json(
      { error: "Failed to update profile" },
      { status: 500 }
    );
  }
}
