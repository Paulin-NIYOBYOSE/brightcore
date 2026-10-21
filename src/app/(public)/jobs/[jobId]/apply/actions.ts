"use server";

import { formText } from "@/lib/form-data";
import { UNEXPECTED_ERROR, type Failure } from "@/lib/result";
import { applicationReference } from "@/lib/utils";
import { logger } from "@/server/logger";
import { submitApplication } from "@/server/services/applications";

export type SubmitApplicationActionResult = { ok: true; reference: string } | Failure;

/**
 * Public entry point for candidate applications (no sign-in required).
 * Every rule is enforced by submitApplication on the server; the browser's
 * checks are only for faster feedback. Unexpected errors are logged and the
 * candidate sees a generic message without internal details.
 */
export async function submitApplicationAction(
  formData: FormData,
): Promise<SubmitApplicationActionResult> {
  try {
    const cvEntry = formData.get("cv");
    const cv =
      cvEntry instanceof File && (cvEntry.size > 0 || cvEntry.name !== "")
        ? { bytes: new Uint8Array(await cvEntry.arrayBuffer()), filename: cvEntry.name }
        : null;

    const result = await submitApplication({
      jobId: formText(formData, "jobId"),
      fields: {
        fullName: formText(formData, "fullName"),
        email: formText(formData, "email"),
        phone: formText(formData, "phone"),
        coverNote: formText(formData, "coverNote"),
      },
      cv,
    });

    if (!result.ok) return result;
    return { ok: true, reference: applicationReference(result.applicationId) };
  } catch (error) {
    logger.error("application_submit_failed", error);
    return UNEXPECTED_ERROR;
  }
}
