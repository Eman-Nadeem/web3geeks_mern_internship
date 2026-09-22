import { NextRequest } from "next/server";
import { z } from "zod";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { AuthenticatedContext } from "@/server/http/with-auth";
import { successResponse } from "@/server/http/response";
import { validate } from "@/server/http/validate";
import { listNotifications } from "@/server/modules/notifications/service";

const QuerySchema = z.object({
  page: z.coerce.number().int().min(1).default(1),
  limit: z.coerce.number().int().min(1).max(100).default(20),
  unreadOnly: z
    .string()
    .optional()
    .transform((v) => v === "true"),
});

export const GET = withHandler(
  withAuth(async (req: NextRequest, ctx: AuthenticatedContext) => {
    const query = validate(QuerySchema, Object.fromEntries(req.nextUrl.searchParams));
    const result = await listNotifications(ctx.user.id, query);
    return successResponse(result, "Notifications fetched");
  })
);
