import { describe, expect, it } from 'vitest';

import { describe as describeAgent } from './index.js';

describe('buyer-orchestrator', () => {
  it('exports a describe() stub', () => {
    const info = describeAgent();

    expect(info.name).toBe('buyer-orchestrator');
    expect(info.version).toBe('0.0.0');
  });
});
