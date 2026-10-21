import { z } from "zod";
import { EmploymentType } from "@/generated/prisma/enums";
import { isValidDateKey } from "@/lib/dates";

const MAX_BULLETS = 15;
const MAX_BULLET_LENGTH = 300;

/**
 * Responsibilities and requirements are edited as one bullet per line and
 * stored as a string array. Leading "-", "*" or "•" markers are removed.
 */
function bulletListSchema(label: string) {
  return z
    .string()
    .max(MAX_BULLETS * (MAX_BULLET_LENGTH + 4), `Too many ${label}`)
    .transform((text) =>
      text
        .split(/\r?\n/)
        .map((line) => line.replace(/^\s*[-*•]\s*/, "").trim())
        .filter((line) => line.length > 0),
    )
    .pipe(
      z
        .array(z.string().max(MAX_BULLET_LENGTH, `Keep each line under ${MAX_BULLET_LENGTH} characters`))
        .min(1, `Add at least one ${label.replace(/s$/, "")}`)
        .max(MAX_BULLETS, `Add no more than ${MAX_BULLETS} ${label}`),
    );
}

export const closingDateSchema = z
  .string()
  .trim()
  .refine(isValidDateKey, "Choose a valid closing date");

/**
 * The job form payload. `strictObject` rejects unexpected keys such as
 * `status` or `id`, so a manipulated request cannot set fields the form does
 * not offer (mass assignment).
 */
export const jobFormSchema = z.strictObject({
  title: z.string().trim().min(3, "Enter a job title").max(120, "Use 120 characters or fewer"),
  location: z.string().trim().min(2, "Enter a location").max(120, "Use 120 characters or fewer"),
  employmentType: z.enum(EmploymentType, "Choose an employment type"),
  summary: z
    .string()
    .trim()
    .min(20, "Write a summary of at least 20 characters")
    .max(300, "Keep the summary to 300 characters or fewer"),
  description: z
    .string()
    .trim()
    .min(50, "Write a description of at least 50 characters")
    .max(10000, "Keep the description to 10,000 characters or fewer"),
  responsibilities: bulletListSchema("responsibilities"),
  requirements: bulletListSchema("requirements"),
  closingDate: closingDateSchema,
});

/** What the form holds (raw strings), and what the server stores after parsing. */
export type JobFormValues = z.input<typeof jobFormSchema>;
export type JobInput = z.output<typeof jobFormSchema>;

/** Public search query string. Anything invalid falls back to "no filter". */
export const jobSearchSchema = z.object({
  q: z.string().trim().max(100).catch(""),
  type: z.enum(EmploymentType).optional().catch(undefined),
});

export type JobSearch = z.infer<typeof jobSearchSchema>;

export const jobStatusActionSchema = z.enum(["publish", "close", "reopen"]);
export type JobStatusAction = z.infer<typeof jobStatusActionSchema>;
