import { NextRequest } from "next/server";
import { withHandler } from "@/server/http/with-handler";
import { validate } from "@/server/http/validate";
import { registerSchema } from "@/lib/validations";
import { register } from "@/server/modules/auth/service";
import { setAuthCookie } from "@/server/lib/cookies";
import { successResponse } from "@/server/http/response";
import { rateLimitAuth } from "@/server/lib/rate-limit";

export const runtime = "nodejs";

export const POST = withHandler(async (req: NextRequest) => {
  await rateLimitAuth(req);

  const rawBody = await req.json();
  const input = validate(registerSchema, rawBody);

  const { user, token } = await register(input);

  const response = successResponse(
    { user },
    "Registration successful",
    201
  );

  setAuthCookie(response, token);
  return response;
});
