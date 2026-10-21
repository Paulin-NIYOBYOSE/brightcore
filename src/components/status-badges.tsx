import {
  CalendarX2,
  CheckCircle2,
  CircleDot,
  Clock,
  Lock,
  PencilLine,
  XCircle,
  type LucideIcon,
} from "lucide-react";
import { Badge, type badgeVariants } from "@/components/ui/badge";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { APPLICATION_STATUS_LABELS } from "@/lib/constants";
import type { JobAvailability } from "@/lib/job-availability";
import type { VariantProps } from "class-variance-authority";

type Tone = VariantProps<typeof badgeVariants>["tone"];

// Each status has a distinct label and icon, not only a colour.
const applicationStatusStyles: Record<ApplicationStatus, { tone: Tone; icon: LucideIcon }> = {
  PENDING: { tone: "warning", icon: Clock },
  ACCEPTED: { tone: "success", icon: CheckCircle2 },
  REJECTED: { tone: "danger", icon: XCircle },
};

export function ApplicationStatusBadge({ status }: { status: ApplicationStatus }) {
  const { tone, icon: Icon } = applicationStatusStyles[status];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" />
      {APPLICATION_STATUS_LABELS[status]}
    </Badge>
  );
}

const availabilityStyles: Record<JobAvailability, { tone: Tone; icon: LucideIcon; label: string }> = {
  ACCEPTING: { tone: "success", icon: CircleDot, label: "Open" },
  EXPIRED: { tone: "warning", icon: CalendarX2, label: "Closing date passed" },
  CLOSED: { tone: "neutral", icon: Lock, label: "Closed" },
  DRAFT: { tone: "info", icon: PencilLine, label: "Draft" },
};

export function JobAvailabilityBadge({ availability }: { availability: JobAvailability }) {
  const { tone, icon: Icon, label } = availabilityStyles[availability];
  return (
    <Badge tone={tone}>
      <Icon aria-hidden="true" />
      {label}
    </Badge>
  );
}
