import { BriefcaseBusiness, ExternalLink, Pencil, Plus } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/admin-shell";
import { JobStatusActions } from "@/components/admin/job-status-actions";
import { JobAvailabilityBadge } from "@/components/status-badges";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";
import { getJobAvailability } from "@/lib/job-availability";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";
import { listJobsForAdmin } from "@/server/services/jobs";

export const metadata: Metadata = { title: "Jobs" };

const NOTICES: Record<string, string> = {
  published: "The job was published and is now visible on the careers site.",
  "draft-saved": "The job was saved as a draft. Publish it when you're ready.",
  updated: "Your changes were saved.",
};

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function AdminJobsPage({ searchParams }: Props) {
  await requireAdminPage();
  const { notice } = await searchParams;
  const noticeMessage = typeof notice === "string" ? NOTICES[notice] : undefined;

  const jobs = await listJobsForAdmin();
  const now = new Date();
  const timeZone = getBusinessTimeZone();

  return (
    <>
      <PageHeader
        title="Jobs"
        description="Create, publish, close and reopen job postings."
        actions={
          <Link href="/admin/jobs/new" className={buttonVariants()}>
            <Plus aria-hidden="true" />
            New job
          </Link>
        }
      />

      {noticeMessage && (
        <Alert tone="success" className="mb-6">
          {noticeMessage}
        </Alert>
      )}

      {jobs.length === 0 ? (
        <EmptyState
          icon={BriefcaseBusiness}
          title="No jobs yet"
          description="Create a job, save it as a draft and publish it when it's ready."
          action={
            <Link href="/admin/jobs/new" className={buttonVariants()}>
              Create a job
            </Link>
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[820px] text-sm">
              <caption className="sr-only">All jobs</caption>
              <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">Job</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-3 py-3">Closing date</th>
                  <th scope="col" className="px-3 py-3 text-right">Applications</th>
                  <th scope="col" className="px-5 py-3 text-right">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {jobs.map((job) => {
                  const availability = getJobAvailability(job, now, timeZone);
                  return (
                    <tr key={job.id} className="align-top hover:bg-slate-50/60">
                      <th scope="row" className="px-5 py-4 text-left font-normal">
                        <Link
                          href={`/admin/jobs/${job.id}/edit`}
                          className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                        >
                          {job.title}
                        </Link>
                        <p className="mt-0.5 text-xs text-slate-500">
                          {job.location} · {EMPLOYMENT_TYPE_LABELS[job.employmentType]}
                        </p>
                      </th>
                      <td className="px-3 py-4">
                        <JobAvailabilityBadge availability={availability} />
                      </td>
                      <td className="px-3 py-4 whitespace-nowrap text-slate-700">
                        {formatDateOnly(job.closingDate)}
                      </td>
                      <td className="px-3 py-4 text-right">
                        <Link
                          href={`/admin/applications?jobId=${job.id}`}
                          className="font-medium text-blue-700 tabular-nums hover:underline"
                        >
                          {job._count.applications}
                          <span className="sr-only"> applications for {job.title}</span>
                        </Link>
                      </td>
                      <td className="px-5 py-4">
                        <div className="flex justify-end gap-2">
                          {job.status !== "DRAFT" && (
                            <Link
                              href={`/jobs/${job.id}`}
                              target="_blank"
                              className={buttonVariants({ variant: "ghost", size: "sm" })}
                            >
                              <ExternalLink aria-hidden="true" />
                              <span className="sr-only">View public page for {job.title} (opens in a new tab)</span>
                            </Link>
                          )}
                          <Link
                            href={`/admin/jobs/${job.id}/edit`}
                            className={buttonVariants({ variant: "secondary", size: "sm" })}
                          >
                            <Pencil aria-hidden="true" />
                            Edit<span className="sr-only">: {job.title}</span>
                          </Link>
                          <JobStatusActions
                            jobId={job.id}
                            jobTitle={job.title}
                            status={job.status}
                            applicationCount={job._count.applications}
                          />
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        </Card>
      )}
    </>
  );
}
