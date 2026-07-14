import { createRoute, OpenAPIHono, z } from '@hono/zod-openapi';

import { HealthResponse } from './health.js';

const app = new OpenAPIHono();

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

app.openapi(healthRoute, (c) => {
  return c.json({
    ok: true,
    service: 'api',
    version: '0.0.0',
    ts: new Date().toISOString(),
  });
});

export function buildOpenApi(): ReturnType<OpenAPIHono['getOpenAPI31Document']> {
  return app.getOpenAPI31Document({
    openapi: '3.1.0',
    info: {
      title: 'Trillion API',
      version: '0.0.0',
    },
  });
}

export { z };
