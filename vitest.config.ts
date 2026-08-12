import { defineConfig } from "vitest/config";

// Pure-logic tests (parser / code generator / store) — no DOM needed.
export default defineConfig({
    test: {
        environment: "node",
        include: ["src/**/*.test.ts"],
    },
});
