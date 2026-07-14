import { describe, expect, it } from 'vitest';

import { describe as describeDiscovery } from './index.js';

describe('discovery', () => {
  it('describe returns module info', () => {
    expect(describeDiscovery()).toEqual({
      name: 'discovery',
      version: '0.0.0',
      description: 'Agent discovery and search (stub)',
    });
  });
});
