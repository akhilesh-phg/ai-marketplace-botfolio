import { spawn, type ChildProcessWithoutNullStreams } from 'node:child_process';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { parse } from 'dotenv';
import { describe, expect, it, beforeAll, afterAll } from 'vitest';

import { Trillion } from './client.js';

const REPO_ROOT = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../..');

function loadEnvFile(): Record<string, string> {
  const envPath = resolve(REPO_ROOT, '.env');
  try {
    return parse(readFileSync(envPath, 'utf8'));
  } catch {
    return {};
  }
}

function loadApiBaseUrl(): string | undefined {
  return loadEnvFile().API_BASE_URL;
}

const apiBaseUrl = loadApiBaseUrl();

let apiServer: ChildProcessWithoutNullStreams | undefined;

async function waitForApiReady(
  server: ChildProcessWithoutNullStreams,
  baseUrl: string,
): Promise<void> {
  await new Promise<void>((resolveReady, reject) => {
    const timeout = setTimeout(() => {
      reject(new Error('Timed out waiting for API dev server'));
    }, 120_000);

    const onData = (chunk: Buffer) => {
      if (chunk.toString().includes('API listening')) {
        clearTimeout(timeout);
        server.stdout.off('data', onStdout);
        server.stderr.off('data', onStderr);
        resolveReady();
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

  const response = await fetch(`${baseUrl}/health`);
  if (!response.ok) {
    throw new Error(`API health check responded with ${response.status}`);
  }
}

describe.skipIf(!apiBaseUrl)('Trillion', () => {
  beforeAll(async () => {
    if (!apiBaseUrl) {
      throw new Error('API_BASE_URL is unset; skipping SDK health integration test');
    }

    const envFile = loadEnvFile();

    apiServer = spawn('pnpm', ['--filter', '@t/api', 'dev'], {
      cwd: REPO_ROOT,
      stdio: 'pipe',
      env: { ...process.env, ...envFile },
    });

    await waitForApiReady(apiServer, apiBaseUrl);
  }, 120_000);

  afterAll(() => {
    apiServer?.kill('SIGTERM');
  });

  it('health() returns ok:true against the running api', async () => {
    const client = new Trillion({ baseUrl: apiBaseUrl! });
    const result = await client.health();

    expect(result.ok).toBe(true);
    expect(result.service).toBe('api');
    expect(result.version).toBe('0.0.0');
    expect(result.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});
