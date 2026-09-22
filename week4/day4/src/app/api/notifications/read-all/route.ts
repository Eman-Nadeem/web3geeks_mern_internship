import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { AuthenticatedContext } from "@/server/http/with-auth";
import { successResponse } from "@/server/http/response";
import { markAllRead } from "@/server/modules/notifications/service";

export const POST = withHandler(
  withAuth(async (_req: NextRequest, ctx: AuthenticatedContext) => {
    await markAllRead(ctx.user.id);
    return successResponse(null, "All notifications marked as read");
  })
);
