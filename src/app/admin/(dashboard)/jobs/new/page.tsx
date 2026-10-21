import { ArrowLeft } from "lucide-react";
import type { Metadata } from "next";
import Link from "next/link";
import { PageHeader } from "@/components/admin/admin-shell";
import { JobForm } from "@/components/admin/job-form";
import { calendarDateInTimeZone } from "@/lib/dates";
import { requireAdminPage } from "@/server/auth/current-admin";
import { getBusinessTimeZone } from "@/server/env";

export const metadata: Metadata = { title: "New job" };

export default async function NewJobPage() {
  await requireAdminPage();
  const today = calendarDateInTimeZone(new Date(), getBusinessTimeZone());

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
        title="New job"
        description="Save it as a draft to finish later, or publish it straight away."
      />
      <JobForm mode="create" minClosingDate={today} />
    </>
  );
}
