import { createRoute, OpenAPIHono } from '@hono/zod-openapi';
import { env } from '@t/config';
import { buildOpenApi, HealthResponse, z } from '@t/contracts';
import { cors } from 'hono/cors';
import { logger } from 'hono/logger';

import { verifyBearerToken } from './lib/auth.js';
import { errorBoundary, onAppError } from './middleware/error-boundary.js';
import { requestId } from './middleware/request-id.js';

const APP_VERSION = '0.0.0';

const healthRoute = createRoute({
  method: 'get',
  path: '/health',
  summary: 'Health check',
  responses: {
    200: {
      description: 'Service health status',
      content: {
        'application/json': {
          schema: HealthResponse,
        },
      },
    },
  },
});

const openApiRoute = createRoute({
  method: 'get',
  path: '/openapi.json',
  summary: 'OpenAPI document',
  responses: {
    200: {
      description: 'OpenAPI 3.1 document',
      content: {
        'application/json': {
          schema: z.any(),
        },
      },
    },
  },
});

export const app = new OpenAPIHono();

app.use('*', requestId);
app.use('*', logger());
app.use('*', cors());
app.use('*', errorBoundary);

app.openapi(healthRoute, (c) => {
  return c.json({
    ok: true,
    service: 'api',
    version: APP_VERSION,
    ts: new Date().toISOString(),
  });
});

app.openapi(openApiRoute, (c) => {
  return c.json(buildOpenApi());
});

if (env.NODE_ENV !== 'production') {
  app.get('/debug/sentry', () => {
    throw new Error('Sentry debug error');
  });
}

app.onError(onAppError);

app.get('/me', async (c) => {
  const user = await verifyBearerToken(c.req.header('Authorization'));

  if (!user) {
    return c.json({ error: { code: 'unauthorized' } }, 401);
  }

  return c.json({ userId: user.userId, email: user.email });
});
