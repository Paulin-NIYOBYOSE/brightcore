/**
 * Resolves the database used by integration tests. Tests empty its tables
 * before each test, so we refuse anything that does not look like a dedicated
 * test database.
 */
export function resolveTestDatabaseUrl(): string {
  try {
    process.loadEnvFile();
  } catch {
    // No .env file: rely on the environment (e.g. CI or Docker).
  }

  const url = process.env.TEST_DATABASE_URL;
  if (!url) {
    throw new Error(
      "TEST_DATABASE_URL is not set. Point it at a separate PostgreSQL database whose name contains 'test' (see .env.example).",
    );
  }

  const databaseName = new URL(url).pathname.replace(/^\//, "");
  if (!databaseName.includes("test")) {
    throw new Error(
      `Refusing to run integration tests against "${databaseName}": the test database name must contain "test".`,
    );
  }
  return url;
}
