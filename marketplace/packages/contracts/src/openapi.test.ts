import { describe, expect, it } from 'vitest';

import { buildOpenApi } from './openapi.js';

describe('buildOpenApi', () => {
  it('returns OpenAPI 3.1 with the health route registered', () => {
    const doc = buildOpenApi();

    expect(doc.openapi).toBe('3.1.0');
    expect(doc.paths?.['/health']).toBeDefined();
    expect(doc.paths?.['/health']?.get).toBeDefined();
    expect(doc.paths?.['/health']?.get?.responses?.['200']).toBeDefined();
  });
});
