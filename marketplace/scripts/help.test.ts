import { execSync } from 'node:child_process';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

const rootDir = join(import.meta.dirname, '..');

const scripts = [
  'gate-frozen-paths.ts',
  'gate-no-new-decisions.ts',
  'grade-arch.ts',
  'review-code.ts',
  'audit-reviews.ts',
  'state-set.ts',
  'session-banner.ts',
];

describe('governance script --help', () => {
  for (const script of scripts) {
    it(`${script} --help exits 0`, () => {
      const output = execSync(`pnpm exec tsx scripts/${script} --help`, {
        cwd: rootDir,
        encoding: 'utf8',
      });
      expect(output.toLowerCase()).toContain('usage');
    });
  }
});
