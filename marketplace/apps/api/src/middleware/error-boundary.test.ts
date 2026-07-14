import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';

describe('handleInternalServerError', () => {
  const captureSpy = vi.fn();
  let handleInternalServerError: (error: unknown) => void;

  beforeEach(async () => {
    vi.resetModules();
    captureSpy.mockClear();

    const sentry = await import('../lib/sentry.js');
    sentry.setCaptureException(captureSpy);

    ({ handleInternalServerError } = await import('./error-boundary.js'));
  });

  afterEach(async () => {
    const sentry = await import('../lib/sentry.js');
    sentry.resetCaptureException();
  });

  it('calls captureException on unhandled errors', () => {
    handleInternalServerError(new Error('boom'));
    expect(captureSpy).toHaveBeenCalledTimes(1);
  });
});
