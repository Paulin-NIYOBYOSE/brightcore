import { Search } from "lucide-react";
import Link from "next/link";
import { Button } from "@/components/ui/button";
import { Input, Select } from "@/components/ui/form-controls";
import { EmploymentType } from "@/generated/prisma/enums";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import type { JobSearch } from "@/lib/validation/job";

/** A plain GET form: works without JavaScript and keeps searches shareable as URLs. */
export function JobSearchForm({ search }: { search: JobSearch }) {
  const hasFilters = Boolean(search.q || search.type);
  return (
    <form
      action="/"
      method="get"
      role="search"
      aria-label="Search open roles"
      className="grid gap-3 rounded-xl border border-slate-200 bg-white p-4 shadow-md sm:grid-cols-[1fr_200px_auto] sm:items-end"
    >
      <div className="space-y-1.5">
        <label htmlFor="q" className="block text-sm font-medium text-slate-800">
          Job title or location
        </label>
        <div className="relative">
          <Search
            className="pointer-events-none absolute top-1/2 left-3 size-4 -translate-y-1/2 text-slate-400"
            aria-hidden="true"
          />
          <Input
            id="q"
            name="q"
            type="search"
            defaultValue={search.q}
            maxLength={100}
            placeholder="e.g. Engineer or Kigali"
            className="pl-9"
          />
        </div>
      </div>
      <div className="space-y-1.5">
        <label htmlFor="type" className="block text-sm font-medium text-slate-800">
          Employment type
        </label>
        <Select id="type" name="type" defaultValue={search.type ?? ""}>
          <option value="">All types</option>
          {Object.values(EmploymentType).map((type) => (
            <option key={type} value={type}>
              {EMPLOYMENT_TYPE_LABELS[type]}
            </option>
          ))}
        </Select>
      </div>
      <div className="flex gap-2">
        <Button type="submit" className="flex-1 sm:flex-none">
          <Search aria-hidden="true" />
          Search
        </Button>
        {hasFilters && (
          <Link
            href="/#open-roles"
            className="inline-flex h-10 items-center rounded-lg px-3 text-sm font-medium text-slate-700 hover:bg-slate-100"
          >
            Clear
          </Link>
        )}
      </div>
    </form>
  );
}
