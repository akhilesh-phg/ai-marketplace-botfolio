import { describe, expect, it } from 'vitest';

import { defaultMetrics, NoopMetrics } from './metrics.js';

describe('NoopMetrics', () => {
  it('implements Metrics without throwing', () => {
    const metrics = new NoopMetrics();

    expect(() => {
      metrics.increment('requests');
      metrics.gauge('queue.depth', 0);
      metrics.timing('latency', 12, { route: '/health' });
    }).not.toThrow();
  });

  it('exports a default NoopMetrics instance', () => {
    expect(defaultMetrics).toBeInstanceOf(NoopMetrics);
  });
});
