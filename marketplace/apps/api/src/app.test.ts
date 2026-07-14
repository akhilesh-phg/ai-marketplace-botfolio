import { env } from '@t/config';
import { HealthResponse } from '@t/contracts';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

import { app } from './app.js';
import * as auth from './lib/auth.js';

describe('GET /health', () => {
  it('returns 200 with a HealthResponse body', async () => {
    const response = await app.request('/health');

    expect(response.status).toBe(200);

    const body: unknown = await response.json();
    const parsed = HealthResponse.parse(body);

    expect(parsed.ok).toBe(true);
    expect(parsed.service).toBe('api');
    expect(parsed.version).toBe('0.0.0');
    expect(parsed.ts).toMatch(/^\d{4}-\d{2}-\d{2}T/);
  });
});

describe('GET /openapi.json', () => {
  it('returns 200 with an OpenAPI document', async () => {
    const response = await app.request('/openapi.json');

    expect(response.status).toBe(200);

    const body = (await response.json()) as { openapi?: string; paths?: Record<string, unknown> };

    expect(body.openapi).toBe('3.1.0');
    expect(body.paths?.['/health']).toBeDefined();
  });
});

describe('GET /debug/sentry', () => {
  const captureSpy = vi.fn();

  beforeEach(async () => {
    vi.resetModules();
    captureSpy.mockClear();

    const sentry = await import('./lib/sentry.js');
    sentry.setCaptureException(captureSpy);
  });

  afterEach(async () => {
    const sentry = await import('./lib/sentry.js');
    sentry.resetCaptureException();
  });

  it('returns a 500 error envelope in non-production', async () => {
    const { app: debugApp } = await import('./app.js');

    if (env.NODE_ENV === 'production') {
      const response = await debugApp.request('/debug/sentry');
      expect(response.status).toBe(404);
      return;
    }

    const response = await debugApp.request('/debug/sentry');

    expect(response.status).toBe(500);
    expect(captureSpy).toHaveBeenCalledTimes(1);

    const body = (await response.json()) as { error?: { code?: string; message?: string } };
    expect(body.error?.code).toBe('internal');
    expect(body.error?.message).toBe('Internal error');
  });
});

describe('GET /me', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns 401 unauthorized without a valid bearer token', async () => {
    vi.spyOn(auth, 'verifyBearerToken').mockResolvedValue(null);

    const response = await app.request('/me');

    expect(response.status).toBe(401);

    const body = (await response.json()) as { error?: { code?: string } };
    expect(body.error?.code).toBe('unauthorized');
  });

  it('returns 200 with userId and email when bearer token is valid', async () => {
    vi.spyOn(auth, 'verifyBearerToken').mockResolvedValue({
      userId: 'user-123',
      email: 'test@example.com',
    });

    const response = await app.request('/me', {
      headers: { Authorization: 'Bearer valid-token' },
    });

    expect(response.status).toBe(200);

    const body = (await response.json()) as { userId?: string; email?: string };
    expect(body.userId).toBe('user-123');
    expect(body.email).toBe('test@example.com');
  });
});
