import { describe, expect, it } from 'vitest';

import { EventEnvelope, makeEvent } from './events.js';

describe('makeEvent', () => {
  it('builds an envelope matching EventEnvelope schema', () => {
    const event = makeEvent({ name: 'demo/hello', data: { name: 'world' } });
    expect(EventEnvelope.safeParse(event).success).toBe(true);
    expect(event.name).toBe('demo/hello');
    expect(event.data).toEqual({ name: 'world' });
    expect(event.id).toBeTruthy();
    expect(event.idempotencyKey).toBeTruthy();
    expect(event.ts).toBeTruthy();
  });

  it('honors explicit id and idempotencyKey', () => {
    const event = makeEvent({
      name: 'demo/hello',
      data: null,
      id: '01ARZ3NDEKTSV4RRFFQ69G5FAV',
      idempotencyKey: 'idem-1',
      ts: '2026-06-09T00:00:00.000Z',
    });
    expect(event.id).toBe('01ARZ3NDEKTSV4RRFFQ69G5FAV');
    expect(event.idempotencyKey).toBe('idem-1');
    expect(event.ts).toBe('2026-06-09T00:00:00.000Z');
  });
});
