"use client";

import { useEffect, useId, useRef, useState, useTransition } from "react";
import { Alert } from "@/components/ui/alert";
import { Button } from "@/components/ui/button";

type ConfirmDialogProps = {
  /** Renders the element that opens the dialog. */
  trigger: (open: () => void) => React.ReactNode;
  title: string;
  description?: React.ReactNode;
  /** Extra content, such as a note field. */
  children?: React.ReactNode;
  confirmLabel: string;
  confirmVariant?: "primary" | "success" | "danger";
  /** Performs the action. Return an error message to keep the dialog open, or null when done. */
  onConfirm: () => Promise<string | null>;
};

/**
 * Asks for confirmation before a consequential action. Uses the native
 * <dialog> element, which traps focus, closes on Escape and restores focus to
 * the trigger when it closes.
 */
export function ConfirmDialog({
  trigger,
  title,
  description,
  children,
  confirmLabel,
  confirmVariant = "primary",
  onConfirm,
}: ConfirmDialogProps) {
  const dialogRef = useRef<HTMLDialogElement>(null);
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const titleId = useId();
  const descriptionId = useId();

  // Keep the native dialog in sync with React state.
  useEffect(() => {
    const dialog = dialogRef.current;
    if (!dialog) return;
    if (isOpen && !dialog.open) dialog.showModal();
    if (!isOpen && dialog.open) dialog.close();
  }, [isOpen]);

  function open() {
    setError(null);
    setIsOpen(true);
  }

  function close() {
    if (!isPending) setIsOpen(false);
  }

  function confirm() {
    startTransition(async () => {
      try {
        const message = await onConfirm();
        if (message) setError(message);
        else setIsOpen(false);
      } catch {
        setError("Something went wrong. Please try again.");
      }
    });
  }

  return (
    <>
      {trigger(open)}
      <dialog
        ref={dialogRef}
        aria-labelledby={titleId}
        aria-describedby={description ? descriptionId : undefined}
        onCancel={(event) => {
          // Escape key: let React state drive the close, and never mid-request.
          event.preventDefault();
          close();
        }}
        onClick={(event) => {
          // A click on the backdrop targets the dialog element itself.
          if (event.target === event.currentTarget) close();
        }}
        className="m-auto max-h-[calc(100dvh-2rem)] w-[calc(100%-2rem)] max-w-md overflow-y-auto rounded-xl border border-slate-200 bg-white p-0 text-slate-900 shadow-xl backdrop:bg-slate-950/50"
      >
        <div className="p-6">
          <h2 id={titleId} className="text-lg font-semibold">
            {title}
          </h2>
          {description && (
            <div id={descriptionId} className="mt-2 text-sm leading-6 text-slate-600">
              {description}
            </div>
          )}
          {children && <div className="mt-4">{children}</div>}
          {error && (
            <Alert tone="error" className="mt-4">
              {error}
            </Alert>
          )}
        </div>
        <div className="flex flex-col-reverse gap-2 border-t border-slate-200 bg-slate-50 px-6 py-4 sm:flex-row sm:justify-end">
          <Button variant="secondary" onClick={close} disabled={isPending}>
            Cancel
          </Button>
          <Button variant={confirmVariant} onClick={confirm} pending={isPending}>
            {confirmLabel}
          </Button>
        </div>
      </dialog>
    </>
  );
}
