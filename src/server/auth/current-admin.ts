import "server-only";
import { cookies } from "next/headers";
import { redirect } from "next/navigation";
import { cache } from "react";
import { validateAdminSession, type AdminIdentity } from "@/server/auth/admin-auth";
import { getEnv } from "@/server/env";

export const SESSION_COOKIE_NAME = "bc_admin_session";

/**
 * The signed-in administrator for the current request, or null.
 *
 * Every admin page, server action and route handler calls this (directly or via
 * requireAdminPage) and checks the session in the database. The proxy redirect
 * for /admin pages is only a convenience, not the security boundary.
 * `cache` de-duplicates the lookup within a single request.
 */
export const getCurrentAdmin = cache(async (): Promise<AdminIdentity | null> => {
  const token = (await cookies()).get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;
  return validateAdminSession(token);
});

/** For admin pages: returns the administrator or redirects to the login page. */
export async function requireAdminPage(): Promise<AdminIdentity> {
  const admin = await getCurrentAdmin();
  if (!admin) redirect("/admin/login");
  return admin;
}

export async function setSessionCookie(token: string, expiresAt: Date): Promise<void> {
  (await cookies()).set(SESSION_COOKIE_NAME, token, {
    httpOnly: true, // not readable from JavaScript
    secure: getEnv().sessionCookieSecure, // HTTPS only in production
    sameSite: "lax", // not sent on cross-site POSTs
    path: "/",
    expires: expiresAt,
  });
}

export async function readSessionToken(): Promise<string | undefined> {
  return (await cookies()).get(SESSION_COOKIE_NAME)?.value;
}

export async function clearSessionCookie(): Promise<void> {
  (await cookies()).delete(SESSION_COOKIE_NAME);
}
