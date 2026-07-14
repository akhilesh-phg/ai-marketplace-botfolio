import { readFileSync } from 'node:fs';
import { mkdtempSync, readFileSync as read } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { type AnthropicClient } from './lib/anthropic-client.js';
import { parseFindings, reviewBlocksMerge, runReviewCode } from './review-code.js';

describe('review-code', () => {
  it('detects P0/P1 findings', () => {
    const fail = readFileSync(
      join(import.meta.dirname, '__fixtures__/review-fail.md'),
      'utf8',
    );
    expect(parseFindings(fail)).toEqual({ p0: 0, p1: 1, p2: 0 });
    expect(reviewBlocksMerge(fail)).toBe(true);
  });

  it('allows merge when only P2 findings exist', () => {
    const pass = readFileSync(
      join(import.meta.dirname, '__fixtures__/review-pass.md'),
      'utf8',
    );
    expect(reviewBlocksMerge(pass)).toBe(false);
  });

  it('writes review file with mocked client', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'review-code-'));
    const passFixture = read(
      join(import.meta.dirname, '__fixtures__/review-pass.md'),
      'utf8',
    );
    const client: AnthropicClient = {
      async complete() {
        return passFixture;
      },
    };

    const result = await runReviewCode({
      sliceId: 'P0-12',
      base: 'origin/main',
      rootDir: dir,
      client,
      diff: '+export const x = 1;\n',
    });

    expect(result.exitCode).toBe(0);
    expect(read(join(result.outputPath), 'utf8')).toContain('Code Review');
  });
});
