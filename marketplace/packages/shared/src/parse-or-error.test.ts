import { describe, expect, it } from 'vitest';
import { z } from 'zod';

import { AppError } from './app-error.js';
import { parseOrError } from './parse-or-error.js';

const schema = z.object({ name: z.string() });

describe('parseOrError', () => {
  it('returns ok for valid input', () => {
    const result = parseOrError(schema, { name: 'trillion' });
    expect(result).toEqual({ ok: true, value: { name: 'trillion' } });
  });

  it('returns err with AppError for invalid input', () => {
    const result = parseOrError(schema, { name: 123 });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error).toBeInstanceOf(AppError);
      expect(result.error.code).toBe('validation_error');
      expect(result.error.httpStatus).toBe(400);
    }
  });
});
