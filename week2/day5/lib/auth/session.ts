import { cookies } from "next/headers";
import { verifyToken, JWTPayload } from "./jwt";
import { prisma } from "../db/prisma";

export const AUTH_COOKIE_NAME = "auth_token";

/**
 * Retrieves the currently authenticated user in Server Components and Route Handlers.
 */
export async function getCurrentUser(): Promise<JWTPayload | null> {
  try {
    const cookieStore = await cookies();
    const token = cookieStore.get(AUTH_COOKIE_NAME)?.value;
    if (!token) return null;

    const payload = await verifyToken(token);
    if (!payload?.id) return null;

    // Verify user still exists in database and fetch freshest profile data
    const user = await prisma.user.findUnique({
      where: { id: payload.id },
      select: { id: true, email: true, name: true, avatarUrl: true },
    });

    if (!user) return null;

    return {
      id: user.id,
      email: user.email,
      name: user.name || "Collaborator",
      avatarUrl: user.avatarUrl,
    };
  } catch {
    return null;
  }
}

/**
 * Cookie options for secure session handling.
 */
export function getCookieOptions() {
  const isProduction = process.env.NODE_ENV === "production";
  return {
    httpOnly: true,
    secure: isProduction,
    sameSite: "lax" as const,
    path: "/",
    maxAge: 60 * 60 * 24 * 7, // 7 days
  };
}
