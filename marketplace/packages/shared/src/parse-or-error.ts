import { z } from 'zod';

import { AppError } from './app-error.js';
import { err, ok, type Result } from './result.js';

export function parseOrError<T>(schema: z.ZodType<T>, input: unknown): Result<T, AppError> {
  const result = schema.safeParse(input);
  if (!result.success) {
    return err(
      new AppError('validation_error', result.error.message, 400, result.error.flatten()),
    );
  }
  return ok(result.data);
}
