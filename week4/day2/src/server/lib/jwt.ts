import { SignJWT, jwtVerify } from "jose";
import { env } from "../config/env";

export interface TokenPayload {
  sub: string;
  [key: string]: unknown;
}

function getJwtSecret(): Uint8Array {
  const secret = env.JWT_SECRET;
  return new TextEncoder().encode(secret);
}

export async function signToken(
  payload: { sub: string },
  expiresIn: string = env.JWT_EXPIRES_IN
): Promise<string> {
  const secret = getJwtSecret();
  return new SignJWT({ ...payload })
    .setProtectedHeader({ alg: "HS256" })
    .setIssuedAt()
    .setExpirationTime(expiresIn)
    .sign(secret);
}

export async function verifyToken(token: string): Promise<TokenPayload | null> {
  try {
    const secret = getJwtSecret();
    const { payload } = await jwtVerify(token, secret, {
      algorithms: ["HS256"],
    });
    return payload as TokenPayload;
  } catch {
    return null;
  }
}
