"use client";

import { FileText, Upload } from "lucide-react";
import { Button } from "@/components/ui/button";
import { describedBy, FieldError } from "@/components/ui/form-controls";
import { MAX_CV_SIZE_LABEL } from "@/lib/constants";
import { cn, formatBytes } from "@/lib/utils";

type CvUploadFieldProps = {
  file: File | null;
  error?: string;
  disabled?: boolean;
  inputRef: React.Ref<HTMLInputElement>;
  onSelect: (file: File) => void;
  onRemove: () => void;
};

const INPUT_ID = "cv";

/**
 * File picker for the CV. Shows the chosen file's name and size and lets the
 * candidate replace or remove it before submitting. The real <input> is
 * visually hidden but stays keyboard-focusable; its focus ring is drawn on the
 * visible box via `peer-focus-visible`.
 */
export function CvUploadField({
  file,
  error,
  disabled,
  inputRef,
  onSelect,
  onRemove,
}: CvUploadFieldProps) {
  const openPicker = () => {
    if (inputRef && typeof inputRef === "object") inputRef.current?.click();
  };

  return (
    <div className="space-y-1.5">
      <p className="text-sm font-medium text-slate-800">
        CV
        <span className="text-rose-700" aria-hidden="true">
          {" "}*
        </span>
      </p>
      <input
        ref={inputRef}
        id={INPUT_ID}
        name="cv"
        type="file"
        accept="application/pdf,.pdf"
        className="peer sr-only"
        disabled={disabled}
        aria-label={`CV (PDF, up to ${MAX_CV_SIZE_LABEL})`}
        aria-invalid={error ? true : undefined}
        aria-describedby={describedBy(INPUT_ID, { hint: true, error })}
        onChange={(event) => {
          const chosen = event.target.files?.[0];
          // Reset so choosing the same file again still triggers a change.
          event.target.value = "";
          if (chosen) onSelect(chosen);
        }}
      />

      {file ? (
        <div
          className={cn(
            "flex flex-wrap items-center gap-3 rounded-lg border bg-white p-3 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600 sm:flex-nowrap",
            error ? "border-rose-400" : "border-slate-300",
          )}
        >
          <span className="flex size-10 shrink-0 items-center justify-center rounded-md bg-rose-50 text-rose-700">
            <FileText className="size-5" aria-hidden="true" />
          </span>
          <div className="min-w-0 flex-1">
            <p className="truncate text-sm font-medium text-slate-900" title={file.name}>
              {file.name}
            </p>
            <p className="text-xs text-slate-500">PDF · {formatBytes(file.size)}</p>
          </div>
          <div className="flex gap-2">
            <Button variant="secondary" size="sm" onClick={openPicker} disabled={disabled}>
              Replace
            </Button>
            <Button variant="ghost" size="sm" onClick={onRemove} disabled={disabled}>
              Remove
            </Button>
          </div>
        </div>
      ) : (
        <label
          htmlFor={INPUT_ID}
          className={cn(
            "flex cursor-pointer flex-col items-center justify-center gap-2 rounded-lg border-2 border-dashed px-4 py-8 text-center transition-colors hover:border-navy-400 hover:bg-navy-50/50 peer-focus-visible:outline-2 peer-focus-visible:outline-offset-2 peer-focus-visible:outline-blue-600",
            error ? "border-rose-400 bg-rose-50/30" : "border-slate-300 bg-slate-50",
          )}
        >
          <Upload className="size-6 text-navy-600" aria-hidden="true" />
          <span className="text-sm font-medium text-navy-900">Choose a PDF to upload</span>
        </label>
      )}

      <p id={`${INPUT_ID}-hint`} className="text-sm text-slate-500">
        PDF only, up to {MAX_CV_SIZE_LABEL}.
      </p>
      <FieldError id={`${INPUT_ID}-error`} message={error} />
    </div>
  );
}
