import { getCurrentAdmin } from "@/server/auth/current-admin";
import { logger } from "@/server/logger";
import { getApplicationCv } from "@/server/services/applications";
import { attachmentContentDisposition } from "@/server/storage/filenames";

function errorResponse(status: number, message: string) {
  return Response.json(
    { error: message },
    { status, headers: { "Cache-Control": "no-store" } },
  );
}

/**
 * Authenticated CV download. The URL only carries the application ID; the
 * file location comes from the database and is resolved inside the private
 * storage directory. CVs are never served from a public URL.
 */
export async function GET(
  _request: Request,
  { params }: { params: Promise<{ applicationId: string }> },
) {
  const admin = await getCurrentAdmin();
  if (!admin) return errorResponse(401, "Authentication required.");

  const { applicationId } = await params;
  try {
    const cv = await getApplicationCv(applicationId);
    if (!cv) return errorResponse(404, "CV not found.");

    logger.info("cv_downloaded", { applicationId, adminId: admin.id });
    return new Response(new Uint8Array(cv.bytes), {
      status: 200,
      headers: {
        "Content-Type": "application/pdf",
        "Content-Length": String(cv.bytes.byteLength),
        // Always download, never render inline, with a sanitised file name.
        "Content-Disposition": attachmentContentDisposition(cv.filename),
        "Cache-Control": "private, no-store",
        "X-Content-Type-Options": "nosniff",
        "Content-Security-Policy": "default-src 'none'; sandbox",
      },
    });
  } catch (error) {
    logger.error("cv_download_failed", error, { applicationId });
    return errorResponse(500, "The CV could not be retrieved.");
  }
}
