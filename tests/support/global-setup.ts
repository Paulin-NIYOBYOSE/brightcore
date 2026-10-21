import { execFileSync } from "node:child_process";
import path from "node:path";
import { resolveTestDatabaseUrl } from "./test-database";

/** Runs once before the integration tests: applies migrations to the test database. */
export default function setup() {
  const testDatabaseUrl = resolveTestDatabaseUrl();
  const prismaBin = path.resolve("node_modules/.bin/prisma");
  execFileSync(prismaBin, ["migrate", "deploy"], {
    env: { ...process.env, DATABASE_URL: testDatabaseUrl },
    stdio: "pipe",
  });
}
