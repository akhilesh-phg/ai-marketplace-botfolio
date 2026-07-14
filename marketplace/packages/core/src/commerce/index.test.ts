import { describe, expect, it } from 'vitest';

import { describe as describeCommerce, placeholderPaymentRail } from './index.js';

describe('commerce', () => {
  it('describe returns module info', () => {
    expect(describeCommerce()).toEqual({
      name: 'commerce',
      version: '0.0.0',
      description: 'Payments and commerce (stub)',
    });
  });

  it('placeholderPaymentRail returns not_implemented for createHold', async () => {
    const result = await placeholderPaymentRail.createHold({
      amountCents: 100,
      currency: 'USD',
      referenceId: 'ref-1',
    });
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_implemented');
      expect(result.error.httpStatus).toBe(501);
    }
  });

  it('placeholderPaymentRail returns not_implemented for capture', async () => {
    const result = await placeholderPaymentRail.capture('hold-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_implemented');
    }
  });

  it('placeholderPaymentRail returns not_implemented for release', async () => {
    const result = await placeholderPaymentRail.release('hold-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_implemented');
    }
  });

  it('placeholderPaymentRail returns not_implemented for refund', async () => {
    const result = await placeholderPaymentRail.refund('capture-1');
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.error.code).toBe('not_implemented');
    }
  });
});
