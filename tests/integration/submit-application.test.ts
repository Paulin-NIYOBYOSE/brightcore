import { readdir } from "node:fs/promises";
import { describe, expect, it, vi } from "vitest";
import { MAX_CV_BYTES } from "@/lib/constants";
import { fromDateKey } from "@/lib/dates";
import { prisma } from "@/server/db";
import { submitApplication } from "@/server/services/applications";
import { getCvStorage } from "@/server/storage/cv-storage";
import { applicationFields, createJob, NOW, validPdf } from "../support/factories";

const storedFiles = () => readdir(process.env.CV_STORAGE_DIR!);

function submit(jobId: string, overrides: Partial<Record<string, string>> = {}, cv = validPdf(), now = NOW) {
  return submitApplication(
    { jobId, fields: applicationFields(overrides), cv: { bytes: cv, filename: "My CV.pdf" } },
    { now },
  );
}

describe("submitApplication", () => {
  it("creates a valid application as PENDING and stores the CV privately", async () => {
    const job = await createJob();

    const result = await submit(job.id, { email: "  Jane.Mukamana@EXAMPLE.com " });

    expect(result.ok).toBe(true);
    if (!result.ok) return;
    const application = await prisma.application.findUniqueOrThrow({ where: { id: result.applicationId } });
    expect(application.status).toBe("PENDING");
    expect(application.email).toBe("jane.mukamana@example.com");
    expect(application.decisionNote).toBeNull();
    expect(application.cvOriginalFilename).toBe("My CV.pdf");
    // The file is stored under the random key, not the candidate's file name.
    expect(await storedFiles()).toEqual([application.cvStorageKey]);
    expect(await getCvStorage().read(application.cvStorageKey)).not.toBeNull();
  });

  it("rejects applications for a manually closed job", async () => {
    const job = await createJob({ status: "CLOSED", closingDate: fromDateKey("2026-12-31") });

    const result = await submit(job.id);

    expect(result).toMatchObject({ ok: false, code: "JOB_CLOSED" });
    expect(await prisma.application.count()).toBe(0);
  });

  it("rejects applications after the closing date has passed", async () => {
    const job = await createJob({ closingDate: fromDateKey("2026-03-09") });

    const result = await submit(job.id);

    expect(result).toMatchObject({ ok: false, code: "JOB_CLOSED" });
    expect(await storedFiles()).toEqual([]);
  });

  it("keeps a job open for the whole of its closing date in Kigali time", async () => {
    const job = await createJob({ closingDate: fromDateKey("2026-03-10") });

    // 23:59:59 on 10 March in Kigali (21:59:59 UTC): still open.
    const lastSecond = await submit(job.id, { email: "late@example.com" }, validPdf(), new Date("2026-03-10T21:59:59Z"));
    // 00:00:00 on 11 March in Kigali (22:00:00 UTC): closed.
    const nextDay = await submit(job.id, { email: "too-late@example.com" }, validPdf(), new Date("2026-03-10T22:00:00Z"));

    expect(lastSecond.ok).toBe(true);
    expect(nextDay).toMatchObject({ ok: false, code: "JOB_CLOSED" });
  });

  it("treats drafts, unknown IDs and malformed IDs as not found", async () => {
    const draft = await createJob({ status: "DRAFT" });

    expect(await submit(draft.id)).toMatchObject({ ok: false, code: "JOB_NOT_FOUND" });
    expect(await submit("6f1c2a4e-8b3d-4c5a-9e7f-000000000000")).toMatchObject({ code: "JOB_NOT_FOUND" });
    expect(await submit("'; DROP TABLE \"Job\"; --")).toMatchObject({ code: "JOB_NOT_FOUND" });
    expect(await prisma.job.count()).toBe(1);
  });

  it("rejects a second application with the same normalised email for the same job", async () => {
    const job = await createJob();
    expect((await submit(job.id, { email: "jane@example.com" })).ok).toBe(true);

    const duplicate = await submit(job.id, { email: "  JANE@Example.com" });

    expect(duplicate).toMatchObject({ ok: false, code: "DUPLICATE" });
    expect(await prisma.application.count()).toBe(1);
    expect(await storedFiles()).toHaveLength(1); // no orphaned file from the duplicate
  });

  it("allows the same email to apply for a different job", async () => {
    const jobA = await createJob({ title: "Backend Engineer" });
    const jobB = await createJob({ title: "Frontend Engineer" });

    expect((await submit(jobA.id, { email: "jane@example.com" })).ok).toBe(true);
    expect((await submit(jobB.id, { email: "jane@example.com" })).ok).toBe(true);
    expect(await prisma.application.count()).toBe(2);
  });

  it("lets only one of two simultaneous duplicate submissions through", async () => {
    const job = await createJob();

    const results = await Promise.all([
      submit(job.id, { email: "race@example.com" }),
      submit(job.id, { email: "race@example.com" }),
    ]);

    expect(results.filter((r) => r.ok)).toHaveLength(1);
    expect(results.filter((r) => !r.ok && r.code === "DUPLICATE")).toHaveLength(1);
    expect(await prisma.application.count()).toBe(1);
    expect(await storedFiles()).toHaveLength(1);
  });

  it("rejects invalid and oversized CVs without storing anything", async () => {
    const job = await createJob();
    const textFile = new Uint8Array(Buffer.from("not really a pdf"));
    const oversized = new Uint8Array(MAX_CV_BYTES + 1);
    oversized.set(validPdf());

    const notPdf = await submit(job.id, {}, textFile);
    const tooLarge = await submit(job.id, {}, oversized);
    const empty = await submit(job.id, {}, new Uint8Array());
    const missing = await submitApplication(
      { jobId: job.id, fields: applicationFields(), cv: null },
      { now: NOW },
    );

    expect(notPdf).toMatchObject({ ok: false, code: "VALIDATION", fieldErrors: { cv: expect.stringMatching(/not a valid PDF/) } });
    expect(tooLarge).toMatchObject({ ok: false, code: "VALIDATION", fieldErrors: { cv: expect.stringMatching(/5 MB/) } });
    expect(empty).toMatchObject({ ok: false, fieldErrors: { cv: expect.stringMatching(/empty/) } });
    expect(missing).toMatchObject({ ok: false, fieldErrors: { cv: expect.stringMatching(/Attach your CV/) } });
    expect(await prisma.application.count()).toBe(0);
    expect(await storedFiles()).toEqual([]);
  });

  it("returns field errors for invalid details", async () => {
    const job = await createJob();

    const result = await submit(job.id, { email: "nope", fullName: "", coverNote: "short" });

    expect(result).toMatchObject({ ok: false, code: "VALIDATION" });
    if (result.ok) return;
    expect(Object.keys(result.fieldErrors ?? {})).toEqual(
      expect.arrayContaining(["email", "fullName", "coverNote"]),
    );
  });

  it("deletes the stored CV if saving the application fails", async () => {
    const job = await createJob();
    const createSpy = vi
      .spyOn(prisma.application, "create")
      .mockRejectedValueOnce(new Error("database unavailable"));

    await expect(submit(job.id)).rejects.toThrow("database unavailable");

    expect(createSpy).toHaveBeenCalledOnce();
    expect(await storedFiles()).toEqual([]);
    createSpy.mockRestore();
  });
});
