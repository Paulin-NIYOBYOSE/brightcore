import { ArrowRight, Clock } from "lucide-react";
import Link from "next/link";
import { closingCountdown, JobMeta } from "@/components/public/job-meta";
import { Badge } from "@/components/ui/badge";
import type { JobCardData } from "@/server/services/jobs";

/** `daysLeft` is computed on the server in the business timezone. */
export function JobCard({ job, daysLeft }: { job: JobCardData; daysLeft: number }) {
  return (
    <article className="group relative flex flex-col rounded-xl border border-slate-200 bg-white p-5 shadow-sm transition hover:border-navy-300 hover:shadow-md has-[a:focus-visible]:outline-2 has-[a:focus-visible]:outline-offset-2 has-[a:focus-visible]:outline-blue-600 sm:p-6">
      <div className="flex flex-wrap items-start justify-between gap-x-3 gap-y-2">
        <h3 className="text-lg font-semibold text-slate-900 group-hover:text-navy-800">
          {/* The ::after overlay makes the whole card clickable while keeping one link. */}
          <Link
            href={`/jobs/${job.id}`}
            className="after:absolute after:inset-0 after:rounded-xl focus-visible:outline-none"
          >
            {job.title}
          </Link>
        </h3>
        {daysLeft <= 7 && (
          <Badge tone="warning">
            <Clock aria-hidden="true" />
            {closingCountdown(daysLeft)}
          </Badge>
        )}
      </div>
      <JobMeta
        className="mt-2"
        location={job.location}
        employmentType={job.employmentType}
        closingDate={job.closingDate}
      />
      <p className="mt-3 line-clamp-3 text-sm leading-6 text-slate-600">{job.summary}</p>
      <span className="mt-auto inline-flex items-center gap-1 pt-5 text-sm font-medium text-blue-700">
        View role and apply
        <ArrowRight
          className="size-4 transition-transform group-hover:translate-x-0.5"
          aria-hidden="true"
        />
      </span>
    </article>
  );
}
