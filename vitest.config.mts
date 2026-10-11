import { defineConfig } from "vitest/config";
import path from "path";
import { fileURLToPath } from "url";
export default defineConfig({
  test: { include: ["tests/**/*.test.ts"], env: { FECHA_SISTEMA: "2026-10-10" } },
  resolve: { alias: { "@": path.resolve(path.dirname(fileURLToPath(import.meta.url))) } },
});
