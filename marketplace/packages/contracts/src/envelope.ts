import { z } from 'zod';

/** Failure response envelope: `{ error: { code, message, details? } }`. Success responses are the payload directly. */
export const ErrorEnvelope = z.object({
  error: z.object({
    code: z.string(),
    message: z.string(),
    details: z.unknown().optional(),
  }),
});

export type ErrorEnvelope = z.infer<typeof ErrorEnvelope>;
