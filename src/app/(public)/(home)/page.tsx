import { SearchX, Sparkles } from "lucide-react";
import Link from "next/link";
import { JobCard } from "@/components/public/job-card";
import { JobSearchForm } from "@/components/public/job-search-form";
import { buttonVariants } from "@/components/ui/button";
import { EmptyState } from "@/components/ui/empty-state";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { daysUntilDate } from "@/lib/dates";
import { jobSearchSchema } from "@/lib/validation/job";
import { getBusinessTimeZone } from "@/server/env";
import { listOpenJobs } from "@/server/services/jobs";

// Job availability depends on today's date, so always render on request.
export const dynamic = "force-dynamic";

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

export default async function CareersPage({ searchParams }: Props) {
  const search = jobSearchSchema.parse(await searchParams);
  const now = new Date();
  const timeZone = getBusinessTimeZone();
  const jobs = await listOpenJobs(search, now);
  const hasFilters = Boolean(search.q || search.type);

  return (
    <>
      <section className="bg-navy-900 text-white">
        <div className="mx-auto max-w-6xl px-4 pt-12 pb-20 sm:px-6 sm:pt-16 sm:pb-24">
          <p className="text-sm font-semibold tracking-wide text-blue-300 uppercase">
            Careers at BrightCore
          </p>
          <h1 className="mt-3 max-w-3xl text-3xl font-semibold tracking-tight text-balance sm:text-4xl">
            Build dependable technology for businesses across East Africa
          </h1>
          <p className="mt-4 max-w-2xl text-base leading-7 text-navy-200">
            We are engineers, designers and customer specialists helping growing businesses run
            smoothly. Explore our open roles and apply in a few minutes. No account needed.
          </p>
        </div>
      </section>

      <div className="mx-auto -mt-12 max-w-6xl px-4 sm:px-6">
        <JobSearchForm search={search} />
      </div>

      <section
        id="open-roles"
        aria-labelledby="open-roles-heading"
        className="mx-auto mt-10 max-w-6xl px-4 sm:px-6"
      >
        <div className="flex flex-wrap items-baseline justify-between gap-2">
          <h2 id="open-roles-heading" className="text-xl font-semibold text-slate-900">
            {hasFilters ? "Search results" : "Open roles"}
          </h2>
          <p className="text-sm text-slate-600" aria-live="polite">
            {jobs.length === 1 ? "1 role" : `${jobs.length} roles`}
            {search.q && <> matching &ldquo;{search.q}&rdquo;</>}
            {search.type && <> · {EMPLOYMENT_TYPE_LABELS[search.type]}</>}
          </p>
        </div>

        {jobs.length > 0 ? (
          <ul className="mt-5 grid gap-4 md:grid-cols-2">
            {jobs.map((job) => (
              <li key={job.id} className="flex">
                <JobCard job={job} daysLeft={daysUntilDate(job.closingDate, now, timeZone)} />
              </li>
            ))}
          </ul>
        ) : hasFilters ? (
          <EmptyState
            className="mt-5"
            icon={SearchX}
            title="No roles match your search"
            description="Try a different job title or location, or clear the filters to see every open role."
            action={
              <Link href="/#open-roles" className={buttonVariants({ variant: "secondary" })}>
                Clear search
              </Link>
            }
          />
        ) : (
          <EmptyState
            className="mt-5"
            icon={Sparkles}
            title="No open roles right now"
            description="We post new roles regularly. Please check back soon."
          />
        )}
      </section>
    </>
  );
}
