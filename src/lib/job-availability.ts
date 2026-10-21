import type { JobStatus } from "@/generated/prisma/enums";
import { calendarDateInTimeZone, toDateKey } from "@/lib/dates";

/**
 * Whether a job can receive applications right now.
 *
 * - DRAFT: not published, invisible to candidates.
 * - CLOSED: manually closed by a recruiter. Closed regardless of the date.
 * - EXPIRED: still marked OPEN, but its closing date has passed.
 * - ACCEPTING: OPEN and today (in the business timezone) is on or before the
 *   closing date. A job closing on 12 Nov accepts applications until 23:59:59
 *   on 12 Nov and is closed from 00:00 on 13 Nov.
 */
export type JobAvailability = "ACCEPTING" | "DRAFT" | "CLOSED" | "EXPIRED";

type JobLike = { status: JobStatus; closingDate: Date };

export function isClosingDatePassed(closingDate: Date, now: Date, timeZone: string): boolean {
  return calendarDateInTimeZone(now, timeZone) > toDateKey(closingDate);
}

export function getJobAvailability(job: JobLike, now: Date, timeZone: string): JobAvailability {
  if (job.status === "DRAFT") return "DRAFT";
  if (job.status === "CLOSED") return "CLOSED";
  if (isClosingDatePassed(job.closingDate, now, timeZone)) return "EXPIRED";
  return "ACCEPTING";
}

export function isAcceptingApplications(job: JobLike, now: Date, timeZone: string): boolean {
  return getJobAvailability(job, now, timeZone) === "ACCEPTING";
}
