import { AlertCircle } from "lucide-react";
import { cn } from "@/lib/utils";

const controlBase =
  "block w-full rounded-lg border bg-white px-3 text-sm text-slate-900 shadow-sm transition-colors placeholder:text-slate-400 disabled:cursor-not-allowed disabled:bg-slate-50 aria-invalid:border-rose-500 aria-invalid:bg-rose-50/30";

export function Input({ className, ...props }: React.ComponentProps<"input">) {
  return (
    <input className={cn(controlBase, "h-10 border-slate-300", className)} {...props} />
  );
}

export function Textarea({ className, ...props }: React.ComponentProps<"textarea">) {
  return (
    <textarea
      className={cn(controlBase, "min-h-28 border-slate-300 py-2.5 leading-6", className)}
      {...props}
    />
  );
}

export function Select({ className, ...props }: React.ComponentProps<"select">) {
  return (
    <select
      className={cn(controlBase, "h-10 border-slate-300 pr-8", className)}
      {...props}
    />
  );
}

export function Label({ className, ...props }: React.ComponentProps<"label">) {
  return (
    <label className={cn("block text-sm font-medium text-slate-800", className)} {...props} />
  );
}

/** IDs for aria-describedby, so screen readers announce hints and errors with the field. */
export function describedBy(id: string, options: { hint?: boolean; error?: unknown }) {
  const ids = [options.hint ? `${id}-hint` : null, options.error ? `${id}-error` : null].filter(
    Boolean,
  );
  return ids.length > 0 ? ids.join(" ") : undefined;
}

type FormFieldProps = {
  id: string;
  label: string;
  hint?: React.ReactNode;
  error?: string;
  required?: boolean;
  /** Optional element shown on the right of the label row, e.g. a character count. */
  aside?: React.ReactNode;
  children: React.ReactNode;
};

export function FormField({ id, label, hint, error, required, aside, children }: FormFieldProps) {
  return (
    <div className="space-y-1.5">
      <div className="flex items-baseline justify-between gap-3">
        <Label htmlFor={id}>
          {label}
          {required ? (
            <span className="text-rose-700" aria-hidden="true">
              {" "}*
            </span>
          ) : (
            <span className="font-normal text-slate-500"> (optional)</span>
          )}
        </Label>
        {aside}
      </div>
      {children}
      {hint && (
        <p id={`${id}-hint`} className="text-sm text-slate-500">
          {hint}
        </p>
      )}
      <FieldError id={`${id}-error`} message={error} />
    </div>
  );
}

export function FieldError({ id, message }: { id: string; message?: string }) {
  if (!message) return null;
  return (
    <p id={id} className="flex items-start gap-1.5 text-sm text-rose-700">
      <AlertCircle className="mt-0.5 size-4 shrink-0" aria-hidden="true" />
      <span>{message}</span>
    </p>
  );
}
