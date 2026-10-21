"use client";

import { CheckCircle2, PencilLine, XCircle } from "lucide-react";
import { useState } from "react";
import { decideApplicationAction } from "@/app/admin/(dashboard)/applications/actions";
import { Button } from "@/components/ui/button";
import { ConfirmDialog } from "@/components/ui/confirm-dialog";
import { FormField, Textarea } from "@/components/ui/form-controls";
import type { ApplicationStatus } from "@/generated/prisma/enums";

type Decision = "ACCEPTED" | "REJECTED";

type Props = {
  applicationId: string;
  candidateName: string;
  status: ApplicationStatus;
  decisionNote: string | null;
};

/**
 * PENDING applications can be accepted or rejected. A decided application can
 * be switched to the other decision, or have its note edited. Every change is
 * confirmed in a dialog, where the optional note is written.
 */
export function DecisionPanel({ applicationId, candidateName, status, decisionNote }: Props) {
  const choices: Decision[] =
    status === "PENDING" ? ["ACCEPTED", "REJECTED"] : [status === "ACCEPTED" ? "REJECTED" : "ACCEPTED", status];

  return (
    <div className="grid gap-2">
      {choices.map((decision) => (
        <DecisionDialog
          key={decision}
          applicationId={applicationId}
          candidateName={candidateName}
          decision={decision}
          currentStatus={status}
          currentNote={decisionNote}
        />
      ))}
    </div>
  );
}

function DecisionDialog({
  applicationId,
  candidateName,
  decision,
  currentStatus,
  currentNote,
}: {
  applicationId: string;
  candidateName: string;
  decision: Decision;
  currentStatus: ApplicationStatus;
  currentNote: string | null;
}) {
  const [note, setNote] = useState(currentNote ?? "");
  const noteOnly = decision === currentStatus;
  const accept = decision === "ACCEPTED";
  const verb = accept ? "Accept" : "Reject";
  const Icon = noteOnly ? PencilLine : accept ? CheckCircle2 : XCircle;

  const label = noteOnly
    ? "Edit decision note"
    : currentStatus === "PENDING"
      ? verb
      : `Change to ${accept ? "accepted" : "rejected"}`;

  const noteFieldId = `decision-note-${decision.toLowerCase()}`;

  return (
    <ConfirmDialog
      trigger={(open) => (
        <Button
          variant={noteOnly ? "ghost" : currentStatus === "PENDING" ? (accept ? "success" : "danger") : "secondary"}
          className="w-full"
          onClick={open}
        >
          <Icon aria-hidden="true" />
          {label}
        </Button>
      )}
      title={noteOnly ? "Update the decision note" : `${verb} ${candidateName}'s application?`}
      description={
        noteOnly
          ? "The decision stays the same; only the note changes."
          : currentStatus === "PENDING"
            ? `The application will be marked as ${accept ? "accepted" : "rejected"}.`
            : `This replaces the current decision with "${accept ? "accepted" : "rejected"}".`
      }
      confirmLabel={noteOnly ? "Save note" : `${verb} application`}
      confirmVariant={noteOnly ? "primary" : accept ? "success" : "danger"}
      onConfirm={async () => {
        const result = await decideApplicationAction({ applicationId, decision, note });
        return result.ok ? null : result.message;
      }}
    >
      <FormField
        id={noteFieldId}
        label="Decision note"
        hint="Internal: visible to recruiters only. Up to 1,000 characters."
      >
        <Textarea
          id={noteFieldId}
          rows={4}
          maxLength={1000}
          value={note}
          onChange={(event) => setNote(event.target.value)}
          aria-describedby={`${noteFieldId}-hint`}
        />
      </FormField>
    </ConfirmDialog>
  );
}
