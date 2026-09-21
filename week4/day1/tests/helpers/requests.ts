import { NextRequest } from "next/server";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

export function createRequest(
  url: string,
  options: {
    method?: string;
    body?: any;
    token?: string;
    headers?: Record<string, string>;
  } = {}
): NextRequest {
  const { method = "GET", body, token, headers = {} } = options;
  const reqHeaders = new Headers(headers);

  if (body && !reqHeaders.has("content-type")) {
    reqHeaders.set("content-type", "application/json");
  }

  // Set host if not present
  if (!reqHeaders.has("host")) {
    const parsedUrl = new URL(url);
    reqHeaders.set("host", parsedUrl.host);
  }

  const reqInit: RequestInit = {
    method,
    headers: reqHeaders,
    body: body ? JSON.stringify(body) : undefined,
  };

  const req = new NextRequest(url, reqInit as any);

  if (token) {
    req.cookies.set(AUTH_COOKIE_NAME, token);
  }

  return req;
}
