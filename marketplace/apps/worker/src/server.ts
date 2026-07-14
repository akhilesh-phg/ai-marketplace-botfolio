import { serve } from '@hono/node-server';

import { app } from './serve.js';

const PORT = 3002;

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`Worker listening on http://localhost:${info.port}`);
});
