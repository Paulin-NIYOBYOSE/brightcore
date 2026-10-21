import { z } from "zod";

/** Emails are compared and stored trimmed and lower-cased everywhere. */
export function normalizeEmail(email: string): string {
  return email.trim().toLowerCase();
}

export const emailSchema = z
  .string()
  .trim()
  .toLowerCase()
  .min(1, "Enter an email address")
  .max(254, "Use 254 characters or fewer")
  .pipe(z.email("Enter a valid email address, like name@example.com"));

/** Route and form identifiers. Validated before they ever reach a query. */
export const idSchema = z.uuid();

export function isValidId(value: unknown): value is string {
  return idSchema.safeParse(value).success;
}

/** Field name -> first error message, for rendering next to form fields. */
export type FieldErrors = Partial<Record<string, string>>;

export function firstFieldErrors(error: z.ZodError): FieldErrors {
  const result: FieldErrors = {};
  for (const issue of error.issues) {
    const field = String(issue.path[0] ?? "form");
    result[field] ??= issue.message;
  }
  return result;
}
