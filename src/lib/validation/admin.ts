import { z } from "zod";
import { ApplicationStatus } from "@/generated/prisma/enums";
import { emailSchema, idSchema } from "@/lib/validation/common";

export const loginSchema = z.object({
  email: emailSchema,
  password: z.string().min(1, "Enter your password").max(256, "Password is too long"),
});

/**
 * An administrator decision. Only ACCEPTED or REJECTED can be requested:
 * PENDING is the starting state assigned by the system, never by a request.
 */
export const decisionSchema = z.strictObject({
  applicationId: idSchema,
  decision: z.enum(["ACCEPTED", "REJECTED"]),
  note: z
    .string()
    .trim()
    .max(1000, "Keep the note to 1,000 characters or fewer")
    .optional()
    .transform((note) => (note ? note : null)),
});

export type DecisionInput = z.input<typeof decisionSchema>;

/** Query-string filters on the applications list. Invalid values are ignored. */
export const applicationFiltersSchema = z.object({
  jobId: idSchema.optional().catch(undefined),
  status: z.enum(ApplicationStatus).optional().catch(undefined),
  page: z.coerce.number().int().min(1).max(10_000).catch(1),
});

export type ApplicationFilters = z.infer<typeof applicationFiltersSchema>;
