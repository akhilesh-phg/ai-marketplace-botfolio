#!/usr/bin/env tsx
import { mkdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { type OpenAIClient } from './lib/openai-client.js';
import { setStateKey } from './lib/state.js';

export const DEFAULT_GRADER_MODEL = 'gpt-5.5';

export const HELP = `grade-arch — architecture grade via GRADER_MODEL (default gpt-5.5)

usage: tsx scripts/grade-arch.ts <slice-id> [--spec docs/09-p0-scaffold-spec.md]

writes .grades/<slice-id>-arch.md and updates STATE via state-set
exit 1 if any criterion < 7
`;

const RUBRIC = `Score each criterion 1-10. Gate = all >= 7.
1. Correctness
2. Simplicity
3. Scalability seams
4. Governance integrity
5. Testability
6. Composer-executability

Return markdown with sections:
## Scores
1. <name>: X/10
...
Minimum score: X/10
Gate verdict: PASS or FAIL

## Criterion Notes
(brief notes)

## Required Revisions Before Composer
(list or "No blocking revisions required.")

## Final Verdict
(summary)
`;

export function parseMinScore(markdown: string): number | null {
  const match = /Minimum score:\s*(\d+)\/10/i.exec(markdown);
  if (!match?.[1]) {
    return null;
  }
  return Number.parseInt(match[1], 10);
}

export function parseCriterionScores(markdown: string): number[] {
  const scores: number[] = [];
  const re = /\d+\.\s+[^:]+:\s*(\d+)\/10/g;
  let match = re.exec(markdown);
  while (match) {
    if (match[1]) {
      scores.push(Number.parseInt(match[1], 10));
    }
    match = re.exec(markdown);
  }
  return scores;
}

export function gradePasses(markdown: string): boolean {
  const scores = parseCriterionScores(markdown);
  if (scores.length === 0) {
    return false;
  }
  return scores.every((score) => score >= 7);
}

export async function runGradeArch(input: {
  sliceId: string;
  specPath: string;
  rootDir: string;
  client: OpenAIClient;
}): Promise<{ exitCode: 0 | 1; outputPath: string; markdown: string }> {
  const specText = readFileSync(join(input.rootDir, input.specPath), 'utf8');
  const markdown = await input.client.complete([
    {
      role: 'system',
      content: `You are GPT 5.5 grading architecture for slice ${input.sliceId}. ${RUBRIC}`,
    },
    {
      role: 'user',
      content: `Grade this spec:\n\n${specText}`,
    },
  ]);

  const gradesDir = join(input.rootDir, '.grades');
  mkdirSync(gradesDir, { recursive: true });
  const outputPath = join(gradesDir, `${input.sliceId}-arch.md`);
  const header = `# ${input.sliceId} Architecture Grade\n\nSource: ${input.specPath}\n\n`;
  const full = `${header}${markdown.trim()}\n`;
  writeFileSync(outputPath, full, 'utf8');

  setStateKey(input.rootDir, 'last-arch-grade', outputPath.replace(`${input.rootDir}/`, ''));
  setStateKey(input.rootDir, 'slice', input.sliceId);

  return {
    exitCode: gradePasses(markdown) ? 0 : 1,
    outputPath,
    markdown,
  };
}

async function main(): Promise<void> {
  const { help, positional, flags } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const sliceId = positional[0];
  if (!sliceId) {
    console.error('Missing required <slice-id>');
    process.exit(1);
  }

  const specPath =
    typeof flags.spec === 'string' ? flags.spec : 'docs/09-p0-scaffold-spec.md';
  const rootDir = process.cwd();

  const { env } = await import('../packages/config/src/env.js');
  const { createOpenAIClient } = await import('./lib/openai-client.js');
  const client = createOpenAIClient(env.OPENAI_API_KEY, DEFAULT_GRADER_MODEL);

  const result = await runGradeArch({ sliceId, specPath, rootDir, client });
  console.log(`Wrote ${result.outputPath}`);
  process.exit(result.exitCode);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
