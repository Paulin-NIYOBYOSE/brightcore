import { MAX_CV_BYTES, MAX_CV_SIZE_LABEL } from "@/lib/constants";

export type CvProblem = "MISSING" | "EMPTY" | "TOO_LARGE" | "NOT_PDF";

export const CV_PROBLEM_MESSAGES: Record<CvProblem, string> = {
  MISSING: "Attach your CV as a PDF file",
  EMPTY: "This file is empty. Choose another PDF",
  TOO_LARGE: `Your CV must be ${MAX_CV_SIZE_LABEL} or smaller`,
  NOT_PDF: "This file is not a valid PDF. Export your CV as a PDF and try again",
};

/**
 * Checks the actual bytes of an uploaded CV. The file name, extension and
 * browser-reported MIME type are never trusted, because they are all chosen by
 * the client.
 *
 * - A PDF starts with the signature `%PDF-<major>.<minor>`.
 * - A complete PDF ends with an `%%EOF` marker (allowing a little trailing
 *   whitespace or padding), which catches truncated or disguised files.
 */
export function inspectPdf(bytes: Uint8Array): CvProblem | null {
  if (bytes.byteLength === 0) return "EMPTY";
  if (bytes.byteLength > MAX_CV_BYTES) return "TOO_LARGE";

  const header = Buffer.from(bytes.subarray(0, 8)).toString("latin1");
  if (!/^%PDF-[12]\.\d/.test(header)) return "NOT_PDF";

  const tail = Buffer.from(bytes.subarray(Math.max(0, bytes.byteLength - 1024))).toString("latin1");
  if (!tail.includes("%%EOF")) return "NOT_PDF";

  return null;
}
