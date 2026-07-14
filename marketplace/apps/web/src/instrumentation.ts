import * as Sentry from '@sentry/nextjs';

import { env } from './lib/env';

export function register(): void {
  Sentry.init({
    dsn: env.SENTRY_DSN,
    environment: env.NODE_ENV,
  });
}
