/**
 * Date helpers.
 *
 * Closing dates are calendar dates (Postgres DATE). Prisma returns them as a
 * JavaScript Date at midnight UTC, so the UTC year/month/day of that value is
 * the calendar date itself. We compare calendar dates as "YYYY-MM-DD" strings,
 * which sort correctly as plain strings.
 */

const DATE_KEY_PATTERN = /^\d{4}-\d{2}-\d{2}$/;

/** The calendar date ("YYYY-MM-DD") that `instant` falls on in `timeZone`. */
export function calendarDateInTimeZone(instant: Date, timeZone: string): string {
  const parts = new Intl.DateTimeFormat("en-CA", {
    timeZone,
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).formatToParts(instant);
  const part = (type: Intl.DateTimeFormatPartTypes) =>
    parts.find((p) => p.type === type)?.value ?? "";
  return `${part("year")}-${part("month")}-${part("day")}`;
}

/** "YYYY-MM-DD" for a DATE column value returned by Prisma. */
export function toDateKey(dateOnly: Date): string {
  return dateOnly.toISOString().slice(0, 10);
}

/** DATE column value (midnight UTC) for a "YYYY-MM-DD" string. */
export function fromDateKey(key: string): Date {
  return new Date(`${key}T00:00:00.000Z`);
}

/** True for real calendar dates such as "2026-02-28"; false for "2026-02-30". */
export function isValidDateKey(key: string): boolean {
  if (!DATE_KEY_PATTERN.test(key)) return false;
  const date = fromDateKey(key);
  return !Number.isNaN(date.getTime()) && toDateKey(date) === key;
}

/** Whole days from today (in `timeZone`) until the closing date. Negative once passed. */
export function daysUntilDate(dateOnly: Date, now: Date, timeZone: string): number {
  const today = fromDateKey(calendarDateInTimeZone(now, timeZone));
  return Math.round((dateOnly.getTime() - today.getTime()) / 86_400_000);
}

/** e.g. "12 Nov 2026". For DATE columns, formatted in UTC so the day never shifts. */
export function formatDateOnly(dateOnly: Date): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone: "UTC",
    day: "numeric",
    month: "short",
    year: "numeric",
  }).format(dateOnly);
}

/** e.g. "21 Oct 2026, 14:05" in the business timezone. */
export function formatDateTime(instant: Date, timeZone: string): string {
  return new Intl.DateTimeFormat("en-GB", {
    timeZone,
    day: "numeric",
    month: "short",
    year: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(instant);
}

export function isValidTimeZone(timeZone: string): boolean {
  try {
    new Intl.DateTimeFormat("en-GB", { timeZone });
    return true;
  } catch {
    return false;
  }
}
