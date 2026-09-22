import { NextRequest } from "next/server";
import { z } from "zod";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { AuthenticatedContext } from "@/server/http/with-auth";
import { successResponse } from "@/server/http/response";
import { validate } from "@/server/http/validate";
import { markRead, deleteNotification } from "@/server/modules/notifications/service";

type Params = { notificationId: string };

const MarkReadSchema = z.object({
  isRead: z.literal(true),
});

export const PATCH = withHandler(
  withAuth(async (req: NextRequest, ctx: AuthenticatedContext<Params>) => {
    validate(MarkReadSchema, await req.json());
    await markRead([ctx.params.notificationId], ctx.user.id);
    return successResponse(null, "Notification marked as read");
  })
);

export const DELETE = withHandler(
  withAuth(async (_req: NextRequest, ctx: AuthenticatedContext<Params>) => {
    await deleteNotification(ctx.params.notificationId, ctx.user.id);
    return successResponse(null, "Notification deleted");
  })
);
