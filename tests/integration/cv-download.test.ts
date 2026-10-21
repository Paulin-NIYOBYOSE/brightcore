import { describe, expect, it } from "vitest";
import { GET } from "@/app/api/admin/applications/[applicationId]/cv/route";
import { SESSION_COOKIE_NAME } from "@/server/auth/constants";
import { submitApplication } from "@/server/services/applications";
import { getCvStorage } from "@/server/storage/cv-storage";
import { prisma } from "@/server/db";
import { applicationFields, createJob, NOW, signInAsAdmin, validPdf } from "../support/factories";
import { requestContext } from "../support/request-context";

async function seedApplicationWithCv() {
  const job = await createJob();
  const pdf = validPdf("Private CV contents");
  const result = await submitApplication(
    { jobId: job.id, fields: applicationFields(), cv: { bytes: pdf, filename: "Jane Mukamana CV.pdf" } },
    { now: NOW },
  );
  if (!result.ok) throw new Error(`Could not create application: ${result.code}`);
  return { applicationId: result.applicationId, pdf };
}

function download(applicationId: string) {
  return GET(new Request(`http://localhost/api/admin/applications/${applicationId}/cv`), {
    params: Promise.resolve({ applicationId }),
  });
}

describe("GET /api/admin/applications/:id/cv", () => {
  it("returns 401 and no file contents without a session", async () => {
    const { applicationId } = await seedApplicationWithCv();

    const response = await download(applicationId);

    expect(response.status).toBe(401);
    expect(response.headers.get("content-type")).toContain("application/json");
    expect(await response.text()).not.toContain("%PDF");
  });

  it("returns 401 for a forged session token", async () => {
    const { applicationId } = await seedApplicationWithCv();
    requestContext.setCookie(SESSION_COOKIE_NAME, "not-a-real-session");

    expect((await download(applicationId)).status).toBe(401);
  });

  it("sends the CV as a private attachment to a signed-in administrator", async () => {
    const { applicationId, pdf } = await seedApplicationWithCv();
    await signInAsAdmin();

    const response = await download(applicationId);

    expect(response.status).toBe(200);
    expect(response.headers.get("content-type")).toBe("application/pdf");
    expect(response.headers.get("content-disposition")).toMatch(/^attachment; filename="Jane Mukamana CV\.pdf"/);
    expect(response.headers.get("cache-control")).toBe("private, no-store");
    expect(response.headers.get("x-content-type-options")).toBe("nosniff");
    expect(new Uint8Array(await response.arrayBuffer())).toEqual(pdf);
  });

  it("returns 404 for unknown or malformed IDs and for missing files", async () => {
    const { applicationId } = await seedApplicationWithCv();
    await signInAsAdmin();

    expect((await download("6f1c2a4e-8b3d-4c5a-9e7f-000000000000")).status).toBe(404);
    expect((await download("../../../etc/passwd")).status).toBe(404);

    const { cvStorageKey } = await prisma.application.findUniqueOrThrow({ where: { id: applicationId } });
    await getCvStorage().remove(cvStorageKey);
    expect((await download(applicationId)).status).toBe(404);
  });
});
