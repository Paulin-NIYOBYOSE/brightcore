"use client";

import { Lock, RotateCcw, Send } from "lucide-react";
import { changeJobStatusAction } from "@/app/admin/(dashboard)/jobs/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import type { JobStatus } from "@/generated/prisma/enums";
import type { JobStatusAction } from "@/lib/validation/job";

type Props = {
  jobId: string;
  jobTitle: string;
  status: JobStatus;
  applicationCount: number;
  size?: "sm" | "md";
};

/** The single status change available for the job's current status, behind a confirmation. */
export function JobStatusActions({ jobId, jobTitle, status, applicationCount, size = "sm" }: Props) {
  const config = configFor(status, jobTitle, applicationCount);

  return (
    <ConfirmDialog
      trigger={(open) => (
        <Button variant={config.triggerVariant} size={size} onClick={open}>
          <config.icon aria-hidden="true" />
          {config.label}
          <span className="sr-only">: {jobTitle}</span>
        </Button>
      )}
      title={config.title}
      description={config.description}
      confirmLabel={config.label}
      confirmVariant={config.confirmVariant}
      onConfirm={async () => {
        const result = await changeJobStatusAction(jobId, config.action);
        return result.ok ? null : result.message;
      }}
    />
  );
}

function configFor(status: JobStatus, jobTitle: string, applicationCount: number) {
  const applications =
    applicationCount === 1 ? "The existing application" : `All ${applicationCount} existing applications`;

  const configs = {
    DRAFT: {
      action: "publish",
      label: "Publish",
      icon: Send,
      title: "Publish this job?",
      description: `"${jobTitle}" will appear on the careers site and candidates can apply until its closing date.`,
      triggerVariant: "primary",
      confirmVariant: "primary",
    },
    OPEN: {
      action: "close",
      label: "Close job",
      icon: Lock,
      title: "Close this job?",
      description: `Candidates will no longer be able to apply for "${jobTitle}". ${
        applicationCount > 0 ? `${applications} will be kept and stay available to review.` : ""
      }`,
      triggerVariant: "secondary",
      confirmVariant: "danger",
    },
    CLOSED: {
      action: "reopen",
      label: "Reopen",
      icon: RotateCcw,
      title: "Reopen this job?",
      description: `"${jobTitle}" will accept applications again until its closing date.`,
      triggerVariant: "secondary",
      confirmVariant: "primary",
    },
  } as const satisfies Record<
    JobStatus,
    {
      action: JobStatusAction;
      label: string;
      icon: typeof Send;
      title: string;
      description: string;
      triggerVariant: "primary" | "secondary";
      confirmVariant: "primary" | "danger";
    }
  >;

  return configs[status];
}
