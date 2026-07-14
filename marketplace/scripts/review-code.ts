#!/usr/bin/env tsx
import { mkdirSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { type AnthropicClient } from './lib/anthropic-client.js';
import { getDiff } from './lib/git.js';

export const DEFAULT_REVIEWER_MODEL = 'claude-opus-4-20250514';

export const HELP = `review-code — code review via REVIEWER_MODEL (default Opus 4.8)

usage: tsx scripts/review-code.ts <slice-id> [--base origin/main]

writes .reviews/<slice-id>.md with P0/P1/P2 findings
exit 1 if any P0/P1 finding present
`;

const RUBRIC = `Review the diff using the Opus 4.8 rubric from docs/08-loop-proof-v0-engineering-plan.md §7.2.
Tag each finding P0, P1, or P2.
End with a line: Verdict: PASS or Verdict: FAIL
`;

export function parseFindings(markdown: string): { p0: number; p1: number; p2: number } {
  const p0 = (markdown.match(/\bP0\b/g) ?? []).length;
  const p1 = (markdown.match(/\bP1\b/g) ?? []).length;
  const p2 = (markdown.match(/\bP2\b/g) ?? []).length;
  return { p0, p1, p2 };
}

export function reviewBlocksMerge(markdown: string): boolean {
  const findings = parseFindings(markdown);
  return findings.p0 > 0 || findings.p1 > 0;
}

export async function runReviewCode(input: {
  sliceId: string;
  base: string;
  rootDir: string;
  client: AnthropicClient;
  diff?: string;
}): Promise<{ exitCode: 0 | 1; outputPath: string; markdown: string }> {
  const diff = input.diff ?? getDiff(input.base, input.rootDir);
  const markdown = await input.client.complete([
    {
      role: 'user',
      content: `${RUBRIC}\n\nSlice: ${input.sliceId}\n\nDiff:\n${diff || '(empty diff)'}`,
    },
  ]);

  const reviewsDir = join(input.rootDir, '.reviews');
  mkdirSync(reviewsDir, { recursive: true });
  const outputPath = join(reviewsDir, `${input.sliceId}.md`);
  const header = `# ${input.sliceId} Code Review\n\n`;
  const full = `${header}${markdown.trim()}\n`;
  writeFileSync(outputPath, full, 'utf8');

  return {
    exitCode: reviewBlocksMerge(markdown) ? 1 : 0,
    outputPath,
    markdown,
  };
}

async function main(): Promise<void> {
  const { help, base, positional } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const sliceId = positional[0];
  if (!sliceId) {
    console.error('Missing required <slice-id>');
    process.exit(1);
  }

  const rootDir = process.cwd();
  const { env } = await import('../packages/config/src/env.js');
  const { createAnthropicClient } = await import('./lib/anthropic-client.js');
  const client = createAnthropicClient(env.ANTHROPIC_API_KEY, DEFAULT_REVIEWER_MODEL);

  const result = await runReviewCode({ sliceId, base, rootDir, client });
  console.log(`Wrote ${result.outputPath}`);
  process.exit(result.exitCode);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
