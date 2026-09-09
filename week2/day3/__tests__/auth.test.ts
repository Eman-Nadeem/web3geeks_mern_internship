import { describe, it, expect } from "vitest";
import { hashPassword, verifyPassword } from "../lib/auth/password";
import { signToken, verifyToken } from "../lib/auth/jwt";

describe("Authentication & Cryptography Unit Tests", () => {
  describe("Password Hashing (bcryptjs)", () => {
    it("should hash passwords securely and not store plain text", async () => {
      const plain = "MySecurePassword123!";
      const hash = await hashPassword(plain);

      expect(hash).not.toBe(plain);
      expect(hash.startsWith("$2a$") || hash.startsWith("$2b$")).toBe(true);
    });

    it("should verify correct password match", async () => {
      const plain = "MySecurePassword123!";
      const hash = await hashPassword(plain);

      const isValid = await verifyPassword(plain, hash);
      expect(isValid).toBe(true);
    });

    it("should reject incorrect password", async () => {
      const plain = "MySecurePassword123!";
      const hash = await hashPassword(plain);

      const isValid = await verifyPassword("WrongPassword!", hash);
      expect(isValid).toBe(false);
    });

    it("should return false for empty inputs", async () => {
      expect(await verifyPassword("", "")).toBe(false);
    });
  });

  describe("JWT Token Management (jose)", () => {
    const mockUser = {
      id: "usr_test_123",
      email: "test@example.com",
      name: "Test Architect",
      avatarUrl: "https://api.dicebear.com/7.x/bottts/svg?seed=Test",
    };

    it("should sign a valid JWT token", async () => {
      const token = await signToken(mockUser);
      expect(typeof token).toBe("string");
      expect(token.split(".").length).toBe(3);
    });

    it("should verify and decode valid JWT payload", async () => {
      const token = await signToken(mockUser);
      const payload = await verifyToken(token);

      expect(payload).not.toBeNull();
      expect(payload?.id).toBe(mockUser.id);
      expect(payload?.email).toBe(mockUser.email);
      expect(payload?.name).toBe(mockUser.name);
      expect(payload?.avatarUrl).toBe(mockUser.avatarUrl);
    });

    it("should reject malformed or tampered JWT token", async () => {
      const token = await signToken(mockUser);
      const tampered = token + "invalid";
      const payload = await verifyToken(tampered);

      expect(payload).toBeNull();
    });

    it("should return null for empty token string", async () => {
      const payload = await verifyToken("");
      expect(payload).toBeNull();
    });

    it("should reject token signed with the old public README secret", async () => {
      const originalSecret = process.env.AUTH_SECRET;
      try {
        process.env.AUTH_SECRET = "production-configured-secret-key-32chars!";
        const { SignJWT } = await import("jose");
        const burnedSecret = new TextEncoder().encode(
          "super-secret-key-week2-day2-collab-editor-32chars!"
        );
        const forgedToken = await new SignJWT(mockUser)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(burnedSecret);

        const payload = await verifyToken(forgedToken);
        expect(payload).toBeNull();
      } finally {
        process.env.AUTH_SECRET = originalSecret;
      }
    });

    it("should reject token signed with the insecure dev fallback secret when AUTH_SECRET is set", async () => {
      const originalSecret = process.env.AUTH_SECRET;
      try {
        process.env.AUTH_SECRET = "production-configured-secret-key-32chars!";
        const { SignJWT } = await import("jose");
        const devFallbackSecret = new TextEncoder().encode(
          "CHANGE_ME_INSECURE_DEV_ONLY_DO_NOT_DEPLOY"
        );
        const devToken = await new SignJWT(mockUser)
          .setProtectedHeader({ alg: "HS256" })
          .setIssuedAt()
          .setExpirationTime("1h")
          .sign(devFallbackSecret);

        const payload = await verifyToken(devToken);
        expect(payload).toBeNull();
      } finally {
        process.env.AUTH_SECRET = originalSecret;
      }
    });
  });
});
