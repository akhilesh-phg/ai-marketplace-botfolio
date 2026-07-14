import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseState } from './lib/state.js';
import { formatSessionBanner } from './session-banner.js';

describe('session-banner', () => {
  it('prints banner when HUMAN-ACTION-REQUIRED is true', () => {
    const content = readFileSync(
      join(import.meta.dirname, '__fixtures__/state-human-required.md'),
      'utf8',
    );
    const state = parseState(content);
    const banner = formatSessionBanner(state);
    expect(banner).toMatchInlineSnapshot(
      `">>> HUMAN ACTION REQUIRED: p0-architecture-grade (manual, GPT 5.5) <<<"`,
    );
  });

  it('returns null when HUMAN-ACTION-REQUIRED is false', () => {
    const content = readFileSync(
      join(import.meta.dirname, '__fixtures__/state-no-action.md'),
      'utf8',
    );
    const state = parseState(content);
    expect(formatSessionBanner(state)).toBeNull();
  });
});
