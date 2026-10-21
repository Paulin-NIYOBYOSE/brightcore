import "server-only";
import { z } from "zod";
import { isValidTimeZone } from "@/lib/dates";

const envSchema = z.object({
  NODE_ENV: z.enum(["development", "test", "production"]).default("development"),
  DATABASE_URL: z
    .string({ error: "is required" })
    .regex(/^postgres(ql)?:\/\//, "must be a PostgreSQL connection URL"),
  APP_TIMEZONE: z
    .string()
    .default("Africa/Kigali")
    .refine(isValidTimeZone, "must be an IANA timezone such as Africa/Kigali"),
  CV_STORAGE_DIR: z.string().min(1).default("./storage/cvs"),
  SESSION_COOKIE_SECURE: z.enum(["true", "false"]).optional(),
});

export type Env = {
  NODE_ENV: "development" | "test" | "production";
  DATABASE_URL: string;
  APP_TIMEZONE: string;
  CV_STORAGE_DIR: string;
  /** Whether the session cookie gets the Secure flag (HTTPS only). */
  sessionCookieSecure: boolean;
};

let cachedEnv: Env | undefined;

/**
 * Validated server configuration. Called at startup (see instrumentation.ts)
 * so a misconfigured deployment fails fast. Error messages name the variable
 * but never print its value.
 */
export function getEnv(): Env {
  if (cachedEnv) return cachedEnv;

  const parsed = envSchema.safeParse(process.env);
  if (!parsed.success) {
    const problems = parsed.error.issues
      .map((issue) => `  - ${issue.path.join(".")}: ${issue.message}`)
      .join("\n");
    throw new Error(`Invalid environment configuration:\n${problems}`);
  }

  const { SESSION_COOKIE_SECURE, ...env } = parsed.data;
  cachedEnv = {
    ...env,
    sessionCookieSecure:
      SESSION_COOKIE_SECURE === undefined
        ? env.NODE_ENV === "production"
        : SESSION_COOKIE_SECURE === "true",
  };
  return cachedEnv;
}

export function getBusinessTimeZone(): string {
  return getEnv().APP_TIMEZONE;
}
