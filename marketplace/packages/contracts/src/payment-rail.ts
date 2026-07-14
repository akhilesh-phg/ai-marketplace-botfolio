import { z } from 'zod';

import type { AppError, Result } from '@t/shared';

export const CreateHoldInput = z.object({
  amountCents: z.number().int().positive(),
  currency: z.string().min(1),
  referenceId: z.string().min(1),
});

export type CreateHoldInput = z.infer<typeof CreateHoldInput>;

export const Hold = z.object({
  id: z.string(),
  amountCents: z.number().int().positive(),
  currency: z.string(),
  referenceId: z.string(),
  status: z.literal('held'),
});

export type Hold = z.infer<typeof Hold>;

export const Capture = z.object({
  id: z.string(),
  holdId: z.string(),
  amountCents: z.number().int().positive(),
  status: z.literal('captured'),
});

export type Capture = z.infer<typeof Capture>;

export const Refund = z.object({
  id: z.string(),
  captureId: z.string(),
  amountCents: z.number().int().positive(),
  status: z.literal('refunded'),
});

export type Refund = z.infer<typeof Refund>;

export interface PaymentRail {
  createHold(input: CreateHoldInput): Promise<Result<Hold, AppError>>;
  capture(id: string): Promise<Result<Capture, AppError>>;
  release(id: string): Promise<Result<void, AppError>>;
  refund(id: string, amount?: number): Promise<Result<Refund, AppError>>;
}
