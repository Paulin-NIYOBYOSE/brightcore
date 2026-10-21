import { createHash } from "node:crypto";
import { describe, expect, it } from "vitest";
import { loginAction, logoutAction } from "@/app/admin/auth-actions";
import {
  createAdminSession,
  SESSION_DURATION_MS,
  validateAdminSession,
  verifyAdminCredentials,
} from "@/server/auth/admin-auth";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";
import { prisma } from "@/server/db";
import { ADMIN_EMAIL, ADMIN_PASSWORD, createAdmin } from "../support/factories";
import { RedirectSignal, requestContext } from "../support/request-context";

function loginForm(email: string, password: string, next = "") {
  const form = new FormData();
  form.set("email", email);
  form.set("password", password);
  form.set("next", next);
  return form;
}

async function expectRedirect(promise: Promise<unknown>): Promise<string> {
  try {
    await promise;
  } catch (error) {
    if (error instanceof RedirectSignal) return error.url;
    throw error;
  }
  throw new Error("Expected a redirect");
}

describe("administrator credentials and sessions", () => {
  it("stores only an Argon2id hash of the password", async () => {
    const admin = await createAdmin();
    expect(admin.passwordHash).toMatch(/^\$argon2id\$/);
    expect(admin.passwordHash).not.toContain(ADMIN_PASSWORD);
  });

  it("verifies credentials, normalising the email", async () => {
    const admin = await createAdmin();

    expect(await verifyAdminCredentials("  ADMIN@BrightCore.test ", ADMIN_PASSWORD)).toEqual({
      id: admin.id,
      email: ADMIN_EMAIL,
    });
    expect(await verifyAdminCredentials(ADMIN_EMAIL, "wrong-password")).toBeNull();
    expect(await verifyAdminCredentials("nobody@brightcore.test", ADMIN_PASSWORD)).toBeNull();
  });

  it("stores a hash of the session token, never the token itself", async () => {
    const admin = await createAdmin();
    const { token } = await createAdminSession(admin.id);

    const [session] = await prisma.adminSession.findMany();
    expect(session.id).not.toBe(token);
    expect(session.id).toBe(createHash("sha256").update(token).digest("hex"));
    expect(await validateAdminSession(token)).toEqual({ id: admin.id, email: ADMIN_EMAIL });
  });

  it("expires sessions after eight hours", async () => {
    const admin = await createAdmin();
    const start = new Date("2026-03-10T08:00:00Z");
    const { token } = await createAdminSession(admin.id, start);

    expect(await validateAdminSession(token, new Date(start.getTime() + SESSION_DURATION_MS - 1000))).not.toBeNull();
    expect(await validateAdminSession(token, new Date(start.getTime() + SESSION_DURATION_MS))).toBeNull();
  });
});

describe("loginAction and logoutAction", () => {
  it("signs in, sets the session cookie and ignores off-site redirect targets", async () => {
    await createAdmin();

    const destination = await expectRedirect(
      loginAction({ error: null }, loginForm(ADMIN_EMAIL, ADMIN_PASSWORD, "https://evil.example/phish")),
    );

    expect(destination).toBe("/admin");
    const token = requestContext.getCookie(SESSION_COOKIE_NAME);
    expect(token).toBeDefined();
    expect(await validateAdminSession(token!)).not.toBeNull();
  });

  it("returns to a requested admin page after signing in", async () => {
    await createAdmin();
    const destination = await expectRedirect(
      loginAction({ error: null }, loginForm(ADMIN_EMAIL, ADMIN_PASSWORD, "/admin/applications?status=PENDING")),
    );
    expect(destination).toBe("/admin/applications?status=PENDING");
  });

  it("gives the same message for a wrong password and an unknown email", async () => {
    await createAdmin();

    const wrongPassword = await loginAction({ error: null }, loginForm(ADMIN_EMAIL, "nope"));
    const unknownEmail = await loginAction({ error: null }, loginForm("who@brightcore.test", "nope"));

    expect(wrongPassword.error).toBe("The email address or password is incorrect.");
    expect(unknownEmail.error).toBe(wrongPassword.error);
    expect(requestContext.getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("blocks further attempts after repeated failures, even with the right password", async () => {
    await createAdmin();
    requestContext.setClientAddress("198.51.100.77");

    for (let attempt = 0; attempt < 5; attempt++) {
      await loginAction({ error: null }, loginForm(ADMIN_EMAIL, `wrong-${attempt}`));
    }
    const blocked = await loginAction({ error: null }, loginForm(ADMIN_EMAIL, ADMIN_PASSWORD));

    expect(blocked.error).toMatch(/Too many failed sign-in attempts/);
    expect(requestContext.getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
  });

  it("signing out deletes the server-side session", async () => {
    await createAdmin();
    await expectRedirect(loginAction({ error: null }, loginForm(ADMIN_EMAIL, ADMIN_PASSWORD)));
    const token = requestContext.getCookie(SESSION_COOKIE_NAME)!;

    expect(await expectRedirect(logoutAction())).toBe("/admin/login?signedOut=1");

    expect(requestContext.getCookie(SESSION_COOKIE_NAME)).toBeUndefined();
    expect(await validateAdminSession(token)).toBeNull();
    expect(await prisma.adminSession.count()).toBe(0);
  });
});
