import "server-only";
import { Prisma, type ApplicationStatus } from "@/generated/prisma/client";
import { APPLICATIONS_PAGE_SIZE } from "@/lib/constants";
import { isAcceptingApplications } from "@/lib/job-availability";
import { failure, type Result } from "@/lib/result";
import { type ApplicationFilters, decisionSchema } from "@/lib/validation/admin";
import { applicationFieldsSchema } from "@/lib/validation/application";
import { firstFieldErrors, isValidId } from "@/lib/validation/common";
import { prisma } from "@/server/db";
import { getBusinessTimeZone } from "@/server/env";
import { logger } from "@/server/logger";
import { getCvStorage, type CvStorage } from "@/server/storage/cv-storage";
import { sanitizeCvFilename } from "@/server/storage/filenames";
import { CV_PROBLEM_MESSAGES, inspectPdf } from "@/server/storage/pdf";

function isUniqueViolation(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2002";
}

function isRecordNotFound(error: unknown): boolean {
  return error instanceof Prisma.PrismaClientKnownRequestError && error.code === "P2025";
}

// ---------------------------------------------------------------------------
// Candidate submissions
// ---------------------------------------------------------------------------

export type SubmitApplicationInput = {
  jobId: string;
  /** Raw form values. Validated here; never trusted as-is. */
  fields: { fullName: unknown; email: unknown; phone: unknown; coverNote: unknown };
  cv: { bytes: Uint8Array; filename: string } | null;
};

export type SubmitApplicationResult = Result<
  { applicationId: string },
  "JOB_NOT_FOUND" | "JOB_CLOSED" | "VALIDATION" | "DUPLICATE"
>;

const DUPLICATE = failure(
  "DUPLICATE",
  "You have already applied for this job with this email address.",
);

/**
 * Submits a candidate application.
 *
 * 1. The job must exist, be published (OPEN) and be on or before its closing
 *    date in the business timezone. Checked on every submission.
 * 2. Form fields and the CV are validated together, so every problem is shown at once.
 * 3. A friendly early check for an existing application with the same email.
 * 4. The CV is saved privately, then the application row is created as PENDING.
 *    If the insert fails, the saved file is deleted again. Two simultaneous
 *    duplicates both pass step 3, but the database's unique (jobId, email)
 *    index lets only one insert succeed.
 */
export async function submitApplication(
  input: SubmitApplicationInput,
  options: { now?: Date; storage?: CvStorage } = {},
): Promise<SubmitApplicationResult> {
  const now = options.now ?? new Date();
  const storage = options.storage ?? getCvStorage();

  // 1. Job checks.
  const job = isValidId(input.jobId)
    ? await prisma.job.findUnique({
        where: { id: input.jobId },
        select: { id: true, status: true, closingDate: true },
      })
    : null;
  if (!job || job.status === "DRAFT") {
    return failure("JOB_NOT_FOUND", "We couldn't find this job. It may have been removed.");
  }
  if (!isAcceptingApplications(job, now, getBusinessTimeZone())) {
    return failure("JOB_CLOSED", "Applications for this job are closed.");
  }

  // 2. Input validation.
  const parsed = applicationFieldsSchema.safeParse(input.fields);
  const fieldErrors = parsed.success ? {} : firstFieldErrors(parsed.error);
  const cvProblem = input.cv ? inspectPdf(input.cv.bytes) : "MISSING";
  if (cvProblem) fieldErrors.cv = CV_PROBLEM_MESSAGES[cvProblem];
  if (!parsed.success || cvProblem || !input.cv) {
    return failure("VALIDATION", "Please correct the highlighted fields.", fieldErrors);
  }
  const fields = parsed.data;
  const cv = input.cv;

  // 3. Early duplicate check (the unique index below is the real guarantee).
  const existing = await prisma.application.findUnique({
    where: { jobId_email: { jobId: job.id, email: fields.email } },
    select: { id: true },
  });
  if (existing) return DUPLICATE;

  // 4. Save the CV, then the application.
  const cvStorageKey = await storage.save(cv.bytes);
  try {
    const application = await prisma.application.create({
      data: {
        jobId: job.id,
        fullName: fields.fullName,
        email: fields.email,
        phone: fields.phone,
        coverNote: fields.coverNote,
        cvStorageKey,
        cvOriginalFilename: sanitizeCvFilename(cv.filename),
        status: "PENDING",
      },
      select: { id: true },
    });
    logger.info("application_submitted", { applicationId: application.id, jobId: job.id });
    return { ok: true, applicationId: application.id };
  } catch (error) {
    // Never leave an orphaned CV behind when the row was not written.
    await storage.remove(cvStorageKey).catch((cleanupError: unknown) => {
      logger.error("cv_cleanup_failed", cleanupError, { cvStorageKey });
    });
    if (isUniqueViolation(error)) return DUPLICATE;
    throw error;
  }
}

// ---------------------------------------------------------------------------
// Administrator operations (callers must have authenticated the administrator)
// ---------------------------------------------------------------------------

export async function listApplications(filters: ApplicationFilters) {
  const where: Prisma.ApplicationWhereInput = {};
  if (filters.jobId) where.jobId = filters.jobId;
  if (filters.status) where.status = filters.status;

  const [total, items] = await prisma.$transaction([
    prisma.application.count({ where }),
    prisma.application.findMany({
      where,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      skip: (filters.page - 1) * APPLICATIONS_PAGE_SIZE,
      take: APPLICATIONS_PAGE_SIZE,
      select: {
        id: true,
        fullName: true,
        email: true,
        phone: true,
        status: true,
        createdAt: true,
        job: { select: { id: true, title: true } },
      },
    }),
  ]);

  return {
    items,
    total,
    page: filters.page,
    pageCount: Math.max(1, Math.ceil(total / APPLICATIONS_PAGE_SIZE)),
  };
}

export async function getApplicationForAdmin(applicationId: string) {
  if (!isValidId(applicationId)) return null;
  return prisma.application.findUnique({
    where: { id: applicationId },
    include: {
      job: { select: { id: true, title: true, location: true, status: true, closingDate: true } },
    },
  });
}

/**
 * Records an administrator's decision. Applications start as PENDING; a
 * decision moves them to ACCEPTED or REJECTED, and can later be revised
 * between those two. Nothing can move an application back to PENDING.
 * Only status, note and decision time are written, for exactly one record.
 */
export async function decideApplication(
  input: unknown,
  now: Date = new Date(),
): Promise<Result<{ status: ApplicationStatus; jobId: string }, "VALIDATION" | "NOT_FOUND">> {
  const parsed = decisionSchema.safeParse(input);
  if (!parsed.success) {
    return failure("VALIDATION", "Please check the decision and try again.", firstFieldErrors(parsed.error));
  }

  try {
    const updated = await prisma.application.update({
      where: { id: parsed.data.applicationId },
      data: { status: parsed.data.decision, decisionNote: parsed.data.note, decidedAt: now },
      select: { id: true, status: true, jobId: true },
    });
    logger.info("application_decided", { applicationId: updated.id, status: updated.status });
    return { ok: true, status: updated.status, jobId: updated.jobId };
  } catch (error) {
    if (isRecordNotFound(error)) return failure("NOT_FOUND", "This application no longer exists.");
    throw error;
  }
}

/** Looks up a CV by application ID. The storage key always comes from the database. */
export async function getApplicationCv(
  applicationId: string,
  storage: CvStorage = getCvStorage(),
): Promise<{ bytes: Buffer; filename: string } | null> {
  if (!isValidId(applicationId)) return null;

  const application = await prisma.application.findUnique({
    where: { id: applicationId },
    select: { cvStorageKey: true, cvOriginalFilename: true },
  });
  if (!application) return null;

  const bytes = await storage.read(application.cvStorageKey);
  if (!bytes) {
    logger.warn("cv_file_missing", { applicationId });
    return null;
  }
  return { bytes, filename: application.cvOriginalFilename };
}
