import { ArrowLeft, ArrowRight, BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { notFound } from "next/navigation";
import { closingCountdown, JobMeta } from "@/components/public/job-meta";
import { Alert } from "@/components/ui/alert";
import { buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { daysUntilDate, formatDateOnly, timeZoneCity } from "@/lib/dates";
import { getJobAvailability, type JobAvailability } from "@/lib/job-availability";
import { getBusinessTimeZone } from "@/server/env";
import { getPublicJob } from "@/server/services/jobs";

export const dynamic = "force-dynamic";

type Props = { params: Promise<{ jobId: string }> };

export async function generateMetadata({ params }: Props): Promise<Metadata> {
  const job = await getPublicJob((await params).jobId);
  return job ? { title: job.title, description: job.summary } : { title: "Job not found" };
}

export default async function JobDetailsPage({ params }: Props) {
  const job = await getPublicJob((await params).jobId);
  if (!job) notFound();

  const now = new Date();
  const timeZone = getBusinessTimeZone();
  const availability = getJobAvailability(job, now, timeZone);
  const accepting = availability === "ACCEPTING";
  const paragraphs = job.description.split(/\n\s*\n/).filter((p) => p.trim().length > 0);

  return (
    <div className="mx-auto max-w-6xl px-4 py-8 sm:px-6 sm:py-10">
      <Link
        href="/#open-roles"
        className="inline-flex items-center gap-1.5 rounded-md text-sm font-medium text-slate-600 hover:text-navy-900"
      >
        <ArrowLeft className="size-4" aria-hidden="true" />
        All open roles
      </Link>

      <header className="mt-5 border-b border-slate-200 pb-6">
        <h1 className="text-3xl font-semibold tracking-tight text-slate-900">{job.title}</h1>
        <JobMeta
          className="mt-3"
          location={job.location}
          employmentType={job.employmentType}
          closingDate={job.closingDate}
        />
        {!accepting && (
          <Alert tone="warning" className="mt-5" title="Applications are closed">
            {closedMessage(availability, job.closingDate)}
          </Alert>
        )}
      </header>

      <div className="mt-8 grid grid-cols-1 gap-8 lg:grid-cols-[minmax(0,1fr)_320px]">
        <article className="space-y-8">
          <section aria-labelledby="about-heading">
            <h2 id="about-heading" className="text-lg font-semibold text-slate-900">
              About the role
            </h2>
            <div className="mt-3 space-y-4 leading-7 text-slate-700">
              {paragraphs.map((paragraph, index) => (
                <p key={index} className="whitespace-pre-line">
                  {paragraph}
                </p>
              ))}
            </div>
          </section>

          <BulletSection id="responsibilities" title="What you'll do" items={job.responsibilities} />
          <BulletSection id="requirements" title="What we're looking for" items={job.requirements} />
        </article>

        <aside className="lg:sticky lg:top-6 lg:self-start">
          <Card className="p-5">
            <h2 className="text-base font-semibold text-slate-900">Role overview</h2>
            <dl className="mt-4 space-y-3 text-sm">
              <Fact icon={MapPin} label="Location" value={job.location} />
              <Fact
                icon={BriefcaseBusiness}
                label="Employment type"
                value={EMPLOYMENT_TYPE_LABELS[job.employmentType]}
              />
              <Fact
                icon={CalendarDays}
                label="Closing date"
                value={`${formatDateOnly(job.closingDate)} (end of day, ${timeZoneCity(timeZone)} time)`}
              />
            </dl>
            {accepting ? (
              <>
                <Link
                  href={`/jobs/${job.id}/apply`}
                  className={buttonVariants({ size: "lg", className: "mt-5 w-full" })}
                >
                  Apply for this role
                  <ArrowRight aria-hidden="true" />
                </Link>
                <p className="mt-2 text-center text-xs text-slate-500">
                  {closingCountdown(daysUntilDate(job.closingDate, now, timeZone))} · Takes about 5
                  minutes
                </p>
              </>
            ) : (
              <p className="mt-5 rounded-lg bg-slate-100 px-3 py-2.5 text-center text-sm font-medium text-slate-700">
                No longer accepting applications
              </p>
            )}
          </Card>
        </aside>
      </div>
    </div>
  );
}

function closedMessage(availability: JobAvailability, closingDate: Date): string {
  if (availability === "EXPIRED") {
    return `The closing date for this role was ${formatDateOnly(closingDate)}. Take a look at our other open roles.`;
  }
  return "This role is no longer accepting applications. Take a look at our other open roles.";
}

function BulletSection({ id, title, items }: { id: string; title: string; items: string[] }) {
  return (
    <section aria-labelledby={`${id}-heading`}>
      <h2 id={`${id}-heading`} className="text-lg font-semibold text-slate-900">
        {title}
      </h2>
      <ul className="mt-3 space-y-2.5">
        {items.map((item, index) => (
          <li key={index} className="flex gap-3 leading-7 text-slate-700">
            <span className="mt-2.75 size-1.5 shrink-0 rounded-full bg-blue-600" aria-hidden="true" />
            {item}
          </li>
        ))}
      </ul>
    </section>
  );
}

function Fact({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof MapPin;
  label: string;
  value: string;
}) {
  return (
    <div className="flex gap-3">
      <Icon className="mt-0.5 size-4 shrink-0 text-slate-400" aria-hidden="true" />
      <div>
        <dt className="text-slate-500">{label}</dt>
        <dd className="font-medium text-slate-900">{value}</dd>
      </div>
    </div>
  );
}
