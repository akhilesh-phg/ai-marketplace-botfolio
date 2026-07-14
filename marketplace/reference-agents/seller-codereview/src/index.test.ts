import { describe, expect, it } from 'vitest';

import { describe as describeAgent } from './index.js';

describe('seller-codereview', () => {
  it('exports a describe() stub', () => {
    const info = describeAgent();

    expect(info.name).toBe('seller-codereview');
    expect(info.version).toBe('0.0.0');
  });
});
