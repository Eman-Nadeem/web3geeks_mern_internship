import { NextRequest } from "next/server";
import { AppError } from "../http/AppError";

export function verifySameOrigin(req: NextRequest): void {
  const method = req.method.toUpperCase();
  // Only check mutating requests
  if (!["POST", "PATCH", "PUT", "DELETE"].includes(method)) {
    return;
  }

  const origin = req.headers.get("origin");
  if (!origin) {
    // If no origin header is present (e.g. non-browser API client or programmatic testing), allow or check referer
    return;
  }

  try {
    const originUrl = new URL(origin);
    const hostHeader = req.headers.get("host") || req.nextUrl.host;
    
    // In local dev/proxies, hostHeader might be 'localhost:3000'
    // originUrl.host includes hostname and port (e.g. 'localhost:3000')
    if (originUrl.host.toLowerCase() !== hostHeader.toLowerCase()) {
      // Also check forwarded host if present
      const forwardedHost = req.headers.get("x-forwarded-host");
      if (forwardedHost && originUrl.host.toLowerCase() === forwardedHost.toLowerCase()) {
        return;
      }

      throw new AppError(403, "Cross-origin request rejected");
    }
  } catch (err) {
    if (err instanceof AppError) throw err;
    throw new AppError(403, "Invalid origin header");
  }
}
