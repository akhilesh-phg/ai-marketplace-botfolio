import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runGateFrozenPaths } from './gate-frozen-paths.js';

type Fixture = {
  name: string;
  modelEnv: string;
  branch: string;
  latestCommitBody: string;
  changedFiles: string[];
  expectExit: 0 | 1;
  expectMessage?: string;
};

const fixtures = JSON.parse(
  readFileSync(join(import.meta.dirname, '__fixtures__/gate-frozen-paths.json'), 'utf8'),
) as Fixture[];

describe('gate-frozen-paths', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const result = runGateFrozenPaths({
        modelEnv: fixture.modelEnv,
        branch: fixture.branch,
        latestCommitBody: fixture.latestCommitBody,
        changedFiles: fixture.changedFiles,
      });
      expect(result.exitCode).toBe(fixture.expectExit);
      if (fixture.expectMessage) {
        expect(result.message).toBe(fixture.expectMessage);
      }
    });
  }

  it('snapshots stderr message for composer frozen violation', () => {
    const result = runGateFrozenPaths({
      modelEnv: 'composer',
      branch: 'composer/zz-frozen-probe',
      latestCommitBody: 'Model: composer-2.5',
      changedFiles: ['packages/contracts/health.ts'],
    });
    expect(result.message).toMatchInlineSnapshot(
      `"ESCALATE TO OPUS: packages/contracts/health.ts is frozen"`,
    );
  });
});
