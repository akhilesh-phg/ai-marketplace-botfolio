import { beforeEach, describe, expect, it, vi } from 'vitest';

import { setAuthClientForTesting, verifyBearerToken } from './auth.js';

describe('verifyBearerToken', () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it('returns null when Authorization header is missing', async () => {
    const result = await verifyBearerToken(undefined);
    expect(result).toBeNull();
  });

  it('returns null when getUser fails', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: { user: null },
      error: { message: 'invalid' },
    });

    setAuthClientForTesting({
      auth: { getUser },
    } as never);

    const result = await verifyBearerToken('Bearer bad-token');
    expect(result).toBeNull();
    expect(getUser).toHaveBeenCalledWith('bad-token');
  });

  it('returns userId and email when getUser succeeds', async () => {
    const getUser = vi.fn().mockResolvedValue({
      data: {
        user: { id: 'user-abc', email: 'alice@example.com' },
      },
      error: null,
    });

    setAuthClientForTesting({
      auth: { getUser },
    } as never);

    const result = await verifyBearerToken('Bearer good-token');
    expect(result).toEqual({ userId: 'user-abc', email: 'alice@example.com' });
    expect(getUser).toHaveBeenCalledWith('good-token');
  });
});
