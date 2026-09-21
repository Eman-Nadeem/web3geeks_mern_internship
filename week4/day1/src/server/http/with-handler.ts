import { NextRequest, NextResponse } from "next/server";
import { ZodError } from "zod";
import { AppError } from "./AppError";
import { errorResponse } from "./response";
import { formatZodError } from "./validate";
import { logger } from "../lib/logger";
import { verifySameOrigin } from "../lib/origin";

export type NextRouteContext = {
  params: Promise<Record<string, string | string[]>>;
};

export type RouteHandler<TContext = NextRouteContext> = (
  req: NextRequest,
  context: TContext
) => Promise<NextResponse> | NextResponse;

interface PrismaErrorLike {
  code: string;
  meta?: {
    target?: string[];
    [key: string]: unknown;
  };
  message: string;
}

function isPrismaKnownRequestError(error: unknown): error is PrismaErrorLike {
  return (
    typeof error === "object" &&
    error !== null &&
    "code" in error &&
    typeof (error as Record<string, unknown>).code === "string" &&
    ((error as Record<string, unknown>).code as string).startsWith("P")
  );
}

export function withHandler<TContext = NextRouteContext>(
  handler: RouteHandler<TContext>
): (req: NextRequest, context: TContext) => Promise<NextResponse> {
  return async (req: NextRequest, context: TContext): Promise<NextResponse> => {
    try {
      // CSRF protection for mutating methods
      verifySameOrigin(req);

      return await handler(req, context);
    } catch (error: unknown) {
      if (error instanceof AppError) {
        logger.warn(
          {
            err: {
              name: error.name,
              message: error.message,
              statusCode: error.statusCode,
              errors: error.errors,
            },
            method: req.method,
            path: req.nextUrl.pathname,
          },
          `AppError: ${error.message}`
        );
        return errorResponse(error.message, error.statusCode, error.errors);
      }

      if (error instanceof ZodError) {
        const errors = formatZodError(error);
        const message = errors[0]?.message || "Invalid input data";
        logger.warn(
          {
            err: { errors },
            method: req.method,
            path: req.nextUrl.pathname,
          },
          `Validation Error: ${message}`
        );
        return errorResponse(message, 400, errors);
      }

      if (isPrismaKnownRequestError(error)) {
        // P2002: Unique constraint failed
        if (error.code === "P2002") {
          const target = error.meta?.target || [];
          let message = "A unique constraint violation occurred";
          if (target.includes("email")) {
            message = "Email already in use";
          } else if (target.includes("slug")) {
            message = "Organization slug already taken";
          }
          logger.warn(
            { code: error.code, target, method: req.method, path: req.nextUrl.pathname },
            `Prisma unique constraint error: ${message}`
          );
          return errorResponse(message, 409);
        }

        // P2025: Record not found
        if (error.code === "P2025") {
          logger.warn(
            { code: error.code, method: req.method, path: req.nextUrl.pathname },
            "Prisma record not found"
          );
          return errorResponse("Record not found", 404);
        }

        logger.error(
          {
            code: error.code,
            meta: error.meta,
            method: req.method,
            path: req.nextUrl.pathname,
          },
          "Prisma database error"
        );
        return errorResponse("Database operation failed", 500);
      }

      if (error instanceof SyntaxError && "body" in (error as unknown as Record<string, unknown>)) {
        // JSON parsing error
        logger.warn(
          { method: req.method, path: req.nextUrl.pathname },
          "Malformed JSON body"
        );
        return errorResponse("Invalid JSON payload", 400);
      }

      // Check for generic JSON parse errors
      if (error instanceof SyntaxError && error.message.includes("JSON")) {
        logger.warn(
          { method: req.method, path: req.nextUrl.pathname },
          "Malformed JSON input"
        );
        return errorResponse("Invalid JSON payload", 400);
      }

      // Unknown / unexpected errors
      logger.error(
        {
          err: error instanceof Error ? { message: error.message, stack: error.stack } : error,
          method: req.method,
          path: req.nextUrl.pathname,
        },
        "Unhandled server error"
      );

      return errorResponse("An unexpected internal server error occurred", 500);
    }
  };
}
