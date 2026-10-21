import "server-only";
import type { ApplicationStatus } from "@/generated/prisma/client";
import { calendarDateInTimeZone, fromDateKey } from "@/lib/dates";
import { prisma } from "@/server/db";
import { getBusinessTimeZone } from "@/server/env";

type StatusCounts = Record<ApplicationStatus, number>;

const emptyCounts = (): StatusCounts => ({ PENDING: 0, ACCEPTED: 0, REJECTED: 0 });

/** Every number on the dashboard comes from these queries; nothing is hard-coded. */
export async function getDashboardData(now: Date = new Date()) {
  const today = fromDateKey(calendarDateInTimeZone(now, getBusinessTimeZone()));

  const [totalJobs, openJobs, groups, jobs, recentApplications] = await Promise.all([
    prisma.job.count(),
    // "Open" means candidates can apply today: OPEN status and closing date not passed.
    prisma.job.count({ where: { status: "OPEN", closingDate: { gte: today } } }),
    prisma.application.groupBy({ by: ["jobId", "status"], _count: { _all: true } }),
    prisma.job.findMany({
      select: { id: true, title: true, status: true, closingDate: true },
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
    }),
    prisma.application.findMany({
      take: 5,
      orderBy: [{ createdAt: "desc" }, { id: "asc" }],
      select: {
        id: true,
        fullName: true,
        status: true,
        createdAt: true,
        job: { select: { title: true } },
      },
    }),
  ]);

  const totals = emptyCounts();
  const countsByJob = new Map<string, StatusCounts>();
  for (const group of groups) {
    const count = group._count._all;
    totals[group.status] += count;
    const jobCounts = countsByJob.get(group.jobId) ?? emptyCounts();
    jobCounts[group.status] += count;
    countsByJob.set(group.jobId, jobCounts);
  }

  const byJob = jobs.map((job) => {
    const counts = countsByJob.get(job.id) ?? emptyCounts();
    return { ...job, ...counts, total: counts.PENDING + counts.ACCEPTED + counts.REJECTED };
  });

  return {
    stats: {
      totalJobs,
      openJobs,
      totalApplications: totals.PENDING + totals.ACCEPTED + totals.REJECTED,
      pending: totals.PENDING,
      accepted: totals.ACCEPTED,
      rejected: totals.REJECTED,
    },
    byJob,
    recentApplications,
  };
}
