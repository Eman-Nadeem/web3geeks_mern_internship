import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth, AuthenticatedContext } from "@/server/http/with-auth";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, ctx: AuthenticatedContext) => {
    return successResponse(
      { user: ctx.user },
      "Current user profile retrieved",
      200
    );
  })
);
