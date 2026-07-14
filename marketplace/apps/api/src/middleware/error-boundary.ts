import { AppError } from '@t/shared';
import type { Context, MiddlewareHandler } from 'hono';
import type { ContentfulStatusCode } from 'hono/utils/http-status';

import { captureException } from '../lib/sentry.js';

export function handleInternalServerError(error: unknown): void {
  captureException(error);
}

export function respondInternalError(c: Context): Response {
  return c.json({ error: { code: 'internal', message: 'Internal error' } }, 500);
}

export function respondAppError(c: Context, error: AppError): Response {
  return c.json(
    {
      error: {
        code: error.code,
        message: error.message,
        ...(error.details !== undefined ? { details: error.details } : {}),
      },
    },
    error.httpStatus as ContentfulStatusCode,
  );
}

export const errorBoundary: MiddlewareHandler = async (c, next) => {
  try {
    await next();
  } catch (error) {
    if (error instanceof AppError) {
      return respondAppError(c, error);
    }

    handleInternalServerError(error);
    return respondInternalError(c);
  }
};

export function onAppError(error: unknown, c: Context): Response {
  if (error instanceof AppError) {
    return respondAppError(c, error);
  }

  handleInternalServerError(error);
  return respondInternalError(c);
}
