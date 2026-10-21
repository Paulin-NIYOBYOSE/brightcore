import { describe, expect, it } from "vitest";
import { decideApplicationAction } from "@/app/admin/(dashboard)/applications/actions";
import {
  changeJobStatusAction,
  createJobAction,
  updateJobAction,
} from "@/app/admin/(dashboard)/jobs/actions";
import { fromDateKey } from "@/lib/dates";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";
import { prisma } from "@/server/db";
import { createApplication, createJob, signInAsAdmin } from "../support/factories";
import { RedirectSignal, requestContext } from "../support/request-context";

const jobForm = {
  title: "Data Engineer",
  location: "Kigali, Rwanda",
  employmentType: "FULL_TIME",
  summary: "Build and run our data pipelines and warehouse.",
  description: "You will design, build and operate the data platform that powers BrightCore reporting.",
  responsibilities: "Build pipelines\nModel data",
  requirements: "3+ years with SQL",
  closingDate: "2099-12-31",
};

describe("protected admin operations without a session", () => {
  it("cannot accept or reject applications", async () => {
    const job = await createJob();
    const application = await createApplication(job.id);

    const result = await decideApplicationAction({
      applicationId: application.id,
      decision: "ACCEPTED",
      note: "sneaky",
    });

    expect(result).toMatchObject({ ok: false, code: "UNAUTHORIZED" });
    const unchanged = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(unchanged.status).toBe("PENDING");
    expect(unchanged.decisionNote).toBeNull();
  });

  it("cannot create, edit, close or reopen jobs", async () => {
    const job = await createJob();

    expect(await createJobAction(jobForm, true)).toMatchObject({ code: "UNAUTHORIZED" });
    expect(await updateJobAction(job.id, { ...jobForm, title: "Hacked" })).toMatchObject({ code: "UNAUTHORIZED" });
    expect(await changeJobStatusAction(job.id, "close")).toMatchObject({ code: "UNAUTHORIZED" });

    expect(await prisma.job.count()).toBe(1);
    expect(await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).toMatchObject({
      title: job.title,
      status: "OPEN",
    });
  });

  it("rejects expired and forged session tokens", async () => {
    const job = await createJob();
    const application = await createApplication(job.id);
    const admin = await signInAsAdmin();
    const decide = () => decideApplicationAction({ applicationId: application.id, decision: "REJECTED" });

    // A genuine session whose expiry time has passed.
    await prisma.adminSession.updateMany({
      where: { adminUserId: admin.id },
      data: { expiresAt: new Date(Date.now() - 1000) },
    });
    expect(await decide()).toMatchObject({ code: "UNAUTHORIZED" });
    expect(await prisma.adminSession.count()).toBe(0); // the expired session is cleaned up

    // A token that was never issued.
    requestContext.setCookie(SESSION_COOKIE_NAME, "forged-token");
    expect(await decide()).toMatchObject({ code: "UNAUTHORIZED" });

    expect(await prisma.application.findUniqueOrThrow({ where: { id: application.id } })).toMatchObject({
      status: "PENDING",
    });
  });
});

describe("application decisions by an administrator", () => {
  it("accepts an application", async () => {
    await signInAsAdmin();
    const job = await createJob();
    const application = await createApplication(job.id);

    const result = await decideApplicationAction({ applicationId: application.id, decision: "ACCEPTED" });

    expect(result).toEqual({ ok: true, status: "ACCEPTED" });
    const saved = await prisma.application.findUniqueOrThrow({ where: { id: application.id } });
    expect(saved.status).toBe("ACCEPTED");
    expect(saved.decisionNote).toBeNull();
    expect(saved.decidedAt).toBeInstanceOf(Date);
  });

  it("rejects an application with an optional note", async () => {
    await signInAsAdmin();
    const job = await createJob();
    const application = await createApplication(job.id);

    const result = await decideApplicationAction({
      applicationId: application.id,
      decision: "REJECTED",
      note: "  Looking for more Kubernetes experience.  ",
    });

    expect(result).toEqual({ ok: true, status: "REJECTED" });
    expect(await prisma.application.findUniqueOrThrow({ where: { id: application.id } })).toMatchObject({
      status: "REJECTED",
      decisionNote: "Looking for more Kubernetes experience.",
    });
  });

  it("only changes the targeted application's decision fields", async () => {
    await signInAsAdmin();
    const job = await createJob();
    const target = await createApplication(job.id, { email: "target@example.com" });
    const other = await createApplication(job.id, { email: "other@example.com" });

    // Extra fields (mass assignment) and a PENDING "decision" are refused outright.
    expect(
      await decideApplicationAction({
        applicationId: target.id,
        decision: "ACCEPTED",
        email: "attacker@example.com",
      }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(
      await decideApplicationAction({ applicationId: target.id, decision: "PENDING" }),
    ).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(
      await decideApplicationAction({ applicationId: "6f1c2a4e-8b3d-4c5a-9e7f-000000000000", decision: "ACCEPTED" }),
    ).toMatchObject({ ok: false, code: "NOT_FOUND" });

    await decideApplicationAction({ applicationId: target.id, decision: "ACCEPTED" });

    expect(await prisma.application.findUniqueOrThrow({ where: { id: target.id } })).toMatchObject({
      status: "ACCEPTED",
      email: "target@example.com",
    });
    expect(await prisma.application.findUniqueOrThrow({ where: { id: other.id } })).toMatchObject({
      status: "PENDING",
    });
  });
});

describe("job management by an administrator", () => {
  it("creates a draft and redirects to the jobs list", async () => {
    await signInAsAdmin();

    await expect(createJobAction(jobForm, false)).rejects.toThrow(RedirectSignal);

    const job = await prisma.job.findFirstOrThrow();
    expect(job).toMatchObject({ title: "Data Engineer", status: "DRAFT", responsibilities: ["Build pipelines", "Model data"] });
  });

  it("returns field errors for invalid job data and past closing dates", async () => {
    await signInAsAdmin();

    expect(await createJobAction({ ...jobForm, title: "" }, true)).toMatchObject({
      code: "VALIDATION",
      fieldErrors: { title: expect.any(String) },
    });
    expect(await createJobAction({ ...jobForm, closingDate: "2020-01-01" }, true)).toMatchObject({
      code: "VALIDATION",
      fieldErrors: { closingDate: expect.any(String) },
    });
    expect(await createJobAction({ ...jobForm, status: "OPEN" }, true)).toMatchObject({ code: "VALIDATION" });
    expect(await prisma.job.count()).toBe(0);
  });

  it("closes a job without deleting its applications, then reopens it", async () => {
    await signInAsAdmin();
    const job = await createJob({ closingDate: fromDateKey("2099-12-31") });
    await createApplication(job.id);

    expect(await changeJobStatusAction(job.id, "close")).toEqual({ ok: true, status: "CLOSED" });
    expect(await prisma.application.count({ where: { jobId: job.id } })).toBe(1);

    expect(await changeJobStatusAction(job.id, "close")).toMatchObject({ ok: false, code: "INVALID_TRANSITION" });
    expect(await changeJobStatusAction(job.id, "reopen")).toEqual({ ok: true, status: "OPEN" });
  });

  it("refuses to reopen or publish a job whose closing date has passed", async () => {
    await signInAsAdmin();
    const closed = await createJob({ status: "CLOSED", closingDate: fromDateKey("2020-01-01") });
    const draft = await createJob({ status: "DRAFT", closingDate: fromDateKey("2020-01-01") });

    expect(await changeJobStatusAction(closed.id, "reopen")).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await changeJobStatusAction(draft.id, "publish")).toMatchObject({ ok: false, code: "VALIDATION" });
    expect(await changeJobStatusAction(draft.id, "delete")).toMatchObject({ ok: false, code: "VALIDATION" });
  });
});
