import { ArrowLeft, ExternalLink, Users } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/admin-shell";
import { JobForm } from "@/components/admin/job-form";
import { JobStatusActions } from "@/components/admin/job-status-actions";
import { JobAvailabilityBadge } from "@/components/status-badges";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { calendarDateInTimeZone, formatDateTime, toDateKey } from "@/lib/dates";
import { getJobAvailability } from "@/lib/job-availability";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";
import { getJobForAdmin } from "@/server/services/jobs";

export const metadata: Metadata = { title: "Edit job" };

type Props = { params: Promise<{ jobId: string }> };

export default async function EditJobPage({ params }: Props) {
  await requireAdminPage();
  const job = await getJobForAdmin((await params).jobId);
  if (!job) notFound();

  const applicationCount = job._count.applications;
  const now = new Date();
  const timeZone = getBusinessTimeZone();
  const availability = getJobAvailability(job, now, timeZone);

  return (
    <>
      <Link
        href="/admin/jobs"
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All jobs
      </Link>
      <PageHeader
        title={job.title}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <JobAvailabilityBadge availability={availability} />
            <span>Last updated {formatDateTime(job.updatedAt, timeZone)}</span>
          </span>
        }
        actions={
          <>
            <Link
              href={`/admin/applications?jobId=${job.id}`}
              className={buttonVariants({ variant: "secondary", size: "sm" })}
            >
              <Users aria-hidden="true" />
              {applicationCount} application{applicationCount === 1 ? "" : "s"}
            </Link>
            {job.status !== "DRAFT" && (
              <Link
                href={`/jobs/${job.id}`}
                target="_blank"
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <ExternalLink aria-hidden="true" />
                View public page
              </Link>
            )}
            <JobStatusActions
              jobId={job.id}
              jobTitle={job.title}
              status={job.status}
              applicationCount={applicationCount}
            />
          </>
        }
      />

      {availability === "EXPIRED" && (
        <Alert tone="warning" className="mb-6" title="The closing date has passed">
          Candidates can no longer apply. Set a new closing date to accept applications again, or
          close the job.
        </Alert>
      )}

      <JobForm
        mode="edit"
        jobId={job.id}
        minClosingDate={calendarDateInTimeZone(now, timeZone)}
        defaultValues={{
          title: job.title,
          location: job.location,
          employmentType: job.employmentType,
          summary: job.summary,
          description: job.description,
          responsibilities: job.responsibilities.join("\n"),
          requirements: job.requirements.join("\n"),
          closingDate: toDateKey(job.closingDate),
        }}
      />
    </>
  );
}
