import { describe, expect, it } from "vitest";
import {
  calendarDateInTimeZone,
  daysUntilDate,
  fromDateKey,
  isValidDateKey,
} from "@/lib/dates";
import { getJobAvailability, isAcceptingApplications } from "@/lib/job-availability";

const KIGALI = "Africa/Kigali"; // UTC+2 all year
const closingDate = fromDateKey("2026-03-10");
const openJob = { status: "OPEN" as const, closingDate };

describe("calendarDateInTimeZone", () => {
  it("uses the business timezone, not UTC", () => {
    // 23:30 UTC on 9 March is already 01:30 on 10 March in Kigali.
    expect(calendarDateInTimeZone(new Date("2026-03-09T23:30:00Z"), KIGALI)).toBe("2026-03-10");
    expect(calendarDateInTimeZone(new Date("2026-03-09T23:30:00Z"), "UTC")).toBe("2026-03-09");
  });
});

describe("closing-date rule (Africa/Kigali)", () => {
  it("accepts applications from the first to the last second of the closing date", () => {
    expect(isAcceptingApplications(openJob, new Date("2026-03-09T22:00:00Z"), KIGALI)).toBe(true); // 00:00 on 10 Mar
    expect(isAcceptingApplications(openJob, new Date("2026-03-10T12:00:00Z"), KIGALI)).toBe(true); // 14:00
    expect(isAcceptingApplications(openJob, new Date("2026-03-10T21:59:59Z"), KIGALI)).toBe(true); // 23:59:59
  });

  it("closes at midnight at the start of the following day", () => {
    const midnightAfter = new Date("2026-03-10T22:00:00Z"); // 00:00 on 11 Mar in Kigali
    expect(isAcceptingApplications(openJob, midnightAfter, KIGALI)).toBe(false);
    expect(getJobAvailability(openJob, midnightAfter, KIGALI)).toBe("EXPIRED");
  });

  it("treats a manually closed job as closed even before its closing date", () => {
    const now = new Date("2026-03-01T08:00:00Z");
    expect(getJobAvailability({ status: "CLOSED", closingDate }, now, KIGALI)).toBe("CLOSED");
    expect(isAcceptingApplications({ status: "CLOSED", closingDate }, now, KIGALI)).toBe(false);
  });

  it("never accepts applications for drafts", () => {
    const now = new Date("2026-03-01T08:00:00Z");
    expect(getJobAvailability({ status: "DRAFT", closingDate }, now, KIGALI)).toBe("DRAFT");
  });
});

describe("date helpers", () => {
  it("validates real calendar dates only", () => {
    expect(isValidDateKey("2026-02-28")).toBe(true);
    expect(isValidDateKey("2028-02-29")).toBe(true);
    expect(isValidDateKey("2026-02-30")).toBe(false);
    expect(isValidDateKey("10/03/2026")).toBe(false);
    expect(isValidDateKey("")).toBe(false);
  });

  it("counts days left in the business timezone", () => {
    expect(daysUntilDate(closingDate, new Date("2026-03-07T10:00:00Z"), KIGALI)).toBe(3);
    expect(daysUntilDate(closingDate, new Date("2026-03-10T21:00:00Z"), KIGALI)).toBe(0);
    expect(daysUntilDate(closingDate, new Date("2026-03-10T22:30:00Z"), KIGALI)).toBe(-1);
  });
});
