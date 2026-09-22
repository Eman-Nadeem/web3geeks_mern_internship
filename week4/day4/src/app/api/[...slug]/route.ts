import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { errorResponse } from "@/server/http/response";

export const runtime = "nodejs";

const handleNotFound = withHandler(async (_req: NextRequest) => {
  return errorResponse("Route not found", 404);
});

export const GET = handleNotFound;
export const POST = handleNotFound;
export const PUT = handleNotFound;
export const PATCH = handleNotFound;
export const DELETE = handleNotFound;
export const HEAD = handleNotFound;
export const OPTIONS = handleNotFound;
