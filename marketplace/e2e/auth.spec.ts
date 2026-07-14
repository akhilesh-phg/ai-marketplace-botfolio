import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';

import { expect, test } from '@playwright/test';

const WEB_BASE_URL = 'http://localhost:3003';
const REPO_ROOT = process.cwd();

let webServer: ChildProcessWithoutNullStreams | undefined;

async function waitForWebServerReady(server: ChildProcessWithoutNullStreams): Promise<void> {
  await new Promise<void>((resolve, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for Next.js dev server'));
    }, 120_000);

    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes('Ready')) {
        clearTimeout(timeout);
        server.stdout.off('data', onStdout);
        server.stderr.off('data', onStderr);
        resolve();
      }
    };

    const onStdout = (chunk: Buffer) => {
      process.stdout.write(chunk);
      onData(chunk);
    };

    const onStderr = (chunk: Buffer) => {
      process.stderr.write(chunk);
      onData(chunk);
    };

    server.stdout.on('data', onStdout);
    server.stderr.on('data', onStderr);
  });

  const response = await fetch(`${WEB_BASE_URL}/`);
  if (!response.ok) {
    throw new Error(`Web server responded with ${response.status}`);
  }
}

test.describe('auth', () => {
  test.describe.configure({ mode: 'serial', timeout: 120_000 });

  test.beforeAll(async () => {
    test.setTimeout(120_000);

    webServer = spawn('pnpm', ['--filter', '@t/web', 'dev'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      env: {
        ...process.env,
        PORT: '3003',
      },
    });

    await waitForWebServerReady(webServer);
  });

  test.afterAll(() => {
    webServer?.kill('SIGTERM');
  });

  test('visiting /dashboard unauthenticated redirects to /login', async ({ page }) => {
    await page.goto(`${WEB_BASE_URL}/dashboard`);

    await expect(page).toHaveURL(`${WEB_BASE_URL}/login`);
    await expect(page.getByRole('heading', { name: 'Sign in' })).toBeVisible();
  });
});
