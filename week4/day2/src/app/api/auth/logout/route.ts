import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { clearAuthCookie } from "@/server/lib/cookies";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const POST = withHandler(
  withAuth(async (_req: NextRequest) => {
    const response = successResponse(null, "Logged out successfully", 200);
    clearAuthCookie(response);
    return response;
  })
);
