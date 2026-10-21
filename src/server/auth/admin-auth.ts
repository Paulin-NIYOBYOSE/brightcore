import "server-only";
import { createHash, randomBytes } from "node:crypto";
import { normalizeEmail } from "@/lib/validation/common";
import { hashPassword, verifyPassword } from "@/server/auth/password";
import { prisma } from "@/server/db";

/** Sessions last 8 hours from sign-in, then the administrator signs in again. */
export const SESSION_DURATION_MS = 8 * 60 * 60 * 1000;

export type AdminIdentity = { id: string; email: string };

/** Only this hash is stored in the database; the raw token lives in the cookie. */
function hashSessionToken(token: string): string {
  return createHash("sha256").update(token).digest("hex");
}

let dummyPasswordHash: Promise<string> | undefined;

/**
 * Checks an email/password pair. When the email is unknown, a hash is still
 * verified so that response timing does not reveal which emails exist.
 */
export async function verifyAdminCredentials(
  email: string,
  password: string,
): Promise<AdminIdentity | null> {
  const admin = await prisma.adminUser.findUnique({
    where: { email: normalizeEmail(email) },
    select: { id: true, email: true, passwordHash: true },
  });

  if (!admin) {
    dummyPasswordHash ??= hashPassword(randomBytes(16).toString("hex"));
    await verifyPassword(await dummyPasswordHash, password);
    return null;
  }

  const valid = await verifyPassword(admin.passwordHash, password);
  return valid ? { id: admin.id, email: admin.email } : null;
}

/** Creates a server-side session and returns the token to put in the cookie. */
export async function createAdminSession(
  adminUserId: string,
  now: Date = new Date(),
): Promise<{ token: string; expiresAt: Date }> {
  const token = randomBytes(32).toString("base64url");
  const expiresAt = new Date(now.getTime() + SESSION_DURATION_MS);

  await prisma.$transaction([
    // Housekeeping: remove this administrator's expired sessions.
    prisma.adminSession.deleteMany({ where: { adminUserId, expiresAt: { lte: now } } }),
    prisma.adminSession.create({
      data: { id: hashSessionToken(token), adminUserId, expiresAt },
    }),
  ]);

  return { token, expiresAt };
}

/** Resolves a cookie token to the administrator it belongs to, or null. */
export async function validateAdminSession(
  token: string,
  now: Date = new Date(),
): Promise<AdminIdentity | null> {
  if (!token || token.length > 128) return null;

  const session = await prisma.adminSession.findUnique({
    where: { id: hashSessionToken(token) },
    select: { id: true, expiresAt: true, adminUser: { select: { id: true, email: true } } },
  });
  if (!session) return null;

  if (session.expiresAt <= now) {
    await prisma.adminSession.deleteMany({ where: { id: session.id } });
    return null;
  }

  return session.adminUser;
}

/** Deletes the session so the token stops working immediately (sign-out). */
export async function revokeAdminSession(token: string): Promise<void> {
  await prisma.adminSession.deleteMany({ where: { id: hashSessionToken(token) } });
}
