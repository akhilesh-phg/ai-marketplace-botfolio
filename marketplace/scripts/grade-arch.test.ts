import { readFileSync } from 'node:fs';
import { mkdirSync, mkdtempSync, readFileSync as read, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  gradePasses,
  parseCriterionScores,
  parseMinScore,
  runGradeArch,
} from './grade-arch.js';
import { type OpenAIClient } from './lib/openai-client.js';

describe('grade-arch', () => {
  it('parses criterion scores and minimum score', () => {
    const pass = readFileSync(
      join(import.meta.dirname, '__fixtures__/grade-arch-pass.md'),
      'utf8',
    );
    expect(parseCriterionScores(pass)).toEqual([8, 7, 8, 8, 8, 8]);
    expect(parseMinScore(pass)).toBe(7);
    expect(gradePasses(pass)).toBe(true);
  });

  it('fails when any criterion is below 7', () => {
    const fail = readFileSync(
      join(import.meta.dirname, '__fixtures__/grade-arch-fail.md'),
      'utf8',
    );
    expect(gradePasses(fail)).toBe(false);
  });

  it('writes grade file and exits 0 on passing mock response', async () => {
    const dir = mkdtempSync(join(tmpdir(), 'grade-arch-'));
    mkdirSync(join(dir, 'docs'), { recursive: true });
    writeFileSync(join(dir, 'docs/09-p0-scaffold-spec.md'), '# spec\n', 'utf8');
    writeFileSync(
      join(dir, 'STATE.md'),
      `phase: P0 - scaffold
slice: P0-01 monorepo-toolchain
status: SPEC
owner-model: opus
next-gate: p0-architecture-grade (manual, GPT 5.5)
HUMAN-ACTION-REQUIRED: true
last-arch-grade: .grades/P0-arch.md (PASS, min 7/10)
open-escalations: []
`,
      'utf8',
    );

    const passFixture = read(
      join(import.meta.dirname, '__fixtures__/grade-arch-pass.md'),
      'utf8',
    );
    const client: OpenAIClient = {
      async complete() {
        return passFixture;
      },
    };

    const result = await runGradeArch({
      sliceId: 'P0-12',
      specPath: 'docs/09-p0-scaffold-spec.md',
      rootDir: dir,
      client,
    });

    expect(result.exitCode).toBe(0);
    expect(read(join(result.outputPath), 'utf8')).toContain('Architecture Grade');
  });
});
