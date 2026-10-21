import { describe, expect, it } from "vitest";
import { fromDateKey } from "@/lib/dates";
import { prisma } from "@/server/db";
import { getDashboardData } from "@/server/services/dashboard";
import { getPublicJob, listOpenJobs, updateJob } from "@/server/services/jobs";
import { createApplication, createJob, NOW } from "../support/factories";

describe("public job listing", () => {
  it("shows only published jobs that are still open", async () => {
    const open = await createJob({ title: "Open role" });
    const closingToday = await createJob({ title: "Closing today", closingDate: fromDateKey("2026-03-10") });
    await createJob({ title: "Draft role", status: "DRAFT" });
    await createJob({ title: "Closed role", status: "CLOSED" });
    await createJob({ title: "Expired role", closingDate: fromDateKey("2026-03-09") });

    const titles = (await listOpenJobs({ q: "" }, NOW)).map((job) => job.title).sort();

    expect(titles).toEqual([closingToday.title, open.title].sort());
  });

  it("searches title and location case-insensitively and filters by type", async () => {
    await createJob({ title: "Senior Backend Engineer", location: "Kigali, Rwanda" });
    await createJob({ title: "Product Designer", location: "Remote (East Africa)", employmentType: "CONTRACT" });
    await createJob({ title: "Support Intern", location: "Musanze", employmentType: "INTERNSHIP" });

    const titlesFor = async (q: string, type?: "CONTRACT" | "INTERNSHIP") =>
      (await listOpenJobs({ q, type }, NOW)).map((job) => job.title);

    expect(await titlesFor("backend")).toEqual(["Senior Backend Engineer"]);
    expect(await titlesFor("east africa")).toEqual(["Product Designer"]);
    expect(await titlesFor("", "INTERNSHIP")).toEqual(["Support Intern"]);
    expect(await titlesFor("designer", "INTERNSHIP")).toEqual([]);
    // LIKE wildcards are matched literally.
    expect(await titlesFor("%")).toEqual([]);
    expect(await titlesFor("_")).toEqual([]);
  });

  it("matches titles that really contain wildcard characters", async () => {
    await createJob({ title: "Growth_Marketing 100% remote" });
    await createJob({ title: "Accountant" });

    expect((await listOpenJobs({ q: "100%" }, NOW)).map((job) => job.title)).toEqual([
      "Growth_Marketing 100% remote",
    ]);
    expect((await listOpenJobs({ q: "h_m" }, NOW)).map((job) => job.title)).toEqual([
      "Growth_Marketing 100% remote",
    ]);
  });

  it("hides drafts from the job page but still shows closed jobs", async () => {
    const draft = await createJob({ status: "DRAFT" });
    const closed = await createJob({ status: "CLOSED" });

    expect(await getPublicJob(draft.id)).toBeNull();
    expect(await getPublicJob(closed.id)).not.toBeNull();
    expect(await getPublicJob("not-a-uuid")).toBeNull();
  });
});

describe("updateJob", () => {
  const form = {
    title: "Backend Engineer II",
    location: "Kigali, Rwanda",
    employmentType: "FULL_TIME",
    summary: "Build reliable APIs for our customers across East Africa.",
    description: "A detailed description of the backend engineering role at BrightCore.",
    responsibilities: "Design APIs",
    requirements: "3+ years of experience",
    closingDate: "2026-03-01",
  };

  it("keeps an existing past closing date but refuses to set a new past date", async () => {
    const job = await createJob({ closingDate: fromDateKey("2026-03-01") });

    expect(await updateJob(job.id, form, NOW)).toEqual({ ok: true, jobId: job.id });
    expect(await updateJob(job.id, { ...form, closingDate: "2026-03-02" }, NOW)).toMatchObject({
      ok: false,
      fieldErrors: { closingDate: expect.any(String) },
    });
    expect((await prisma.job.findUniqueOrThrow({ where: { id: job.id } })).status).toBe("OPEN");
  });
});

describe("dashboard data", () => {
  it("counts jobs and applications from the database", async () => {
    const backend = await createJob({ title: "Backend" });
    const design = await createJob({ title: "Design", closingDate: fromDateKey("2099-01-01") });
    await createJob({ title: "Old", closingDate: fromDateKey("2020-01-01") }); // expired: not "open"
    await createJob({ title: "Draft", status: "DRAFT", closingDate: fromDateKey("2099-01-01") });

    await createApplication(backend.id, { status: "PENDING" });
    await createApplication(backend.id, { status: "ACCEPTED" });
    await createApplication(backend.id, { status: "REJECTED" });
    await createApplication(design.id, { status: "PENDING" });

    const { stats, byJob } = await getDashboardData(NOW);

    expect(stats).toEqual({
      totalJobs: 4,
      openJobs: 2,
      totalApplications: 4,
      pending: 2,
      accepted: 1,
      rejected: 1,
    });
    expect(byJob.find((job) => job.id === backend.id)).toMatchObject({
      PENDING: 1,
      ACCEPTED: 1,
      REJECTED: 1,
      total: 3,
    });
    expect(byJob.find((job) => job.title === "Draft")).toMatchObject({ total: 0 });
  });
});
