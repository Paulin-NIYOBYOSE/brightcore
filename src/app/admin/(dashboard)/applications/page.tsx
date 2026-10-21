import { ChevronLeft, ChevronRight, Filter, Inbox } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/admin-shell";
import { ApplicationStatusBadge } from "@/components/status-badges";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card } from "@/components/ui/card";
import { EmptyState } from "@/components/ui/empty-state";
import { Select } from "@/components/ui/form-controls";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { APPLICATION_STATUS_LABELS, APPLICATIONS_PAGE_SIZE } from "@/lib/constants";
import { formatDateTime } from "@/lib/dates";
import { cn } from "@/lib/utils";
import { applicationFiltersSchema, type ApplicationFilters } from "@/lib/validation/admin";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";
import { listApplications } from "@/server/services/applications";
import { listJobOptions } from "@/server/services/jobs";

export const metadata: Metadata = { title: "Applications" };

type Props = { searchParams: Promise<Record<string, string | string[] | undefined>> };

function pageHref(filters: ApplicationFilters, page: number): string {
  const params = new URLSearchParams();
  if (filters.jobId) params.set("jobId", filters.jobId);
  if (filters.status) params.set("status", filters.status);
  if (page > 1) params.set("page", String(page));
  const query = params.toString();
  return query ? `/admin/applications?${query}` : "/admin/applications";
}

export default async function ApplicationsPage({ searchParams }: Props) {
  await requireAdminPage();
  const filters = applicationFiltersSchema.parse(await searchParams);
  const [{ items, total, page, pageCount }, jobs] = await Promise.all([
    listApplications(filters),
    listJobOptions(),
  ]);
  const timeZone = getBusinessTimeZone();
  const hasFilters = Boolean(filters.jobId || filters.status);
  const selectedJob = jobs.find((job) => job.id === filters.jobId);
  const firstShown = total === 0 ? 0 : (page - 1) * APPLICATIONS_PAGE_SIZE + 1;
  const lastShown = Math.min(page * APPLICATIONS_PAGE_SIZE, total);

  return (
    <>
      <PageHeader
        title="Applications"
        description={selectedJob ? `Applications for ${selectedJob.title}` : "Review candidates and record decisions."}
      />

      <form
        method="get"
        action="/admin/applications"
        aria-label="Filter applications"
        className="mb-4 grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-sm sm:grid-cols-[minmax(0,1fr)_200px_auto] sm:items-end"
      >
        <div className="space-y-1.5">
          <label htmlFor="filter-job" className="block text-sm font-medium text-slate-800">
            Job
          </label>
          <Select id="filter-job" name="jobId" defaultValue={filters.jobId ?? ""}>
            <option value="">All jobs</option>
            {jobs.map((job) => (
              <option key={job.id} value={job.id}>
                {job.title}
                {job.status !== "OPEN" ? ` (${job.status.toLowerCase()})` : ""}
              </option>
            ))}
          </Select>
        </div>
        <div className="space-y-1.5">
          <label htmlFor="filter-status" className="block text-sm font-medium text-slate-800">
            Status
          </label>
          <Select id="filter-status" name="status" defaultValue={filters.status ?? ""}>
            <option value="">All statuses</option>
            {Object.values(ApplicationStatus).map((status) => (
              <option key={status} value={status}>
                {APPLICATION_STATUS_LABELS[status]}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex gap-2">
          <Button type="submit" variant="secondary" className="flex-1 sm:flex-none">
            <Filter aria-hidden="true" />
            Apply filters
          </Button>
          {hasFilters && (
            <Link href="/admin/applications" className={buttonVariants({ variant: "ghost" })}>
              Reset
            </Link>
          )}
        </div>
      </form>

      {items.length === 0 ? (
        <EmptyState
          icon={Inbox}
          title={hasFilters ? "No applications match these filters" : "No applications yet"}
          description={
            hasFilters
              ? "Try another job or status, or reset the filters."
              : "Applications submitted on the careers site will appear here."
          }
        />
      ) : (
        <Card className="overflow-hidden">
          <div className="relative overflow-x-auto">
            <table className="w-full min-w-[760px] text-sm">
              <caption className="sr-only">
                Applications, newest first. Showing {firstShown} to {lastShown} of {total}.
              </caption>
              <thead className="bg-slate-50 text-left text-xs font-medium tracking-wide text-slate-500 uppercase">
                <tr>
                  <th scope="col" className="px-5 py-3">Candidate</th>
                  <th scope="col" className="px-3 py-3">Phone</th>
                  <th scope="col" className="px-3 py-3">Job</th>
                  <th scope="col" className="px-3 py-3">Submitted</th>
                  <th scope="col" className="px-3 py-3">Status</th>
                  <th scope="col" className="px-5 py-3">
                    <span className="sr-only">Actions</span>
                  </th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-100">
                {items.map((application) => (
                  <tr key={application.id} className="hover:bg-slate-50/60">
                    <th scope="row" className="px-5 py-3 text-left font-normal">
                      <Link
                        href={`/admin/applications/${application.id}`}
                        className="font-medium text-slate-900 hover:text-blue-700 hover:underline"
                      >
                        {application.fullName}
                      </Link>
                      <p className="text-xs text-slate-500">{application.email}</p>
                    </th>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">{application.phone}</td>
                    <td className="px-3 py-3 text-slate-700">{application.job.title}</td>
                    <td className="px-3 py-3 whitespace-nowrap text-slate-700">
                      {formatDateTime(application.createdAt, timeZone)}
                    </td>
                    <td className="px-3 py-3">
                      <ApplicationStatusBadge status={application.status} />
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/admin/applications/${application.id}`}
                        className={buttonVariants({ variant: "secondary", size: "sm" })}
                      >
                        Review<span className="sr-only"> {application.fullName}</span>
                      </Link>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>

          <nav
            aria-label="Pagination"
            className="flex flex-wrap items-center justify-between gap-3 border-t border-slate-200 px-5 py-3 text-sm text-slate-600"
          >
            <p>
              Showing {firstShown}–{lastShown} of {total}
            </p>
            <div className="flex gap-2">
              <PageLink href={pageHref(filters, page - 1)} disabled={page <= 1} label="Previous">
                <ChevronLeft aria-hidden="true" />
              </PageLink>
              <PageLink href={pageHref(filters, page + 1)} disabled={page >= pageCount} label="Next">
                <ChevronRight aria-hidden="true" />
              </PageLink>
            </div>
          </nav>
        </Card>
      )}
    </>
  );
}

function PageLink({
  href,
  disabled,
  label,
  children,
}: {
  href: string;
  disabled: boolean;
  label: string;
  children: React.ReactNode;
}) {
  const className = cn(buttonVariants({ variant: "secondary", size: "sm" }), label === "Next" && "flex-row-reverse");
  if (disabled) {
    return (
      <span className={cn(className, "pointer-events-none opacity-50")} aria-disabled="true">
        {children}
        {label}
      </span>
    );
  }
  return (
    <Link href={href} className={className}>
      {children}
      {label}
    </Link>
  );
}
