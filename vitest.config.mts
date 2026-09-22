import { resolve } from "node:path";

import { defineConfig } from "vitest/config";
import react from "@vitejs/plugin-react";
import tsconfigPaths from "vite-tsconfig-paths";

export default defineConfig({
  plugins: [tsconfigPaths(), react()],
  resolve: {
    alias: {
      "server-only": resolve(process.cwd(), "node_modules/server-only/empty.js"),
    },
  },
  test: {
    environment: "jsdom",
    setupFiles: ["./__tests__/setup.ts"],
    include: ["**/*.test.ts", "**/*.test.tsx"],
    exclude: ["**/node_modules/**", "**/.next/**", "**/.opencode/**", "**/dist/**", "**/build/**", "**/coverage/**"],
    passWithNoTests: true,
    coverage: {
      include: ["lib/**", "app/**", "components/**"],
      exclude: [
        "**/__tests__/**",
        "**/*.test.*",
        "components/ui/**",
        "app/layout.tsx",
        "app/globals.css",
      ],
      provider: "v8",
      thresholds: {
        lines: 80,
        branches: 80,
        functions: 80,
        statements: 80,
      },
    },
  },
});
