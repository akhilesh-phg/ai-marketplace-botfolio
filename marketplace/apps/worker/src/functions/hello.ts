import { EventEnvelope } from '@t/contracts';
import type { InngestFunction } from 'inngest';

import { inngest } from '../client.js';
import { getIdempotencyStore } from '../idempotency-store.js';

export const hello: InngestFunction.Like = inngest.createFunction(
  { id: 'hello', triggers: { event: 'demo/hello' } },
  async ({ event, step }) => {
    const envelope = EventEnvelope.parse(event.data);
    const store = getIdempotencyStore();

    const cached = store.get(envelope.idempotencyKey);
    if (cached !== undefined && cached !== null) {
      return cached as { greeted: string };
    }

    const result = await step.run('greet', () => {
      const payload = envelope.data as { name: string };
      return { greeted: payload.name };
    });

    store.set(envelope.idempotencyKey, result);
    return result;
  },
);
