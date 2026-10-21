import { describe, expect, it } from "vitest";
import { safeAdminRedirect } from "@/lib/safe-redirect";
import { applicationFiltersSchema, decisionSchema } from "@/lib/validation/admin";
import { applicationFieldsSchema, checkCvFileInBrowser } from "@/lib/validation/application";
import { jobFormSchema } from "@/lib/validation/job";

const validFields = {
  fullName: "  Jane Mukamana ",
  email: "  Jane.Mukamana@Example.COM ",
  phone: "+250  788 123 456",
  coverNote: "I have five years of backend experience and would love to join.",
};

describe("application fields", () => {
  it("trims text and normalises the email to lower case", () => {
    const result = applicationFieldsSchema.parse(validFields);
    expect(result.fullName).toBe("Jane Mukamana");
    expect(result.email).toBe("jane.mukamana@example.com");
    expect(result.phone).toBe("+250 788 123 456");
  });

  it("reports a helpful message for each invalid field", () => {
    const result = applicationFieldsSchema.safeParse({
      fullName: "",
      email: "not-an-email",
      phone: "call me",
      coverNote: "Too short",
    });
    expect(result.success).toBe(false);
    const fields = result.error!.issues.map((issue) => issue.path[0]);
    expect(fields).toEqual(expect.arrayContaining(["fullName", "email", "phone", "coverNote"]));
  });

  it("enforces maximum lengths", () => {
    expect(applicationFieldsSchema.safeParse({ ...validFields, coverNote: "x".repeat(2001) }).success).toBe(false);
    expect(applicationFieldsSchema.safeParse({ ...validFields, fullName: "x".repeat(121) }).success).toBe(false);
  });
});

describe("browser CV check", () => {
  it("flags non-PDF, empty and oversized files", () => {
    expect(checkCvFileInBrowser({ name: "cv.docx", size: 1000, type: "application/msword" })).toMatch(/PDF/);
    expect(checkCvFileInBrowser({ name: "cv.pdf", size: 0, type: "application/pdf" })).toMatch(/empty/);
    expect(checkCvFileInBrowser({ name: "cv.pdf", size: 6 * 1024 * 1024, type: "application/pdf" })).toMatch(/5 MB/);
    expect(checkCvFileInBrowser({ name: "cv.pdf", size: 1000, type: "application/pdf" })).toBeNull();
  });
});

describe("job form", () => {
  const job = {
    title: "Backend Engineer",
    location: "Kigali",
    employmentType: "FULL_TIME",
    summary: "Build reliable APIs for our customers.",
    description: "A long enough description of the role that explains what the job involves.",
    responsibilities: "- Design APIs\n\n* Write tests\n• Review code",
    requirements: "3+ years of experience",
    closingDate: "2026-12-31",
  };

  it("turns one-per-line text into a clean list", () => {
    const parsed = jobFormSchema.parse(job);
    expect(parsed.responsibilities).toEqual(["Design APIs", "Write tests", "Review code"]);
  });

  it("rejects unexpected fields such as status (mass assignment)", () => {
    const result = jobFormSchema.safeParse({ ...job, status: "OPEN" });
    expect(result.success).toBe(false);
    expect(result.error!.issues[0].code).toBe("unrecognized_keys");
  });

  it("rejects invalid dates and unknown employment types", () => {
    expect(jobFormSchema.safeParse({ ...job, closingDate: "2026-02-30" }).success).toBe(false);
    expect(jobFormSchema.safeParse({ ...job, employmentType: "VOLUNTEER" }).success).toBe(false);
  });
});

describe("decision input", () => {
  const applicationId = "8f9d6c1e-3b0a-4c7e-9f2d-1a2b3c4d5e6f";

  it("accepts ACCEPTED or REJECTED with an optional note", () => {
    expect(decisionSchema.parse({ applicationId, decision: "ACCEPTED" }).note).toBeNull();
    expect(decisionSchema.parse({ applicationId, decision: "REJECTED", note: "  Not a fit " }).note).toBe("Not a fit");
  });

  it("never allows PENDING, other statuses or extra fields", () => {
    expect(decisionSchema.safeParse({ applicationId, decision: "PENDING" }).success).toBe(false);
    expect(decisionSchema.safeParse({ applicationId, decision: "HIRED" }).success).toBe(false);
    expect(
      decisionSchema.safeParse({ applicationId, decision: "ACCEPTED", email: "x@example.com" }).success,
    ).toBe(false);
    expect(decisionSchema.safeParse({ applicationId: "1 OR 1=1", decision: "ACCEPTED" }).success).toBe(false);
  });

  it("ignores invalid list filters instead of failing", () => {
    expect(applicationFiltersSchema.parse({ jobId: "abc", status: "WHATEVER", page: "-2" })).toEqual({
      jobId: undefined,
      status: undefined,
      page: 1,
    });
  });
});

describe("safeAdminRedirect", () => {
  it("allows paths inside /admin", () => {
    expect(safeAdminRedirect("/admin/applications?status=PENDING")).toBe("/admin/applications?status=PENDING");
    expect(safeAdminRedirect("/admin")).toBe("/admin");
  });

  it("blocks open redirects and anything outside /admin", () => {
    for (const target of [
      "https://evil.example",
      "//evil.example",
      "/\\evil.example",
      "/admin//evil.example",
      "/administrator",
      "/",
      "/admin/login",
      null,
      undefined,
    ]) {
      expect(safeAdminRedirect(target)).toBe("/admin");
    }
  });
});
