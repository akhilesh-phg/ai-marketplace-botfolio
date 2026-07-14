#!/usr/bin/env tsx
import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { getCommitMessages, getDiff } from './lib/git.js';
import { detectNewDecisions } from './lib/new-decisions.js';
import { hasValidSpecTrailer, loadRegistry } from './lib/spec-registry.js';

export const HELP = `gate-no-new-decisions — block new symbols/deps without Spec: trailer

usage: tsx scripts/gate-no-new-decisions.ts [--base origin/main]

exit 0: no new decision symbols OR valid Spec: trailer present
exit 1: new decision detected without valid Spec: trailer
`;

export function runGateNoNewDecisions(input: {
  diff: string;
  commitBodies: string[];
  registry: Set<string>;
}): { exitCode: 0 | 1; message?: string } {
  const hasNewDecision = detectNewDecisions(input.diff);
  if (!hasNewDecision) {
    return { exitCode: 0 };
  }

  if (hasValidSpecTrailer(input.commitBodies, input.registry)) {
    return { exitCode: 0 };
  }

  return {
    exitCode: 1,
    message: 'ESCALATE TO OPUS: new exported symbol/dependency/table/env without valid Spec: trailer',
  };
}

async function main(): Promise<void> {
  const { help, base } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const rootDir = process.cwd();
  const result = runGateNoNewDecisions({
    diff: getDiff(base, rootDir),
    commitBodies: getCommitMessages(base, rootDir),
    registry: loadRegistry(rootDir),
  });

  if (result.exitCode === 1 && result.message) {
    console.error(result.message);
  }
  process.exit(result.exitCode);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
