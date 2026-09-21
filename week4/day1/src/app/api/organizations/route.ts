import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth, AuthenticatedContext } from "@/server/http/with-auth";
import { validate } from "@/server/http/validate";
import { createOrgSchema } from "@/lib/validations";
import {
  createOrganization,
  getUserOrganizations,
} from "@/server/modules/organizations/service";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(
  withAuth(async (_req: NextRequest, ctx: AuthenticatedContext) => {
    const organizations = await getUserOrganizations(ctx.user.id);
    return successResponse(
      { organizations },
      "Organizations retrieved successfully",
      200
    );
  })
);

export const POST = withHandler(
  withAuth(async (req: NextRequest, ctx: AuthenticatedContext) => {
    const rawBody = await req.json();
    const input = validate(createOrgSchema, rawBody);

    const organization = await createOrganization(ctx.user.id, input);

    return successResponse(
      { organization },
      "Organization created successfully",
      201
    );
  })
);
