import "server-only";
import type { JobStatus, Prisma } from "@/generated/prisma/client";
import { calendarDateInTimeZone, fromDateKey, toDateKey } from "@/lib/dates";
import { isClosingDatePassed } from "@/lib/job-availability";
import { failure, type Result } from "@/lib/result";
import { firstFieldErrors, isValidId } from "@/lib/validation/common";
import {
  jobFormSchema,
  jobStatusActionSchema,
  type JobInput,
  type JobSearch,
  type JobStatusAction,
} from "@/lib/validation/job";
import { prisma } from "@/server/db";
import { getBusinessTimeZone } from "@/server/env";

/** Today's date in the business timezone, as a DATE value for queries. */
function todayAsDate(now: Date): Date {
  return fromDateKey(calendarDateInTimeZone(now, getBusinessTimeZone()));
}

// ---------------------------------------------------------------------------
// Public (candidate-facing) queries
// ---------------------------------------------------------------------------

const jobCardSelect = {
  id: true,
  title: true,
  location: true,
  employmentType: true,
  summary: true,
  closingDate: true,
} satisfies Prisma.JobSelect;

export type JobCardData = Prisma.JobGetPayload<{ select: typeof jobCardSelect }>;

/** Published jobs that are OPEN and whose closing date has not passed. */
export async function listOpenJobs(search: JobSearch, now: Date = new Date()): Promise<JobCardData[]> {
  const where: Prisma.JobWhereInput = {
    status: "OPEN",
    closingDate: { gte: todayAsDate(now) },
  };
  if (search.type) where.employmentType = search.type;
  if (search.q) {
    // `contains` becomes a parameterised ILIKE. Escape LIKE wildcards so that
    // "%" or "_" in a search match literally instead of matching everything.
    const term = search.q.replace(/[\\%_]/g, (char) => `\\${char}`);
    where.OR = [
      { title: { contains: term, mode: "insensitive" } },
      { location: { contains: term, mode: "insensitive" } },
    ];
  }

  return prisma.job.findMany({
    where,
    select: jobCardSelect,
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
}

/**
 * A job as candidates may see it. Drafts are reported as not found. Closed or
 * expired jobs are returned so the page can explain that applications closed.
 */
export async function getPublicJob(jobId: string) {
  if (!isValidId(jobId)) return null;
  return prisma.job.findFirst({ where: { id: jobId, status: { not: "DRAFT" } } });
}

// ---------------------------------------------------------------------------
// Administrator operations (callers must have authenticated the administrator)
// ---------------------------------------------------------------------------

export async function listJobsForAdmin() {
  return prisma.job.findMany({
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    include: { _count: { select: { applications: true } } },
  });
}

export async function getJobForAdmin(jobId: string) {
  if (!isValidId(jobId)) return null;
  return prisma.job.findUnique({
    where: { id: jobId },
    include: { _count: { select: { applications: true } } },
  });
}

/** Lightweight list for filter drop-downs. */
export async function listJobOptions() {
  return prisma.job.findMany({
    select: { id: true, title: true, status: true },
    orderBy: [{ createdAt: "desc" }, { id: "asc" }],
  });
}

/** Explicit field mapping: only form fields are ever written, never `status` or `id`. */
function toJobData(input: JobInput) {
  return {
    title: input.title,
    location: input.location,
    employmentType: input.employmentType,
    summary: input.summary,
    description: input.description,
    responsibilities: input.responsibilities,
    requirements: input.requirements,
    closingDate: fromDateKey(input.closingDate),
  };
}

const PAST_CLOSING_DATE = "Choose today or a later date";

type JobFormError = "VALIDATION";

export async function createJob(
  values: unknown,
  options: { publish: boolean; now?: Date },
): Promise<Result<{ jobId: string }, JobFormError>> {
  const parsed = jobFormSchema.safeParse(values);
  if (!parsed.success) {
    return failure("VALIDATION", "Please correct the highlighted fields.", firstFieldErrors(parsed.error));
  }

  const now = options.now ?? new Date();
  const closingDate = fromDateKey(parsed.data.closingDate);
  if (isClosingDatePassed(closingDate, now, getBusinessTimeZone())) {
    return failure("VALIDATION", "Please correct the highlighted fields.", {
      closingDate: PAST_CLOSING_DATE,
    });
  }

  const job = await prisma.job.create({
    data: { ...toJobData(parsed.data), status: options.publish ? "OPEN" : "DRAFT" },
    select: { id: true },
  });
  return { ok: true, jobId: job.id };
}

/** Updates the job's content. Status changes go through changeJobStatus. */
export async function updateJob(
  jobId: unknown,
  values: unknown,
  now: Date = new Date(),
): Promise<Result<{ jobId: string }, JobFormError | "NOT_FOUND">> {
  if (!isValidId(jobId)) return failure("NOT_FOUND", "This job no longer exists.");
  const existing = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, closingDate: true },
  });
  if (!existing) return failure("NOT_FOUND", "This job no longer exists.");

  const parsed = jobFormSchema.safeParse(values);
  if (!parsed.success) {
    return failure("VALIDATION", "Please correct the highlighted fields.", firstFieldErrors(parsed.error));
  }

  // A closing date can be kept as it is, but never changed to a past date.
  const dateChanged = parsed.data.closingDate !== toDateKey(existing.closingDate);
  if (
    dateChanged &&
    isClosingDatePassed(fromDateKey(parsed.data.closingDate), now, getBusinessTimeZone())
  ) {
    return failure("VALIDATION", "Please correct the highlighted fields.", {
      closingDate: PAST_CLOSING_DATE,
    });
  }

  await prisma.job.update({ where: { id: existing.id }, data: toJobData(parsed.data) });
  return { ok: true, jobId: existing.id };
}

/** The only allowed job status changes. */
export const JOB_STATUS_TRANSITIONS: Record<JobStatusAction, { from: JobStatus; to: JobStatus }> = {
  publish: { from: "DRAFT", to: "OPEN" },
  close: { from: "OPEN", to: "CLOSED" },
  reopen: { from: "CLOSED", to: "OPEN" },
};

const ACTION_PAST_TENSE: Record<JobStatusAction, string> = {
  publish: "published",
  close: "closed",
  reopen: "reopened",
};

export async function changeJobStatus(
  jobId: unknown,
  action: unknown,
  now: Date = new Date(),
): Promise<Result<{ status: JobStatus }, "VALIDATION" | "NOT_FOUND" | "INVALID_TRANSITION">> {
  const parsedAction = jobStatusActionSchema.safeParse(action);
  if (!parsedAction.success) return failure("VALIDATION", "Unknown job action.");
  if (!isValidId(jobId)) return failure("NOT_FOUND", "This job no longer exists.");

  const job = await prisma.job.findUnique({
    where: { id: jobId },
    select: { id: true, status: true, closingDate: true },
  });
  if (!job) return failure("NOT_FOUND", "This job no longer exists.");

  const transition = JOB_STATUS_TRANSITIONS[parsedAction.data];
  if (job.status !== transition.from) {
    return failure(
      "INVALID_TRANSITION",
      `This job is ${job.status.toLowerCase()}, so it cannot be ${ACTION_PAST_TENSE[parsedAction.data]}.`,
    );
  }

  if (
    transition.to === "OPEN" &&
    isClosingDatePassed(job.closingDate, now, getBusinessTimeZone())
  ) {
    return failure(
      "VALIDATION",
      "The closing date has passed. Edit the job and set a new closing date first.",
    );
  }

  // Conditional update: if someone else changed the status in the meantime,
  // nothing is updated and we report it instead of overwriting their change.
  const { count } = await prisma.job.updateMany({
    where: { id: job.id, status: transition.from },
    data: { status: transition.to },
  });
  if (count === 0) {
    return failure("INVALID_TRANSITION", "This job was changed by someone else. Refresh and try again.");
  }

  return { ok: true, status: transition.to };
}
