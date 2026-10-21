import { ArrowLeft, ShieldCheck } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { ApplicationForm } from "@/components/public/application-form";
import { JobMeta } from "@/components/public/job-meta";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { isAcceptingApplications } from "@/lib/job-availability";
import { getBusinessTimeZone } from "@/server/env";
import { getPublicJob } from "@/server/services/jobs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getPublicJob((await params).jobId);
  return { title: job ? `Apply: ${job.title}` : "Job not found" };
}

export default async function ApplyPage({ params }: Props) {
  const job = await getPublicJob((await params).jobId);
  if (!job) notFound();

  // Checked again on the server when the form is submitted.
  const accepting = isAcceptingApplications(job, new Date(), getBusinessTimeZone());

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href={`/jobs/${job.id}`}
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        Back to job description
      </Link>

      <div className="mt-5 grid gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <div>
          <h1 className="text-2xl font-semibold tracking-tight text-slate-900 sm:text-3xl">
            Apply for {job.title}
          </h1>
          <JobMeta
            className="mt-3"
            location={job.location}
            employmentType={job.employmentType}
            closingDate={job.closingDate}
          />

          {accepting ? (
            <Card className="mt-6 p-5 sm:p-8">
              <ApplicationForm jobId={job.id} jobTitle={job.title} />
            </Card>
          ) : (
            <div className="mt-6 space-y-4">
              <Alert tone="warning" title="Applications are closed">
                This role is no longer accepting applications.
              </Alert>
              <Link href="/#open-roles" className={buttonVariants({ variant: "secondary" })}>
                See other open roles
              </Link>
            </div>
          )}
        </div>

        <aside className="hidden lg:block">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900">{job.title}</h2>
            <p className="mt-2 text-sm leading-6 text-slate-600">{job.summary}</p>
            <Link
              href={`/jobs/${job.id}`}
              className="mt-3 inline-block text-sm font-medium text-blue-700 hover:underline"
            >
              Read the full description
            </Link>
          </Card>
          <div className="mt-4 flex gap-3 rounded-xl border border-slate-200 bg-white p-5 text-sm text-slate-600">
            <ShieldCheck className="size-5 shrink-0 text-emerald-700" aria-hidden="true" />
            <p>
              Your CV is stored privately and is only available to BrightCore&rsquo;s recruitment
              team.
            </p>
          </div>
        </aside>
      </div>
    </div>
  );
}
