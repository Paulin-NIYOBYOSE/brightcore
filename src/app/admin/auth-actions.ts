"use server";

import { headers } from "next/headers";
import { redirect } from "next/navigation";
import { formText } from "@/lib/form-data";
import { safeAdminRedirect } from "@/lib/safe-redirect";
import { loginSchema } from "@/lib/validation/admin";
import {
  createAdminSession,
  revokeAdminSession,
  verifyAdminCredentials,
} from "@/server/auth/admin-auth";
import {
  clearSessionCookie,
  readSessionToken,
  setSessionCookie,
} from "@/server/auth/current-admin";
import { loginRateLimiter } from "@/server/auth/rate-limit";
import { logger } from "@/server/logger";

export type LoginState = { error: string | null };

/** Best-effort client address for rate limiting (see README: Known limitations). */
async function clientAddress(): Promise<string> {
  const requestHeaders = await headers();
  return (
    requestHeaders.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    requestHeaders.get("x-real-ip") ||
    "unknown"
  );
}

export async function loginAction(_previous: LoginState, formData: FormData): Promise<LoginState> {
  const parsed = loginSchema.safeParse({
    email: formText(formData, "email"),
    password: formText(formData, "password"),
  });
  if (!parsed.success) return { error: "Enter a valid email address and your password." };

  // Failed attempts are limited per client address and email.
  const rateLimitKey = `${await clientAddress()}|${parsed.data.email}`;
  const retryAfterMs = loginRateLimiter.retryAfterMs(rateLimitKey);
  if (retryAfterMs > 0) {
    const minutes = Math.ceil(retryAfterMs / 60_000);
    return {
      error: `Too many failed sign-in attempts. Try again in ${minutes} minute${minutes === 1 ? "" : "s"}.`,
    };
  }

  try {
    const admin = await verifyAdminCredentials(parsed.data.email, parsed.data.password);
    if (!admin) {
      loginRateLimiter.recordFailure(rateLimitKey);
      logger.warn("admin_login_failed");
      // Same message whether the email or the password was wrong.
      return { error: "The email address or password is incorrect." };
    }

    loginRateLimiter.reset(rateLimitKey);
    const session = await createAdminSession(admin.id);
    await setSessionCookie(session.token, session.expiresAt);
    logger.info("admin_login_succeeded", { adminId: admin.id });
  } catch (error) {
    logger.error("admin_login_error", error);
    return { error: "We couldn't sign you in right now. Please try again." };
  }

  // Outside the try block: redirect() works by throwing.
  redirect(safeAdminRedirect(formText(formData, "next")));
}

/** Deletes the server-side session (so the token stops working) and the cookie. */
export async function logoutAction(): Promise<void> {
  const token = await readSessionToken();
  if (token) await revokeAdminSession(token);
  await clearSessionCookie();
  redirect("/admin/login?signedOut=1");
}
