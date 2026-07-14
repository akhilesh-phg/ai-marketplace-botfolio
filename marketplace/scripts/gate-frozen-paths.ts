#!/usr/bin/env tsx
import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { findFrozenViolations } from './lib/frozen-paths.js';
import {
  getChangedFiles,
  getCurrentBranch,
  getLatestCommitBody,
} from './lib/git.js';
import { resolveModel } from './lib/model-identity.js';

export const HELP = `gate-frozen-paths — block composer edits to frozen paths

usage: tsx scripts/gate-frozen-paths.ts [--base origin/main]

exit 0: model != composer OR no frozen file changed
exit 1: composer changed a frozen file
`;

export function runGateFrozenPaths(input: {
  modelEnv?: string | undefined;
  branch: string;
  latestCommitBody: string;
  changedFiles: string[];
}): { exitCode: 0 | 1; message?: string } {
  const model = resolveModel({
    modelEnv: input.modelEnv,
    branch: input.branch,
    latestCommitBody: input.latestCommitBody,
  });

  if (model !== 'composer') {
    return { exitCode: 0 };
  }

  const violations = findFrozenViolations(input.changedFiles);
  if (violations.length === 0) {
    return { exitCode: 0 };
  }

  const file = violations[0];
  return {
    exitCode: 1,
    message: `ESCALATE TO OPUS: ${file} is frozen`,
  };
}

async function main(): Promise<void> {
  const { help, base } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  // eslint-disable-next-line no-restricted-syntax -- MODEL is CI-only identity, not app config
  const modelEnv = process.env.MODEL;
  const result = runGateFrozenPaths({
    modelEnv,
    branch: getCurrentBranch(),
    latestCommitBody: getLatestCommitBody(),
    changedFiles: getChangedFiles(base),
  });

  if (result.exitCode === 1 && result.message) {
    console.error(result.message);
  }
  process.exit(result.exitCode);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
