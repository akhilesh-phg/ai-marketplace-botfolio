import { describe, expect, it } from 'vitest';

import { err, ok } from './result.js';

describe('Result helpers', () => {
  it('ok wraps a value', () => {
    const result = ok(42);
    expect(result).toEqual({ ok: true, value: 42 });
  });

  it('err wraps an error', () => {
    const result = err('failed');
    expect(result).toEqual({ ok: false, error: 'failed' });
  });
});
