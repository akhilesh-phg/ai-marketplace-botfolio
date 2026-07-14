import { ulid } from 'ulid';
import { z } from 'zod';

export const EventEnvelope = z.object({
  id: z.string(),
  name: z.string(),
  ts: z.string(),
  idempotencyKey: z.string(),
  data: z.unknown(),
});

export type EventEnvelope = z.infer<typeof EventEnvelope>;

export type MakeEventInput = {
  name: string;
  data: unknown;
  id?: string;
  idempotencyKey?: string;
  ts?: string;
};

/** Builds a worker event envelope. Idempotency handling lives in apps/worker. */
export function makeEvent(input: MakeEventInput): EventEnvelope {
  return {
    id: input.id ?? ulid(),
    name: input.name,
    ts: input.ts ?? new Date().toISOString(),
    idempotencyKey: input.idempotencyKey ?? ulid(),
    data: input.data,
  };
}
