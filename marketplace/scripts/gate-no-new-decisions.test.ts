import { readFileSync } from 'node:fs';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { runGateNoNewDecisions } from './gate-no-new-decisions.js';

type Fixture = {
  name: string;
  diff: string;
  commitBodies: string[];
  registry: string[];
  expectExit: 0 | 1;
};

const fixtures = JSON.parse(
  readFileSync(join(import.meta.dirname, '__fixtures__/gate-no-new-decisions.json'), 'utf8'),
) as Fixture[];

describe('gate-no-new-decisions', () => {
  for (const fixture of fixtures) {
    it(fixture.name, () => {
      const result = runGateNoNewDecisions({
        diff: fixture.diff,
        commitBodies: fixture.commitBodies,
        registry: new Set(fixture.registry),
      });
      expect(result.exitCode).toBe(fixture.expectExit);
    });
  }
});
