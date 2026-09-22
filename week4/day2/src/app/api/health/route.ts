import { NextRequest } from "next/server";
import { prisma } from "@/server/db/prisma";
import { withHandler } from "@/server/http/with-handler";
import { successResponse } from "@/server/http/response";

export const runtime = "nodejs";

export const GET = withHandler(async (_req: NextRequest) => {
  // Execute SELECT 1 to verify database connectivity
  await prisma.$queryRaw`SELECT 1`;

  return successResponse(
    {
      status: "healthy",
      timestamp: new Date().toISOString(),
      database: "connected",
    },
    "Service is healthy"
  );
});
