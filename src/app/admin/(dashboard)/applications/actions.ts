"use server";

import { revalidatePath } from "next/cache";
import type { ApplicationStatus } from "@/generated/prisma/enums";
import { UNAUTHORIZED, UNEXPECTED_ERROR, type Result } from "@/lib/result";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { logger } from "@/server/logger";
import { decideApplication } from "@/server/services/applications";

/**
 * Accept or reject an application, with an optional note. The input is
 * untrusted: decideApplication validates the ID, allows only ACCEPTED or
 * REJECTED, and updates only that one record's decision fields.
 */
export async function decideApplicationAction(
  input: unknown,
): Promise<Result<{ status: ApplicationStatus }, string>> {
  const admin = await getCurrentAdmin();
  if (!admin) return UNAUTHORIZED;

  try {
    const result = await decideApplication(input);
    if (!result.ok) return result;
    logger.info("application_decision_recorded", { status: result.status, adminId: admin.id });
    // Refresh the detail page, lists and dashboard counts.
    revalidatePath("/admin", "layout");
    return { ok: true, status: result.status };
  } catch (error) {
    logger.error("application_decision_failed", error);
    return UNEXPECTED_ERROR;
  }
}
