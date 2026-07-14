import { InngestTestEngine } from '@inngest/test';
import { makeEvent } from '@t/contracts';
import { afterEach, describe, expect, it, vi } from 'vitest';

import { resetIdempotencyStore, setIdempotencyStore, type IdempotencyStore } from '../idempotency-store.js';
import { hello } from './hello.js';

const fixtureEnvelope = makeEvent({
  name: 'demo/hello',
  data: { name: 'Alice' },
  idempotencyKey: 'idem-hello-alice',
});

describe('hello function', () => {
  afterEach(() => {
    resetIdempotencyStore();
  });

  it('returns greeted name for a fixture event', async () => {
    const t = new InngestTestEngine({ function: hello });

    const { result } = await t.execute({
      events: [{ name: 'demo/hello', data: fixtureEnvelope }],
    });

    expect(result).toEqual({ greeted: 'Alice' });
  });

  it('treats duplicate idempotencyKey as a no-op using the mocked step store', async () => {
    const get = vi.fn().mockReturnValue({ greeted: 'cached' });
    const set = vi.fn();
    const mockStore: IdempotencyStore = { get, set };
    setIdempotencyStore(mockStore);

    const t = new InngestTestEngine({ function: hello });

    const { result } = await t.execute({
      events: [{ name: 'demo/hello', data: fixtureEnvelope }],
    });

    expect(get).toHaveBeenCalledWith('idem-hello-alice');
    expect(set).not.toHaveBeenCalled();
    expect(result).toEqual({ greeted: 'cached' });
  });
});
