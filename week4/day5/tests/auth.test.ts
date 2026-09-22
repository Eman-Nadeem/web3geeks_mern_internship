import { describe, it, expect } from "vitest";
import { POST as registerHandler } from "@/app/api/auth/register/route";
import { POST as loginHandler } from "@/app/api/auth/login/route";
import { POST as logoutHandler } from "@/app/api/auth/logout/route";
import { GET as meHandler } from "@/app/api/auth/me/route";
import { createRequest } from "./helpers/requests";
import { AUTH_COOKIE_NAME } from "@/lib/constants";

describe("Authentication API Routes", () => {
  const validUser = {
    name: "Alice Johnson",
    email: "alice@example.com",
    password: "Password123!",
  };

  describe("POST /api/auth/register", () => {
    it("should register a user successfully, set the cookie, and return user without password hash", async () => {
      const req = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });

      const res = await registerHandler(req, {} as any);
      expect(res.status).toBe(201);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user).toBeDefined();
      expect(json.data.user.email).toBe("alice@example.com");
      expect(json.data.user.name).toBe("Alice Johnson");
      expect(json.data.user.password).toBeUndefined();
      expect(json.data.user.id).toBeDefined();

      const cookie = res.cookies.get(AUTH_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBeTruthy();
      expect(cookie?.httpOnly).toBe(true);
    });

    it("should reject duplicate email with 409", async () => {
      const req1 = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      await registerHandler(req1, {} as any);

      const req2 = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      const res = await registerHandler(req2, {} as any);
      expect(res.status).toBe(409);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Email already in use");
    });

    it("should reject invalid email with 400", async () => {
      const req = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          ...validUser,
          email: "invalid-email-format",
        },
      });
      const res = await registerHandler(req, {} as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toBeDefined();
    });

    it("should reject weak password with 400", async () => {
      const req = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: {
          ...validUser,
          password: "password", // missing uppercase and number
        },
      });
      const res = await registerHandler(req, {} as any);
      expect(res.status).toBe(400);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.errors).toBeDefined();
    });
  });

  describe("POST /api/auth/login", () => {
    it("should log in successfully with valid credentials and set cookie", async () => {
      // First register
      const regReq = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      await registerHandler(regReq, {} as any);

      // Now login
      const loginReq = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: {
          email: validUser.email,
          password: validUser.password,
        },
      });
      const res = await loginHandler(loginReq, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(validUser.email);
      expect(json.data.user.password).toBeUndefined();

      const cookie = res.cookies.get(AUTH_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBeTruthy();
    });

    it("should return generic 401 on wrong password", async () => {
      const regReq = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      await registerHandler(regReq, {} as any);

      const loginReq = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: {
          email: validUser.email,
          password: "WrongPassword999!",
        },
      });
      const res = await loginHandler(loginReq, {} as any);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Invalid email or password");
    });

    it("should return identical generic 401 on unknown email", async () => {
      const loginReq = createRequest("http://localhost:3000/api/auth/login", {
        method: "POST",
        body: {
          email: "nonexistent@example.com",
          password: "SomePassword123!",
        },
      });
      const res = await loginHandler(loginReq, {} as any);
      expect(res.status).toBe(401);

      const json = await res.json();
      expect(json.success).toBe(false);
      expect(json.message).toBe("Invalid email or password");
    });
  });

  describe("GET /api/auth/me & POST /api/auth/logout", () => {
    it("should return 401 for /api/auth/me when unauthenticated", async () => {
      const req = createRequest("http://localhost:3000/api/auth/me");
      const res = await meHandler(req, {} as any);
      expect(res.status).toBe(401);
    });

    it("should return 200 with user profile for /api/auth/me when authenticated", async () => {
      const regReq = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      const regRes = await registerHandler(regReq, {} as any);
      const token = regRes.cookies.get(AUTH_COOKIE_NAME)!.value;

      const req = createRequest("http://localhost:3000/api/auth/me", { token });
      const res = await meHandler(req, {} as any);
      expect(res.status).toBe(200);

      const json = await res.json();
      expect(json.success).toBe(true);
      expect(json.data.user.email).toBe(validUser.email);
    });

    it("should clear the auth cookie on logout", async () => {
      const regReq = createRequest("http://localhost:3000/api/auth/register", {
        method: "POST",
        body: validUser,
      });
      const regRes = await registerHandler(regReq, {} as any);
      const token = regRes.cookies.get(AUTH_COOKIE_NAME)!.value;

      const req = createRequest("http://localhost:3000/api/auth/logout", {
        method: "POST",
        token,
      });
      const res = await logoutHandler(req, {} as any);
      expect(res.status).toBe(200);

      const cookie = res.cookies.get(AUTH_COOKIE_NAME);
      expect(cookie).toBeDefined();
      expect(cookie?.value).toBe("");
    });
  });
});
