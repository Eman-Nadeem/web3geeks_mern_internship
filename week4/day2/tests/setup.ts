import { vi, beforeEach } from "vitest";
import { inMemoryPrisma } from "./helpers/mock-prisma";

(process.env as Record<string, string | undefined>).NODE_ENV = "test";
(process.env as Record<string, string | undefined>).JWT_SECRET =
  "test-jwt-secret-key-that-is-at-least-32-characters-long";
(process.env as Record<string, string | undefined>).JWT_EXPIRES_IN = "7d";
(process.env as Record<string, string | undefined>).NEXT_PUBLIC_APP_URL = "http://localhost:3000";
(process.env as Record<string, string | undefined>).NEXT_PUBLIC_API_URL = "http://localhost:3000/api";
(process.env as Record<string, string | undefined>).DATABASE_URL =
  "postgresql://postgres:postgrespassword@localhost:5432/team_collab_test";

vi.mock("@/server/db/prisma", () => {
  return {
    prisma: inMemoryPrisma,
  };
});

beforeEach(() => {
  inMemoryPrisma.reset();
});
