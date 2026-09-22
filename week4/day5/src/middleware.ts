import { NextRequest, NextResponse } from "next/server";
import { jwtVerify } from "jose";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

const PROTECTED_PREFIXES = ["/dashboard", "/organizations", "/profile"];
const AUTH_PREFIXES = ["/login", "/register"];

export async function middleware(req: NextRequest) {
  const { pathname } = req.nextUrl;
  const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

  let isAuthenticated = false;

  if (token) {
    try {
      const jwtSecret = process.env.JWT_SECRET;
      if (!jwtSecret && process.env.NODE_ENV === "production") {
        throw new Error("JWT_SECRET must be configured in production");
      }
      const secret = new TextEncoder().encode(
        jwtSecret || "super-secret-jwt-key-min-32-characters-change-in-production-123456"
      );
      await jwtVerify(token, secret, { algorithms: ["HS256"] });
      isAuthenticated = true;
    } catch {
      isAuthenticated = false;
    }
  }

  const isProtectedPath = PROTECTED_PREFIXES.some((prefix) =>
    pathname.startsWith(prefix)
  );
  const isAuthPath = AUTH_PREFIXES.some((prefix) => pathname.startsWith(prefix));

  // If trying to access protected route without valid JWT
  if (isProtectedPath && !isAuthenticated) {
    const loginUrl = new URL("/login", req.url);
    loginUrl.searchParams.set("redirect", pathname);
    return NextResponse.redirect(loginUrl);
  }

  // If already authenticated and visiting login/register
  if (isAuthPath && isAuthenticated) {
    return NextResponse.redirect(new URL("/dashboard", req.url));
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    "/dashboard/:path*",
    "/organizations/:path*",
    "/profile/:path*",
    "/login",
    "/register",
  ],
};
