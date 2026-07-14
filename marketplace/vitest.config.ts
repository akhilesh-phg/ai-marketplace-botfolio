import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    exclude: ['**/e2e/**', '**/node_modules/**', '**/dist/**'],
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json-summary', 'lcov'],
      // `all: true` measures every included source file, not just the ones a
      // test happened to import — otherwise the report is hollow.
      all: true,
      include: ['packages/core/**/*.ts', 'packages/shared/**/*.ts'],
      exclude: [
        '**/dist/**',
        '**/*.test.ts',
        // Pure re-export barrel (no runtime logic of its own).
        'packages/core/src/index.ts',
      ],
      thresholds: {
        lines: 80,
        functions: 80,
        branches: 80,
        statements: 80,
      },
    },
  },
});
