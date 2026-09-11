import { describe, it, expect, beforeAll, afterAll } from "vitest";
import { server, io } from "../server/socket";
import { io as ClientSocket, Socket as ClientSocketType } from "socket.io-client";
import { signToken } from "../lib/auth/jwt";

describe("Socket.IO CORS Allowlist Regression Suite", () => {
  let port: number;
  let validToken: string;
  const activeSockets: ClientSocketType[] = [];

  beforeAll(async () => {
    process.env.AUTH_SECRET = "test_super_secret_for_cors_regression_test_123456789";
    validToken = await signToken({
      id: "cors_user_1",
      name: "CORS Tester",
      email: "cors@test.com",
    });

    await new Promise<void>((resolve) => {
      server.listen(0, () => {
        const addr = server.address();
        port = typeof addr === "object" && addr ? addr.port : 3001;
        resolve();
      });
    });
  });

  afterAll(async () => {
    for (const socket of activeSockets) {
      if (socket.connected) socket.disconnect();
    }
    await new Promise<void>((resolve) => {
      server.close(() => resolve());
    });
  });

  it("verifies the cors.origin callback rejects disallowed origins", async () => {
    const corsOptions = (io as any).opts?.cors;
    expect(corsOptions).toBeDefined();
    expect(typeof corsOptions.origin).toBe("function");

    const originValidator = corsOptions.origin as (
      origin: string | undefined,
      callback: (err: Error | null, allow?: boolean) => void
    ) => void;

    // 1. Disallowed external malicious domain -> rejected with error/false
    await new Promise<void>((resolve) => {
      originValidator("http://malicious-attacker.com", (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toContain("CORS origin not allowed");
        expect(allow).toBe(false);
        resolve();
      });
    });

    // 2. Substring attacker domain attempting to bypass .includes("localhost")
    await new Promise<void>((resolve) => {
      originValidator("http://localhost.attacker.com", (err, allow) => {
        expect(err).toBeInstanceOf(Error);
        expect(err?.message).toContain("CORS origin not allowed");
        expect(allow).toBe(false);
        resolve();
      });
    });

    // 3. Allowed localhost development origin -> allowed
    await new Promise<void>((resolve) => {
      originValidator("http://localhost:3000", (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        resolve();
      });
    });

    // 4. Allowed 127.0.0.1 development origin -> allowed
    await new Promise<void>((resolve) => {
      originValidator("http://127.0.0.1:3000", (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        resolve();
      });
    });

    // 5. Undefined / server-to-server curl origin -> allowed
    await new Promise<void>((resolve) => {
      originValidator(undefined, (err, allow) => {
        expect(err).toBeNull();
        expect(allow).toBe(true);
        resolve();
      });
    });
  });

  it("allows connection from legitimate localhost origin", async () => {
    const client = ClientSocket(`http://localhost:${port}`, {
      auth: { token: validToken },
      extraHeaders: {
        Origin: "http://localhost:3000",
      },
      transports: ["websocket"],
      reconnection: false,
    });
    activeSockets.push(client);

    await new Promise<void>((resolve, reject) => {
      client.on("connect", () => {
        expect(client.connected).toBe(true);
        resolve();
      });
      client.on("connect_error", (err) => {
        reject(err);
      });
    });
  });
});
