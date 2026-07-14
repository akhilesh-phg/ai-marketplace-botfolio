#!/usr/bin/env tsx
import { readdirSync, readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { type OpenAIClient } from './lib/openai-client.js';

export const DEFAULT_GRADER_MODEL = 'gpt-5.5';

export const HELP = `audit-reviews — meta-audit recent .reviews/* via GRADER_MODEL

usage: tsx scripts/audit-reviews.ts [--sample 5]

writes .reviews/_audit-<date>.md
exit 0 always (advisory)
`;

export function pickReviewSamples(rootDir: string, sampleSize: number): string[] {
  const reviewsDir = join(rootDir, '.reviews');
  const files = readdirSync(reviewsDir)
    .filter((name) => name.endsWith('.md') && !name.startsWith('_audit-'))
    .sort()
    .slice(-sampleSize);
  return files.map((name) => readFileSync(join(reviewsDir, name), 'utf8'));
}

export async function runAuditReviews(input: {
  rootDir: string;
  sampleSize: number;
  client: OpenAIClient;
}): Promise<{ outputPath: string; markdown: string }> {
  const samples = pickReviewSamples(input.rootDir, input.sampleSize);
  const markdown = await input.client.complete([
    {
      role: 'system',
      content:
        'You are GPT 5.5 meta-auditing Opus code reviews for rubber-stamping. Be concise.',
    },
    {
      role: 'user',
      content: `Audit these reviews for quality and rubber-stamping:\n\n${samples.join('\n\n---\n\n') || '(no reviews found)'}`,
    },
  ]);

  const date = new Date().toISOString().slice(0, 10);
  const outputPath = join(input.rootDir, '.reviews', `_audit-${date}.md`);
  writeFileSync(outputPath, `# Review Audit ${date}\n\n${markdown.trim()}\n`, 'utf8');
  return { outputPath, markdown };
}

async function main(): Promise<void> {
  const { help, flags } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const sampleSize =
    typeof flags.sample === 'string' ? Number.parseInt(flags.sample, 10) : 5;
  const rootDir = process.cwd();

  const { env } = await import('../packages/config/src/env.js');
  const { createOpenAIClient } = await import('./lib/openai-client.js');
  const client = createOpenAIClient(env.OPENAI_API_KEY, DEFAULT_GRADER_MODEL);

  const result = await runAuditReviews({ rootDir, sampleSize, client });
  console.log(`Wrote ${result.outputPath}`);
  process.exit(0);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
