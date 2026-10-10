import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"] },
  resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url))) } },
});
