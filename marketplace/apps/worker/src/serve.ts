import { serve as inngestServe } from 'inngest/hono';
import { Hono } from 'hono';

import { inngest } from './client.js';
import { functions } from './functions/index.js';

export const app = new Hono();

app.on(['GET', 'PUT', 'POST'], '/api/inngest', (c) => {
  const handler = inngestServe({
    client: inngest,
    functions,
  });

  return handler(c);
});
