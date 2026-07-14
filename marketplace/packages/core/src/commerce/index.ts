import type { PaymentRail } from '@t/contracts';
import { AppError, err } from '@t/shared';

import type { ModuleInfo } from '../module-info.js';

export function describe(): ModuleInfo {
  return {
    name: 'commerce',
    version: '0.0.0',
    description: 'Payments and commerce (stub)',
  };
}

const notImplemented = (): Promise<ReturnType<typeof err<AppError>>> =>
  Promise.resolve(err(new AppError('not_implemented', 'Commerce rail not implemented', 501)));

export const placeholderPaymentRail: PaymentRail = {
  createHold: notImplemented,
  capture: notImplemented,
  release: notImplemented,
  refund: notImplemented,
};
