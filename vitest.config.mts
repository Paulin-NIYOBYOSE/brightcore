import { fileURLToPath } from "node:url";
import { defineConfig } from "vitest/config";

const fromRoot = (path: string) => fileURLToPath(new URL(path, import.meta.url));

export default defineConfig({
  resolve: {
    alias: {
      "@": fromRoot("./src"),
      // `server-only` throws outside a React Server Components build. Tests
      // exercise server modules directly, so it becomes an empty module here.
      "server-only": fromRoot("./tests/support/empty-module.ts"),
    },
  },
  test: {
    projects: [
      {
        extends: true,
        test: {
          name: "unit",
          include: ["tests/unit/**/*.test.ts"],
          environment: "node",
        },
      },
      {
        extends: true,
        test: {
          name: "integration",
          include: ["tests/integration/**/*.test.ts"],
          environment: "node",
          globalSetup: ["tests/support/global-setup.ts"],
          setupFiles: ["tests/support/test-env.ts", "tests/support/integration-setup.ts"],
          // The files share one test database, so they run one at a time.
          fileParallelism: false,
          testTimeout: 20_000,
        },
      },
      {
        extends: true,
        test: {
          name: "ui",
          include: ["tests/ui/**/*.test.tsx"],
          environment: "jsdom",
          setupFiles: ["tests/support/ui-setup.ts"],
        },
      },
    ],
  },
});
