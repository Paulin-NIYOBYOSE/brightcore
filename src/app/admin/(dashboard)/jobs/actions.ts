"use server";

import { revalidatePath } from "next/cache";
import { redirect } from "next/navigation";
import type { JobStatus } from "@/generated/prisma/enums";
import { UNAUTHORIZED, UNEXPECTED_ERROR, type Failure, type Result } from "@/lib/result";
import { getCurrentAdmin } from "@/server/auth/current-admin";
import { logger } from "@/server/logger";
import { changeJobStatus, createJob, updateJob } from "@/server/services/jobs";

// Every action authenticates the administrator itself. Inputs are typed as
// `unknown` because anyone can POST to a server action; the services validate them.

/** Creates a job as a draft or published. Redirects on success, otherwise returns the failure. */
export async function createJobAction(values: unknown, publish: unknown): Promise<Failure> {
  const admin = await getCurrentAdmin();
  if (!admin) return UNAUTHORIZED;

  const shouldPublish = publish === true;
  let result;
  try {
    result = await createJob(values, { publish: shouldPublish });
  } catch (error) {
    logger.error("job_create_failed", error);
    return UNEXPECTED_ERROR;
  }
  if (!result.ok) return result;

  logger.info("job_created", { jobId: result.jobId, adminId: admin.id, published: shouldPublish });
  revalidatePath("/", "layout");
  redirect(`/admin/jobs?notice=${shouldPublish ? "published" : "draft-saved"}`);
}

/** Updates a job's content. Redirects on success, otherwise returns the failure. */
export async function updateJobAction(jobId: unknown, values: unknown): Promise<Failure> {
  const admin = await getCurrentAdmin();
  if (!admin) return UNAUTHORIZED;

  let result;
  try {
    result = await updateJob(jobId, values);
  } catch (error) {
    logger.error("job_update_failed", error);
    return UNEXPECTED_ERROR;
  }
  if (!result.ok) return result;

  logger.info("job_updated", { jobId: result.jobId, adminId: admin.id });
  revalidatePath("/", "layout");
  redirect("/admin/jobs?notice=updated");
}

/** Publish, close or reopen a job. Closing never deletes applications. */
export async function changeJobStatusAction(
  jobId: unknown,
  action: unknown,
): Promise<Result<{ status: JobStatus }, string>> {
  const admin = await getCurrentAdmin();
  if (!admin) return UNAUTHORIZED;

  try {
    const result = await changeJobStatus(jobId, action);
    if (result.ok) {
      logger.info("job_status_changed", { jobId: String(jobId), status: result.status, adminId: admin.id });
      revalidatePath("/", "layout");
    }
    return result;
  } catch (error) {
    logger.error("job_status_change_failed", error);
    return UNEXPECTED_ERROR;
  }
}
