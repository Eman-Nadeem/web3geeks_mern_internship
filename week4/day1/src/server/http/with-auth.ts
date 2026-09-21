import { NextRequest, NextResponse } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";
import { verifyToken } from "../lib/jwt";
import { prisma } from "../db/prisma";
import { AppError } from "./AppError";
import { UserDTO } from "@/types";

import { NextRouteContext } from "./with-handler";

export interface AuthenticatedContext<TParams = Record<string, string | string[]>> {
  user: UserDTO;
  params: TParams;
  [key: string]: unknown;
}

export type AuthenticatedHandler<TParams = Record<string, string | string[]>> = (
  req: NextRequest,
  ctx: AuthenticatedContext<TParams>
) => Promise<NextResponse> | NextResponse;

export function withAuth<TParams = Record<string, string | string[]>>(
  handler: AuthenticatedHandler<TParams>
) {
  return async (
    req: NextRequest,
    rawContext: { params: Promise<TParams> } | NextRouteContext
  ): Promise<NextResponse> => {
    // Read JWT from req.cookies (maintains unit-testability without next/headers)
    const token = req.cookies.get(AUTH_COOKIE_NAME)?.value;

    if (!token) {
      throw new AppError(401, "Authentication required. Please log in.");
    }

    const payload = await verifyToken(token);
    if (!payload || !payload.sub) {
      throw new AppError(401, "Invalid or expired session. Please log in again.");
    }

    const user = await prisma.user.findUnique({
      where: { id: payload.sub },
      select: {
        id: true,
        name: true,
        email: true,
        avatar: true,
        createdAt: true,
      },
    });

    if (!user) {
      throw new AppError(401, "User account not found or has been deactivated.");
    }

    const resolvedParams = (
      rawContext?.params ? await Promise.resolve(rawContext.params) : {}
    ) as TParams;

    const ctx: AuthenticatedContext<TParams> = {
      ...(rawContext || {}),
      params: resolvedParams,
      user: {
        ...user,
        createdAt: user.createdAt.toISOString(),
      },
    };

    return handler(req, ctx);
  };
}
