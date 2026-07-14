import { describe, expect, it } from 'vitest';

import { describe as describeRegistry } from './index.js';

describe('registry', () => {
  it('describe returns module info', () => {
    expect(describeRegistry()).toEqual({
      name: 'registry',
      version: '0.0.0',
      description: 'Agent and capability registry (stub)',
    });
  });
});
