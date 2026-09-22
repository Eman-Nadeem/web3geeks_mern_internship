import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { withAuth } from "@/server/http/with-auth";
import { withOrgRole, OrgRoleContext } from "@/server/http/with-org-role";
import { successResponse } from "@/server/http/response";
import { getPresence } from "@/server/modules/presence/service";
import { prisma } from "@/server/db/prisma";

type Params = { organizationId: string };

export const GET = withHandler(
  withAuth(
    withOrgRole(["OWNER", "ADMIN", "MEMBER"], async (_req: NextRequest, ctx: OrgRoleContext<Params>) => {
      const memberships = await prisma.membership.findMany({
        where: { organizationId: ctx.organization.id },
        select: { userId: true },
      });

      const userIds = memberships.map((m) => m.userId);
      const presence = await getPresence(userIds);
      return successResponse({ presence }, "Presence fetched");
    })
  )
);
