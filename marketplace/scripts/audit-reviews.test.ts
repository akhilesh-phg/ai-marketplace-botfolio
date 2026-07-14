import { mkdirSync, writeFileSync } from 'node:fs';
import { mkdtempSync, readFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runAuditReviews } from './audit-reviews.js';
import { type OpenAIClient } from './lib/openai-client.js';

describe('audit-reviews', () => {
  it('writes audit file with mocked client', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'audit-reviews-'));
    const reviewsDir = join(dir, '.reviews');
    mkdirSync(reviewsDir, { recursive: true });
    writeFileSync(join(reviewsDir, 'P0-11.md'), '# review\nVerdict: PASS\n', 'utf8');

    const client: OpenAIClient = {
      async complete() {
        return 'No rubber-stamping detected.';
      },
    };

    const result = await runAuditReviews({ rootDir: dir, sampleSize: 1, client });
    expect(readFileSync(result.outputPath, 'utf8')).toContain('Review Audit');
  });
});
