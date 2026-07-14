import * as Sentry from '@sentry/node';
import { env } from '@t/config';

Sentry.init({
  dsn: env.SENTRY_DSN,
  environment: env.NODE_ENV,
});
