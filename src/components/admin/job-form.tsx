"use client";

import { zodResolver } from "@hookform/resolvers/zod";
import Link from "next/link";
import { useEffect, useRef, useState, useTransition } from "react";
import { useForm, useWatch } from "react-hook-form";
import { createJobAction, updateJobAction } from "@/app/admin/(dashboard)/jobs/actions";
import { Alert } from "@/components/ui/alert";
import { Button, buttonVariants } from "@/components/ui/button";
import { Card, CardBody, CardHeader } from "@/components/ui/card";
import { describedBy, FormField, Input, Select, Textarea } from "@/components/ui/form-controls";
import { EmploymentType } from "@/generated/prisma/enums";
import { EMPLOYMENT_TYPE_LABELS } from "@/lib/constants";
import { jobFormSchema, type JobFormValues, type JobInput } from "@/lib/validation/job";

const FIELD_NAMES = [
  "title",
  "location",
  "employmentType",
  "summary",
  "description",
  "responsibilities",
  "requirements",
  "closingDate",
] as const;
type FieldName = (typeof FIELD_NAMES)[number];

function isFieldName(value: string): value is FieldName {
  return (FIELD_NAMES as readonly string[]).includes(value);
}

const EMPTY_VALUES: JobFormValues = {
  title: "",
  location: "",
  employmentType: "FULL_TIME",
  summary: "",
  description: "",
  responsibilities: "",
  requirements: "",
  closingDate: "",
};

type JobFormProps =
  | { mode: "create"; minClosingDate: string }
  | { mode: "edit"; jobId: string; defaultValues: JobFormValues; minClosingDate: string };

export function JobForm(props: JobFormProps) {
  const form = useForm<JobFormValues, unknown, JobInput>({
    resolver: zodResolver(jobFormSchema),
    mode: "onTouched",
    defaultValues: props.mode === "edit" ? props.defaultValues : EMPTY_VALUES,
  });
  const { errors } = form.formState;
  const [formError, setFormError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();
  const formErrorRef = useRef<HTMLDivElement>(null);
  const summaryLength = useWatch({ control: form.control, name: "summary" }).length;

  useEffect(() => {
    if (formError) formErrorRef.current?.focus();
  }, [formError]);

  function save(publish: boolean) {
    setFormError(null);
    // Send the raw form values; the server validates and parses them again.
    const values = form.getValues();
    startTransition(async () => {
      try {
        const result =
          props.mode === "create"
            ? await createJobAction(values, publish)
            : await updateJobAction(props.jobId, values);
        // On success the action redirects, so only failures arrive here.
        if (result?.ok === false) {
          for (const [field, message] of Object.entries(result.fieldErrors ?? {})) {
            if (message && isFieldName(field)) form.setError(field, { message });
          }
          setFormError(result.message);
        }
      } catch {
        setFormError("The job couldn't be saved. Check your connection and try again.");
      }
    });
  }

  function onSubmit(event: React.FormEvent<HTMLFormElement>) {
    // Which button submitted the form: "Save as draft" or "Publish job".
    const submitter = (event.nativeEvent as SubmitEvent).submitter;
    const publish = submitter?.getAttribute("value") === "publish";
    void form.handleSubmit(() => save(publish))(event);
  }

  const fieldProps = (name: FieldName, hint = false) => ({
    id: name,
    "aria-invalid": errors[name] ? true : undefined,
    "aria-describedby": describedBy(name, { hint, error: errors[name] }),
    ...form.register(name),
  });

  return (
    <form onSubmit={onSubmit} noValidate className="space-y-6">
      {formError && (
        <Alert ref={formErrorRef} tabIndex={-1} tone="error" title="The job wasn't saved">
          {formError}
        </Alert>
      )}

      <fieldset disabled={isPending} className="space-y-6">
        <legend className="sr-only">Job details</legend>
        <Card>
          <CardHeader title="Basics" description="Shown on job cards and at the top of the job page." />
          <CardBody className="grid gap-5 sm:grid-cols-2">
            <div className="sm:col-span-2">
              <FormField id="title" label="Job title" required error={errors.title?.message}>
                <Input maxLength={120} {...fieldProps("title")} />
              </FormField>
            </div>
            <FormField
              id="location"
              label="Location"
              required
              hint='For example "Kigali, Rwanda (Hybrid)"'
              error={errors.location?.message}
            >
              <Input maxLength={120} {...fieldProps("location", true)} />
            </FormField>
            <FormField
              id="employmentType"
              label="Employment type"
              required
              error={errors.employmentType?.message}
            >
              <Select {...fieldProps("employmentType")}>
                {Object.values(EmploymentType).map((type) => (
                  <option key={type} value={type}>
                    {EMPLOYMENT_TYPE_LABELS[type]}
                  </option>
                ))}
              </Select>
            </FormField>
            <FormField
              id="closingDate"
              label="Closing date"
              required
              hint="Applications are accepted until the end of this day (Kigali time)."
              error={errors.closingDate?.message}
            >
              <Input type="date" min={props.minClosingDate} {...fieldProps("closingDate", true)} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Description" />
          <CardBody className="space-y-5">
            <FormField
              id="summary"
              label="Summary"
              required
              hint="One or two sentences shown on the job card."
              error={errors.summary?.message}
              aside={
                <span className="text-xs text-slate-500" aria-hidden="true">
                  {summaryLength}/300
                </span>
              }
            >
              <Textarea rows={2} maxLength={300} className="min-h-0" {...fieldProps("summary", true)} />
            </FormField>
            <FormField
              id="description"
              label="Full description"
              required
              hint="Leave a blank line between paragraphs."
              error={errors.description?.message}
            >
              <Textarea rows={8} maxLength={10000} {...fieldProps("description", true)} />
            </FormField>
          </CardBody>
        </Card>

        <Card>
          <CardHeader title="Responsibilities and requirements" description="Write one item per line." />
          <CardBody className="grid gap-5 md:grid-cols-2">
            <FormField
              id="responsibilities"
              label="Responsibilities"
              required
              error={errors.responsibilities?.message}
            >
              <Textarea rows={7} {...fieldProps("responsibilities")} />
            </FormField>
            <FormField id="requirements" label="Requirements" required error={errors.requirements?.message}>
              <Textarea rows={7} {...fieldProps("requirements")} />
            </FormField>
          </CardBody>
        </Card>
      </fieldset>

      <div className="flex flex-col-reverse gap-3 sm:flex-row sm:justify-end">
        <Link href="/admin/jobs" className={buttonVariants({ variant: "ghost" })}>
          Cancel
        </Link>
        {props.mode === "create" ? (
          <>
            <Button type="submit" name="intent" value="draft" variant="secondary" disabled={isPending}>
              Save as draft
            </Button>
            <Button type="submit" name="intent" value="publish" pending={isPending}>
              Publish job
            </Button>
          </>
        ) : (
          <Button type="submit" pending={isPending}>
            Save changes
          </Button>
        )}
      </div>
    </form>
  );
}
