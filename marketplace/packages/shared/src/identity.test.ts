import { describe, expect, it } from 'vitest';

import { identity } from './index.js';

describe('identity', () => {
  it('returns the same value', () => {
    expect(identity(42)).toBe(42);
    expect(identity('hello')).toBe('hello');
    expect(identity({ a: 1 })).toEqual({ a: 1 });
  });
});
