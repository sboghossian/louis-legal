import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    // `_llm-classifier.test.ts` predates vitest and is written for node:test
    // (`node --test`). Exclude it from vitest discovery so both runners coexist:
    // run it with `node --import tsx --test src/skills/_llm-classifier.test.ts`.
    exclude: [
      "**/node_modules/**",
      "**/dist/**",
      "src/skills/_llm-classifier.test.ts",
    ],
  },
});
