import './instrument.js';

import { serve } from '@hono/node-server';
import { env } from '@t/config';

import { app } from './app.js';

function resolvePort(baseUrl: string): number {
  const parsed = new URL(baseUrl);
  if (parsed.port !== '') {
    return Number(parsed.port);
  }

  return parsed.protocol === 'https:' ? 443 : 80;
}

const PORT = resolvePort(env.API_BASE_URL);

serve({ fetch: app.fetch, port: PORT }, (info) => {
  console.log(`API listening on http://localhost:${info.port}`);
});
