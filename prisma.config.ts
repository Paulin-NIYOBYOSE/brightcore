import { defineConfig } from "prisma/config";

// Prisma 7 does not read .env files on its own. Load one when it exists (local
// development). Variables already set in the environment, e.g. by Docker
// Compose or the test runner, take precedence over values in the file.
try {
  process.loadEnvFile();
} catch {
  // No .env file: rely on the process environment.
}

export default defineConfig({
  schema: "prisma/schema.prisma",
  migrations: {
    path: "prisma/migrations",
    // The seed reuses server modules guarded by the `server-only` package; the
    // react-server condition marks this script as server-side code.
    seed: "tsx --conditions=react-server prisma/seed.ts",
  },
  datasource: {
    url: process.env.DATABASE_URL,
  },
});
