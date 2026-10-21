import {
  BriefcaseBusiness,
  CheckCircle2,
  CircleDot,
  Clock,
  Inbox,
  Plus,
  Users,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/admin-shell";
import { ApplicationStatusBadge, JobAvailabilityBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardHeader } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { formatDateTime } from "@/lib/dates";
import { getJobAvailability } from "@/lib/job-availability";
import { cn } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";
import { getDashboardData } from "@/server/services/dashboard";

export const metadata: Metadata = { title: "Dashboard" };

export default async function DashboardPage() {
  await requireAdminPage();
  const now = new Date();
  const timeZone = getBusinessTimeZone();
  const { stats, byJob, recentApplications } = await getDashboardData(now);

  const tiles: StatTileProps[] = [
    { label: "Total jobs", value: stats.totalJobs, icon: BriefcaseBusiness, href: "/admin/jobs", tone: "navy" },
    { label: "Open jobs", value: stats.openJobs, icon: CircleDot, href: "/admin/jobs", tone: "blue", hint: "Accepting applications today" },
    { label: "Total applications", value: stats.totalApplications, icon: Users, href: "/admin/applications", tone: "navy" },
    { label: "Pending", value: stats.pending, icon: Clock, href: "/admin/applications?status=PENDING", tone: "amber" },
    { label: "Accepted", value: stats.accepted, icon: CheckCircle2, href: "/admin/applications?status=ACCEPTED", tone: "emerald" },
    { label: "Rejected", value: stats.rejected, icon: XCircle, href: "/admin/applications?status=REJECTED", tone: "rose" },
  ];

  return (
    <>
      <PageHeader
        title="Dashboard"
        description="An overview of your recruitment pipeline."
        actions={
          <Link href="/admin/jobs/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            New job
          </Link>
        }
      />

      <section aria-label="Key figures">
        <ul className="grid grid-cols-2 gap-3 sm:gap-4 md:grid-cols-3 xl:grid-cols-6">
          {tiles.map((tile) => (
            <li key={tile.label}>
              <StatTile {...tile} />
            </li>
          ))}
        </ul>
      </section>

      <div className="mt-6 grid grid-cols-1 gap-6 xl:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <Card>
          <CardHeader
            title="Applications by job"
            description="Counts by status for every job, including closed ones."
          />
          {byJob.length === 0 ? (
            <div className="p-5">
              <EmptyState
                icon={BriefcaseBusiness}
                title="No jobs yet"
                description="Create your first job to start receiving applications."
                action={
                  <Link href="/admin/jobs/new" className={buttonVariants()}>
                    Create a job
                  </Link>
                }
              />
            </div>
          ) : (
            <div className="relative overflow-x-auto">
              <table className="w-full min-w-[560px] text-sm">
                <caption className="sr-only">Number of applications per job and status</caption>
                <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                  <tr>
                    <th scope="col" className="px-5 py-3">Job</th>
                    <th scope="col" className="px-3 py-3 text-right">Pending</th>
                    <th scope="col" className="px-3 py-3 text-right">Accepted</th>
                    <th scope="col" className="px-3 py-3 text-right">Rejected</th>
                    <th scope="col" className="px-5 py-3 text-right">Total</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-slate-100">
                  {byJob.map((job) => (
                    <tr key={job.id} className="hover:bg-slate-50">
                      <th scope="row" className="px-5 py-3 text-left font-normal">
                        <Link
                          href={`/admin/applications?jobId=${job.id}`}
                          className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                        >
                          {job.title}
                        </Link>
                        <div className="mt-1">
                          <JobAvailabilityBadge availability={getJobAvailability(job, now, timeZone)} />
                        </div>
                      </th>
                      <CountCell value={job.PENDING} />
                      <CountCell value={job.ACCEPTED} />
                      <CountCell value={job.REJECTED} />
                      <td className="px-5 py-3 text-right font-semibold text-slate-900 tabular-nums">
                        {job.total}
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>

        <Card>
          <CardHeader
            title="Latest applications"
            action={
              <Link href="/admin/applications" className="text-sm font-medium text-blue-700 hover:underline">
                View all
              </Link>
            }
          />
          {recentApplications.length === 0 ? (
            <div className="p-5">
              <EmptyState icon={Inbox} title="No applications yet" description="New applications will appear here." />
            </div>
          ) : (
            <ul className="divide-y divide-slate-100">
              {recentApplications.map((application) => (
                <li key={application.id}>
                  <Link
                    href={`/admin/applications/${application.id}`}
                    className="flex items-start justify-between gap-3 px-5 py-3 hover:bg-slate-50"
                  >
                    <div className="min-w-0">
                      <p className="truncate text-sm font-medium text-slate-900">{application.fullName}</p>
                      <p className="truncate text-xs text-slate-500">
                        {application.job.title} · {formatDateTime(application.createdAt, timeZone)}
                      </p>
                    </div>
                    <ApplicationStatusBadge status={application.status} />
                  </Link>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>
    </>
  );
}

const toneStyles = {
  navy: "bg-navy-50 text-navy-700",
  blue: "bg-blue-50 text-blue-700",
  amber: "bg-amber-50 text-amber-700",
  emerald: "bg-emerald-50 text-emerald-700",
  rose: "bg-rose-50 text-rose-700",
};

type StatTileProps = {
  label: string;
  value: number;
  icon: LucideIcon;
  href: string;
  tone: keyof typeof toneStyles;
  hint?: string;
};

function StatTile({ label, value, icon: Icon, href, tone, hint }: StatTileProps) {
  return (
    <Link
      href={href}
      className="flex h-full flex-col rounded-xl border border-slate-200 bg-white p-4 shadow-sm transition hover:border-navy-300 hover:shadow-md"
    >
      <span className={cn("flex size-9 items-center justify-center rounded-lg", toneStyles[tone])}>
        <Icon className="size-5" aria-hidden="true" />
      </span>
      <span className="mt-3 text-2xl font-semibold text-slate-900 tabular-nums">{value}</span>
      <span className="text-sm text-slate-600">{label}</span>
      {hint && <span className="mt-0.5 text-xs text-slate-500">{hint}</span>}
    </Link>
  );
}

function CountCell({ value }: { value: number }) {
  return (
    <td className={cn("px-3 py-3 text-right tabular-nums", value === 0 ? "text-slate-400" : "text-slate-700")}>
      {value}
    </td>
  );
}
