import { readdir, rm } from "node:fs/promises";
import path from "node:path";
import { afterAll, beforeEach, vi } from "vitest";
import { prisma } from "@/server/db";
import { requestContext } from "./request-context";

// Next.js request APIs only work inside a real request. Server actions and
// route handlers are called directly in tests, so these modules are replaced
// with versions backed by the test request context.
vi.mock("next/headers", async () => {
  const { requestContext } = await import("./request-context");
  return {
    cookies: async () => requestContext.cookies(),
    headers: async () => requestContext.headers(),
  };
});

vi.mock("next/cache", () => ({
  revalidatePath: vi.fn(),
  revalidateTag: vi.fn(),
}));

vi.mock("next/navigation", async () => {
  const { RedirectSignal } = await import("./request-context");
  return {
    redirect: (url: string) => {
      throw new RedirectSignal(url);
    },
    notFound: () => {
      throw new Error("NEXT_NOT_FOUND");
    },
  };
});

beforeEach(async () => {
  requestContext.reset();
  // Start every test from an empty database and an empty CV directory.
  await prisma.$executeRawUnsafe(
    'TRUNCATE TABLE "Application", "Job", "AdminSession", "AdminUser" CASCADE',
  );
  const storageDir = process.env.CV_STORAGE_DIR!;
  const files = await readdir(storageDir).catch(() => []);
  await Promise.all(files.map((file) => rm(path.join(storageDir, file), { force: true })));
});

afterAll(async () => {
  await prisma.$disconnect();
  await rm(process.env.CV_STORAGE_DIR!, { recursive: true, force: true });
});
