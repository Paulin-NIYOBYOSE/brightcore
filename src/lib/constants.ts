import type {
  ApplicationStatus,
  EmploymentType,
  JobStatus,
} from "@/generated/prisma/enums";

export const APP_NAME = "BrightCore Careers";

/** CVs must be PDFs no larger than this. Enforced in the browser and on the server. */
export const MAX_CV_BYTES = 5 * 1024 * 1024;
export const MAX_CV_SIZE_LABEL = "5 MB";

export const EMPLOYMENT_TYPE_LABELS: Record<EmploymentType, string> = {
  FULL_TIME: "Full-time",
  PART_TIME: "Part-time",
  CONTRACT: "Contract",
  INTERNSHIP: "Internship",
};

export const JOB_STATUS_LABELS: Record<JobStatus, string> = {
  DRAFT: "Draft",
  OPEN: "Open",
  CLOSED: "Closed",
};

export const APPLICATION_STATUS_LABELS: Record<ApplicationStatus, string> = {
  PENDING: "Pending",
  ACCEPTED: "Accepted",
  REJECTED: "Rejected",
};

export const APPLICATIONS_PAGE_SIZE = 20;
