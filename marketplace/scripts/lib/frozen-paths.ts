import { matchesAnyGlob } from './glob-match.js';

export const FROZEN_GLOBS = [
  'AGENTS.md',
  'STATE.md',
  'GATES.md',
  'specs/registry.json',
  'packages/contracts/**',
  'packages/db/schema/**',
  'packages/core/commerce/**',
  'apps/api/**/commerce/**',
  'scripts/gate-*.ts',
  'scripts/grade-arch.ts',
  'scripts/review-code.ts',
  'package.json',
  'pnpm-lock.yaml',
];

export function findFrozenViolations(changedFiles: string[]): string[] {
  return changedFiles.filter((file) => matchesAnyGlob(FROZEN_GLOBS, file));
}
