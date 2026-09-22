import { z } from "zod";

const envSchema = z
  .object({
    NODE_ENV: z.enum(["development", "production", "test"]).default("development"),
    DATABASE_URL: z.string().min(1, "DATABASE_URL is required"),
    DIRECT_URL: z.string().optional(),
    TEST_DATABASE_URL: z.string().optional(),
    JWT_SECRET: z.string().min(32, "JWT_SECRET must be at least 32 characters long"),
    JWT_EXPIRES_IN: z.string().default("7d"),
    NEXT_PUBLIC_APP_URL: z.string().default("http://localhost:3000"),
    NEXT_PUBLIC_API_URL: z.string().default("http://localhost:3000/api"),
    UPSTASH_REDIS_REST_URL: z.string().optional(),
    UPSTASH_REDIS_REST_TOKEN: z.string().optional(),
    RESEND_API_KEY: z.string().optional(),
    EMAIL_FROM: z.string().default("Team Collab <noreply@yourdomain.com>"),
    BLOB_READ_WRITE_TOKEN: z.string().optional(),
    INVITATION_EXPIRES_IN_HOURS: z.coerce.number().default(72),
    // Pusher – optional in dev (feature silently no-ops without credentials)
    PUSHER_APP_ID: z.string().optional(),
    PUSHER_KEY: z.string().optional(),
    PUSHER_SECRET: z.string().optional(),
    PUSHER_CLUSTER: z.string().optional(),
    NEXT_PUBLIC_PUSHER_KEY: z.string().optional(),
    NEXT_PUBLIC_PUSHER_CLUSTER: z.string().optional(),
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      // If one Upstash Redis variable is provided, both must be provided
      if (data.UPSTASH_REDIS_REST_URL && !data.UPSTASH_REDIS_REST_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPSTASH_REDIS_REST_TOKEN"],
          message: "UPSTASH_REDIS_REST_TOKEN is required when UPSTASH_REDIS_REST_URL is set",
        });
      }
      if (data.UPSTASH_REDIS_REST_TOKEN && !data.UPSTASH_REDIS_REST_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPSTASH_REDIS_REST_URL"],
          message: "UPSTASH_REDIS_REST_URL is required when UPSTASH_REDIS_REST_TOKEN is set",
        });
      }
      if (!data.PUSHER_APP_ID) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUSHER_APP_ID"],
          message: "PUSHER_APP_ID is required in production",
        });
      }
      if (!data.PUSHER_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUSHER_KEY"],
          message: "PUSHER_KEY is required in production",
        });
      }
      if (!data.PUSHER_SECRET) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUSHER_SECRET"],
          message: "PUSHER_SECRET is required in production",
        });
      }
      if (!data.PUSHER_CLUSTER) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["PUSHER_CLUSTER"],
          message: "PUSHER_CLUSTER is required in production",
        });
      }
    }
  });


export type Env = z.infer<typeof envSchema>;

let _env: Env | null = null;

export function getEnv(): Env {
  if (!_env) {
    const result = envSchema.safeParse(process.env);
    if (!result.success) {
      console.error("❌ Invalid environment variables configuration:");
      console.error(JSON.stringify(result.error.format(), null, 2));
      throw new Error("Invalid environment configuration. Check server logs.");
    }
    _env = result.data;
  }
  return _env;
}

export const env = new Proxy({} as Env, {
  get(_target, prop: string) {
    const currentEnv = getEnv();
    return currentEnv[prop as keyof Env];
  },
});
