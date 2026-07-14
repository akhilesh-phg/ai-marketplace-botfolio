import { extendZodWithOpenApi } from '@hono/zod-openapi';
import { z } from 'zod';

extendZodWithOpenApi(z);

export const HealthResponse = z
  .object({
    ok: z.literal(true),
    service: z.string(),
    version: z.string(),
    ts: z.string(),
  })
  .openapi('HealthResponse');

export type HealthResponse = z.infer<typeof HealthResponse>;
