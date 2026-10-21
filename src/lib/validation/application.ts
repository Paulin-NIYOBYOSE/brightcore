import { z } from "zod";
import { MAX_CV_BYTES, MAX_CV_SIZE_LABEL } from "@/lib/constants";
import { emailSchema } from "@/lib/validation/common";

/**
 * Candidate application fields. Shared by the browser form (instant feedback)
 * and the server action (the authority). The CV file is validated separately
 * because files need byte-level checks on the server.
 */
export const applicationFieldsSchema = z.object({
  fullName: z
    .string()
    .trim()
    .min(2, "Enter your full name")
    .max(120, "Use 120 characters or fewer"),
  email: emailSchema,
  phone: z
    .string()
    .trim()
    .min(1, "Enter your phone number")
    .max(32, "Use 32 characters or fewer")
    .regex(/^\+?[\d\s().-]+$/, "Use digits, spaces and an optional leading +")
    .refine((value) => {
      const digits = value.replace(/\D/g, "").length;
      return digits >= 7 && digits <= 15;
    }, "Enter a valid phone number, e.g. +250 788 123 456")
    .transform((value) => value.replace(/\s+/g, " ")),
  coverNote: z
    .string()
    .trim()
    .min(20, "Write at least 20 characters about why you're a good fit")
    .max(2000, "Keep your cover note to 2,000 characters or fewer"),
});

export type ApplicationFieldsInput = z.input<typeof applicationFieldsSchema>;
export type ApplicationFields = z.output<typeof applicationFieldsSchema>;

export const COVER_NOTE_MAX_LENGTH = 2000;

/**
 * Quick browser-side check of the chosen file. This is only for fast feedback:
 * the server re-checks size and inspects the actual bytes.
 */
export function checkCvFileInBrowser(file: { name: string; size: number; type: string }):
  | string
  | null {
  const looksLikePdf = file.type === "application/pdf" || /\.pdf$/i.test(file.name);
  if (!looksLikePdf) return "Upload your CV as a PDF file";
  if (file.size === 0) return "This file is empty. Choose another PDF";
  if (file.size > MAX_CV_BYTES) return `Your CV must be ${MAX_CV_SIZE_LABEL} or smaller`;
  return null;
}
