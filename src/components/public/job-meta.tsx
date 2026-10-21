import { BriefcaseBusiness, CalendarDays, MapPin } from "lucide-react";
import type { EmploymentType } from "@/generated/prisma/enums";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { formatDateOnly } from "@/lib/dates";
import { cn } from "@/lib/utils";

export function JobMeta({
  location,
  employmentType,
  closingDate,
  className,
}: {
  location: string;
  employmentType: EmploymentType;
  closingDate?: Date;
  className?: string;
}) {
  return (
    <ul className={cn("flex flex-wrap gap-x-5 gap-y-1.5 text-sm text-slate-600", className)}>
      <li className="inline-flex items-center gap-1.5">
        <MapPin className="size-4 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Location: </span>
        {location}
      </li>
      <li className="inline-flex items-center gap-1.5">
        <BriefcaseBusiness className="size-4 text-slate-400" aria-hidden="true" />
        <span className="sr-only">Employment type: </span>
        {EMPLOYMENT_TYPE_LABELS[employmentType]}
      </li>
      {closingDate && (
        <li className="inline-flex items-center gap-1.5">
          <CalendarDays className="size-4 text-slate-400" aria-hidden="true" />
          Closes {formatDateOnly(closingDate)}
        </li>
      )}
    </ul>
  );
}

/** "Closes today", "Closes tomorrow" or "Closes in 5 days". */
export function closingCountdown(daysLeft: number): string {
  if (daysLeft <= 0) return "Closes today";
  if (daysLeft === 1) return "Closes tomorrow";
  return `Closes in ${daysLeft} days`;
}
