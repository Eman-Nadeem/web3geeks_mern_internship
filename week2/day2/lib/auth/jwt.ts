import { SignJWT, jwtVerify } from "jose";

const DEFAULT_SECRET = "super-secret-key-week2-day2-collab-editor-32chars!";
const JWT_SECRET = new TextEncoder().encode(
  process.env.AUTH_SECRET || DEFAULT_SECRET
);

export interface JWTPayload {
  id: string;
  email: string;
  name: string;
  avatarUrl?: string | null;
}

/**
 * Signs a JWT token with user credentials.
 */
export async function signToken(payload: JWTPayload): Promise<string> {
  return await new SignJWT({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(JWT_SECRET);
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const { payload } = await jwtVerify(token, JWT_SECRET, {
      algorithms: ["HS256"],
    });

    return {
      id: payload.id as string,
      email: payload.email as string,
      name: (payload.name as string) || "Collaborator",
      avatarUrl: (payload.avatarUrl as string | undefined) ?? null,
    };
  } catch {
    return null;
  }
}
