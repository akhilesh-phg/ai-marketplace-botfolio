import { defineConfig } from '@playwright/test';

import { env } from '../packages/config/src/env.js';

export default defineConfig({
  testDir: '.',
  testMatch: '**/*.spec.ts',
  // Specs that self-spawn a Next dev server must not run concurrently, or two
  // dev servers race for resources and flake. Serialize for determinism.
  fullyParallel: false,
  workers: 1,
  webServer: {
    command: 'pnpm --filter @t/api dev',
    url: `${env.API_BASE_URL}/health`,
    reuseExistingServer: false,
    timeout: 120_000,
  },
  use: {
    baseURL: env.API_BASE_URL,
  },
});
