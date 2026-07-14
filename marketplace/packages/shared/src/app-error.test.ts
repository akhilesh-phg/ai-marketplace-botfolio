import { describe, expect, it } from 'vitest';

import { AppError } from './app-error.js';

describe('AppError', () => {
  it('stores code, message, httpStatus, and optional details', () => {
    const error = new AppError('not_found', 'Missing resource', 404, { id: '1' });
    expect(error.code).toBe('not_found');
    expect(error.message).toBe('Missing resource');
    expect(error.httpStatus).toBe(404);
    expect(error.details).toEqual({ id: '1' });
    expect(error.name).toBe('AppError');
  });

  it('allows details to be omitted', () => {
    const error = new AppError('internal', 'Server error', 500);
    expect(error.details).toBeUndefined();
  });
});
