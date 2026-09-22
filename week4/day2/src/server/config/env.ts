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
  })
  .superRefine((data, ctx) => {
    if (data.NODE_ENV === "production") {
      if (!data.UPSTASH_REDIS_REST_URL) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPSTASH_REDIS_REST_URL"],
          message: "UPSTASH_REDIS_REST_URL is required in production",
        });
      }
      if (!data.UPSTASH_REDIS_REST_TOKEN) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["UPSTASH_REDIS_REST_TOKEN"],
          message: "UPSTASH_REDIS_REST_TOKEN is required in production",
        });
      }
      if (!data.RESEND_API_KEY) {
        ctx.addIssue({
          code: z.ZodIssueCode.custom,
          path: ["RESEND_API_KEY"],
          message: "RESEND_API_KEY is required in production",
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
