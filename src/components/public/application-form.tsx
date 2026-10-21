"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import { CheckCircle2 } from "lucide-react";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm } from "react-hook-form";
import { submitApplicationAction } from "@/app/(public)/jobs/[jobId]/apply/actions";
import { CvUploadField } from "@/components/public/cv-upload-field";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { describedBy, FormField, Input, Textarea } from "@/components/ui/form-controls";
import {
  applicationFieldsSchema,
  checkCvFileInBrowser,
  COVER_NOTE_MAX_LENGTH,
  type ApplicationFields,
  type ApplicationFieldsInput,
} from "@/lib/validation/application";

const FIELD_NAMES = ["fullName", "email", "phone", "coverNote"] as const;
type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(value);
}

type Submitted = { reference: string; firstName: string; email: string };

export function ApplicationForm({ jobId, jobTitle }: { jobId: string; jobTitle: string }) {
  const form = useForm<ApplicationFieldsInput, unknown, ApplicationFields>({
    resolver: zodResolver(applicationFieldsSchema),
    mode: "onTouched",
    defaultValues: { fullName: "", email: "", phone: "", coverNote: "" },
  });
  const { errors } = form.formState;

  const [cvFile, setCvFile] = useState<File | null>(null);
  const [cvError, setCvError] = useState<string>();
  const [formError, setFormError] = useState<string | null>(null);
  const [submitted, setSubmitted] = useState<Submitted | null>(null);
  const [isPending, startTransition] = useTransition();

  const cvInputRef = useRef<HTMLInputElement>(null);
  const formErrorRef = useRef<HTMLDivElement>(null);
  const successHeadingRef = useRef<HTMLHeadingElement>(null);
  const coverNoteLength = form.watch("coverNote").length;

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  useEffect(() => {
    if (submitted) successHeadingRef.current?.focus();
  }, [submitted]);

  function selectCv(file: File) {
    const problem = checkCvFileInBrowser(file);
    if (problem) {
      setCvError(problem);
      return;
    }
    setCvFile(file);
    setCvError(undefined);
  }

  /** The CV must be present and look like a small PDF before we send anything. */
  function validateCv(): File | null {
    const problem = cvFile ? checkCvFileInBrowser(cvFile) : "Attach your CV as a PDF file";
    setCvError(problem ?? undefined);
    return problem ? null : cvFile;
  }

  const onSubmit = form.handleSubmit(
    (values) => {
      setFormError(null);
      const cv = validateCv();
      if (!cv) {
        cvInputRef.current?.focus();
        return;
      }

      const data = new FormData();
      data.set("jobId", jobId);
      for (const name of FIELD_NAMES) data.set(name, values[name]);
      data.set("cv", cv);

      startTransition(async () => {
        try {
          const result = await submitApplicationAction(data);
          if (result.ok) {
            setSubmitted({
              reference: result.reference,
              firstName: values.fullName.split(" ")[0],
              email: values.email,
            });
            return;
          }
          for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
            if (!message) continue;
            if (field === "cv") setCvError(message);
            else if (isFieldName(field)) form.setError(field, { message });
          }
          setFormError(result.message);
        } catch {
          // Network failure, or the request was rejected before reaching our code.
          setFormError(
            "We couldn't send your application. Check your internet connection and make sure your CV is a PDF under 5 MB, then try again.",
          );
        }
      });
    },
    // Client validation failed: also flag a missing CV so every problem shows at once.
    () => validateCv(),
  );

  if (submitted) {
    return (
      <div className="py-4 text-center">
        <span className="mx-auto flex size-14 items-center justify-center rounded-full bg-emerald-50 text-emerald-700">
          <CheckCircle2 className="size-7" aria-hidden="true" />
        </span>
        <h2
          ref={successHeadingRef}
          tabIndex={-1}
          className="mt-4 text-xl font-semibold text-slate-900 focus:outline-none"
        >
          Application submitted
        </h2>
        <p className="mx-auto mt-2 max-w-md text-slate-600">
          Thank you, {submitted.firstName}. We&rsquo;ve received your application for{" "}
          <span className="font-medium text-slate-900">{jobTitle}</span>.
        </p>
        <dl className="mx-auto mt-6 max-w-xs rounded-lg border border-slate-200 bg-slate-50 px-4 py-3">
          <dt className="text-xs font-medium tracking-wide text-slate-500 uppercase">
            Your reference
          </dt>
          <dd className="mt-1 font-mono text-lg font-semibold text-navy-900">
            {submitted.reference}
          </dd>
        </dl>
        <p className="mx-auto mt-6 max-w-md text-sm leading-6 text-slate-600">
          Our recruitment team reviews every application. We&rsquo;ll contact you at{" "}
          <span className="font-medium text-slate-900">{submitted.email}</span> about next steps.
        </p>
        <Link href="/#open-roles" className={buttonVariants({ variant: "secondary", className: "mt-6" })}>
          Browse other roles
        </Link>
      </div>
    );
  }

  const fieldProps = (name: FieldName, hint = false) => ({
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(name, { hint, error: errors[name] }),
    ...form.register(name),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      <p className="text-sm text-slate-500">
        Fields marked <span className="text-rose-700">*</span> are required.
      </p>

      {formError && (
        <Alert ref={formErrorRef} tabIndex={-1} tone="error" title="Your application wasn't sent">
          {formError}
        </Alert>
      )}

      <fieldset disabled={isPending} className="space-y-6">
        <legend className="sr-only">Your details</legend>
        <div className="grid gap-6 sm:grid-cols-2">
          <FormField id="fullName" label="Full name" required error={errors.fullName?.message}>
            <Input autoComplete="name" maxLength={120} {...fieldProps("fullName")} />
          </FormField>
          <FormField id="email" label="Email address" required error={errors.email?.message}>
            <Input
              type="email"
              inputMode="email"
              autoComplete="email"
              maxLength={254}
              {...fieldProps("email")}
            />
          </FormField>
          <FormField
            id="phone"
            label="Phone number"
            required
            hint="Include your country code, e.g. +250 788 123 456"
            error={errors.phone?.message}
          >
            <Input type="tel" autoComplete="tel" maxLength={32} {...fieldProps("phone", true)} />
          </FormField>
        </div>

        <FormField
          id="coverNote"
          label="Cover note"
          required
          hint="A few sentences on why you're interested in this role and what you would bring."
          error={errors.coverNote?.message}
          aside={
            <span className="text-xs text-slate-500" aria-hidden="true">
              {coverNoteLength.toLocaleString()}/{COVER_NOTE_MAX_LENGTH.toLocaleString()}
            </span>
          }
        >
          <Textarea rows={6} maxLength={COVER_NOTE_MAX_LENGTH} {...fieldProps("coverNote", true)} />
        </FormField>

        <CvUploadField
          inputRef={cvInputRef}
          file={cvFile}
          error={cvError}
          disabled={isPending}
          onSelect={selectCv}
          onRemove={() => {
            setCvFile(null);
            setCvError(undefined);
          }}
        />
      </fieldset>

      <div className="flex flex-col gap-4 border-t border-slate-200 pt-6 sm:flex-row sm:items-center sm:justify-between">
        <p className="text-xs leading-5 text-slate-500 sm:max-w-sm">
          BrightCore uses these details only to assess your application.
        </p>
        <Button type="submit" size="lg" pending={isPending} className="w-full sm:w-auto">
          {isPending ? "Submitting application…" : "Submit application"}
        </Button>
      </div>
    </form>
  );
}
