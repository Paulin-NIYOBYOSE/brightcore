import { mkdtempSync } from "node:fs";
import { tmpdir } from "node:os";
import path from "node:path";
import { resolveTestDatabaseUrl } from "./test-database";

// Runs before any application module is imported in an integration test file,
// so the Prisma client and getEnv() only ever see the test configuration.
process.env.DATABASE_URL = resolveTestDatabaseUrl();
process.env.APP_TIMEZONE = "Africa/Kigali";
process.env.CV_STORAGE_DIR = mkdtempSync(path.join(tmpdir(), "brightcore-test-cvs-"));
