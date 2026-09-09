import { SignJWT, jwtVerify } from "jose";

export const DEFAULT_SECRET = "CHANGE_ME_INSECURE_DEV_ONLY_DO_NOT_DEPLOY";

export function getJwtSecret(): Uint8Array {
  const secret = process.env.AUTH_SECRET || DEFAULT_SECRET;

  if (
    process.env.NODE_ENV === "production" &&
    (!process.env.AUTH_SECRET || process.env.AUTH_SECRET === DEFAULT_SECRET)
  ) {
    throw new Error(
      "FATAL CONFIGURATION ERROR: AUTH_SECRET environment variable is missing or set to the insecure dev fallback in production. Generate a strong secret via `openssl rand -base64 32`."
    );
  }

  return new TextEncoder().encode(secret);
}

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
  const secret = getJwtSecret();
  return await new SignJWT({
    id: payload.id,
    email: payload.email,
    name: payload.name,
    avatarUrl: payload.avatarUrl ?? null,
  })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime("7d")
    .sign(secret);
}

/**
 * Verifies a JWT token and returns the decoded payload, or null if invalid/expired.
 */
export async function verifyToken(token: string): Promise<JWTPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
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
