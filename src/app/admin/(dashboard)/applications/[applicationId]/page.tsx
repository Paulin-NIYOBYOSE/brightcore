import { ArrowLeft, Download, FileText, Mail, Phone } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { PageHeader } from "@/components/admin/admin-shell";
import { DecisionPanel } from "@/components/admin/decision-panel";
import { ApplicationStatusBadge, JobAvailabilityBadge } from "@/components/status-badges";
import { buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { formatDateTime } from "@/lib/dates";
import { getJobAvailability } from "@/lib/job-availability";
import { applicationReference } from "@/lib/utils";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";
import { getApplicationForAdmin } from "@/server/services/applications";

export const metadata: Metadata = { title: "Application" };

type Props = { params: Promise<{ applicationId: string }> };

export default async function ApplicationDetailPage({ params }: Props) {
  await requireAdminPage();
  const application = await getApplicationForAdmin((await params).applicationId);
  if (!application) notFound();

  const timeZone = getBusinessTimeZone();
  const { job } = application;

  return (
    <>
      <Link
        href={`/admin/applications?jobId=${job.id}`}
        className="mb-4 inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Applications for {job.title}
      </Link>

      <PageHeader
        title={application.fullName}
        description={
          <span className="flex flex-wrap items-center gap-2">
            <ApplicationStatusBadge status={application.status} />
            <span>
              Applied for{" "}
              <Link href={`/admin/jobs/${job.id}/edit`} className="font-medium text-slate-900 hover:underline">
                {job.title}
              </Link>{" "}
              on {formatDateTime(application.createdAt, timeZone)}
            </span>
          </span>
        }
      />

      <div className="grid grid-cols-1 gap-6 lg:grid-cols-[minmax(0,2fr)_minmax(0,1fr)]">
        <div className="space-y-6">
          <Card>
            <CardHeader title="Candidate" description={`Reference ${applicationReference(application.id)}`} />
            <CardBody>
              <dl className="grid gap-4 text-sm sm:grid-cols-2">
                <div>
                  <dt className="text-slate-500">Email</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`mailto:${application.email}`}
                      className="inline-flex items-center gap-1.5 font-medium break-all text-blue-700 hover:underline"
                    >
                      <Mail className="size-4 shrink-0" aria-hidden="true" />
                      {application.email}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Phone</dt>
                  <dd className="mt-0.5">
                    <a
                      href={`tel:${application.phone.replace(/[^\d+]/g, "")}`}
                      className="inline-flex items-center gap-1.5 font-medium text-blue-700 hover:underline"
                    >
                      <Phone className="size-4 shrink-0" aria-hidden="true" />
                      {application.phone}
                    </a>
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Job</dt>
                  <dd className="mt-0.5 flex flex-wrap items-center gap-2 font-medium text-slate-900">
                    {job.title}
                    <JobAvailabilityBadge availability={getJobAvailability(job, new Date(), timeZone)} />
                  </dd>
                </div>
                <div>
                  <dt className="text-slate-500">Submitted</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {formatDateTime(application.createdAt, timeZone)}
                  </dd>
                </div>
              </dl>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="Cover note" />
            <CardBody>
              {/* Rendered as plain text: React escapes it, so no HTML from candidates is ever executed. */}
              <p className="text-sm leading-7 whitespace-pre-wrap text-slate-700">{application.coverNote}</p>
            </CardBody>
          </Card>

          <Card>
            <CardHeader title="CV" />
            <CardBody className="flex flex-wrap items-center gap-4">
              <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700">
                <FileText className="size-5" aria-hidden="true" />
              </span>
              <p className="min-w-0 flex-1 truncate text-sm font-medium text-slate-900">
                {application.cvOriginalFilename}
              </p>
              <a
                href={`/api/admin/applications/${application.id}/cv`}
                className={buttonVariants({ variant: "secondary", size: "sm" })}
              >
                <Download aria-hidden="true" />
                Download CV
              </a>
            </CardBody>
          </Card>
        </div>

        <Card className="self-start">
          <CardHeader title="Decision" />
          <CardBody className="space-y-4">
            <dl className="space-y-3 text-sm">
              <div>
                <dt className="text-slate-500">Status</dt>
                <dd className="mt-1">
                  <ApplicationStatusBadge status={application.status} />
                </dd>
              </div>
              {application.decidedAt && (
                <div>
                  <dt className="text-slate-500">Decided</dt>
                  <dd className="mt-0.5 font-medium text-slate-900">
                    {formatDateTime(application.decidedAt, timeZone)}
                  </dd>
                </div>
              )}
              {application.decisionNote && (
                <div>
                  <dt className="text-slate-500">Note</dt>
                  <dd className="mt-0.5 whitespace-pre-wrap text-slate-700">{application.decisionNote}</dd>
                </div>
              )}
            </dl>
            <div className="border-t border-slate-200 pt-4">
              <DecisionPanel
                applicationId={application.id}
                candidateName={application.fullName}
                status={application.status}
                decisionNote={application.decisionNote}
              />
            </div>
          </CardBody>
        </Card>
      </div>
    </>
  );
}
