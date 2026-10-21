import { buildSamplePdf } from "../../prisma/sample-pdf";
import type { Prisma } from "@/generated/prisma/client";
import { fromDateKey } from "@/lib/dates";
import { createAdminSession } from "@/server/auth/admin-auth";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";
import { hashPassword } from "@/server/auth/password";
import { prisma } from "@/server/db";
import { requestContext } from "./request-context";

/**
 * A fixed "now" for deterministic tests: 2026-03-10 at 12:00 in Kigali
 * (UTC+2, no daylight saving). Jobs default to closing on that same day.
 */
export const NOW = new Date("2026-03-10T10:00:00.000Z");
export const TODAY = "2026-03-10";

export function validPdf(text = "Test Candidate CV"): Uint8Array {
  return buildSamplePdf([text, "Experience: 5 years"]);
}

export async function createJob(overrides: Partial<Prisma.JobUncheckedCreateInput> = {}) {
  return prisma.job.create({
    data: {
      title: "Backend Engineer",
      location: "Kigali, Rwanda",
      employmentType: "FULL_TIME",
      summary: "Build reliable APIs for our customers across East Africa.",
      description: "A detailed description of the backend engineering role at BrightCore.",
      responsibilities: ["Design APIs", "Write tests"],
      requirements: ["3+ years of experience"],
      closingDate: fromDateKey(TODAY),
      status: "OPEN",
      ...overrides,
    },
  });
}

export function applicationFields(overrides: Partial<Record<string, string>> = {}) {
  return {
    fullName: "Jane Mukamana",
    email: "jane.mukamana@example.com",
    phone: "+250 788 123 456",
    coverNote: "I have five years of backend experience and would love to join BrightCore.",
    ...overrides,
  };
}

export async function createApplication(
  jobId: string,
  overrides: Partial<Prisma.ApplicationUncheckedCreateInput> = {},
) {
  return prisma.application.create({
    data: {
      jobId,
      fullName: "Existing Candidate",
      email: `candidate-${Math.random().toString(36).slice(2)}@example.com`,
      phone: "+250 788 000 000",
      coverNote: "An existing application created directly for the test.",
      cvStorageKey: `${crypto.randomUUID()}.pdf`,
      cvOriginalFilename: "cv.pdf",
      ...overrides,
    },
  });
}

export const ADMIN_EMAIL = "admin@brightcore.test";
export const ADMIN_PASSWORD = "correct-horse-battery-staple";

export async function createAdmin() {
  return prisma.adminUser.create({
    data: { email: ADMIN_EMAIL, passwordHash: await hashPassword(ADMIN_PASSWORD) },
  });
}

/** Creates an administrator and puts a valid session cookie in the test request. */
export async function signInAsAdmin() {
  const admin = await createAdmin();
  const { token } = await createAdminSession(admin.id);
  requestContext.setCookie(SESSION_COOKIE_NAME, token);
  return admin;
}
