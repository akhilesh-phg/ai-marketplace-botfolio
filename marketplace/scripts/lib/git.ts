import { execSync } from 'node:child_process';

export function runGit(args: string[], cwd?: string): string {
  return execSync(`git ${args.join(' ')}`, {
    cwd,
    encoding: 'utf8',
    stdio: ['ignore', 'pipe', 'pipe'],
  }).trim();
}

function tryMergeBase(base: string, cwd?: string): string | null {
  try {
    return runGit(['merge-base', base, 'HEAD'], cwd);
  } catch {
    return null;
  }
}

export function getMergeBase(base: string, cwd?: string): string {
  const direct = tryMergeBase(base, cwd);
  if (direct) {
    return direct;
  }

  if (base.startsWith('origin/')) {
    const local = tryMergeBase(base.slice('origin/'.length), cwd);
    if (local) {
      return local;
    }
  }

  return 'HEAD~0';
}

export function getChangedFiles(base: string, cwd?: string): string[] {
  const mergeBase = getMergeBase(base, cwd);
  const output = runGit(['diff', '--name-only', `${mergeBase}...HEAD`], cwd);
  if (!output) {
    return [];
  }
  return output.split('\n').filter(Boolean);
}

export function getDiff(base: string, cwd?: string): string {
  const mergeBase = getMergeBase(base, cwd);
  return runGit(['diff', `${mergeBase}...HEAD`], cwd);
}

export function getCommitMessages(base: string, cwd?: string): string[] {
  const mergeBase = getMergeBase(base, cwd);
  const output = runGit(['log', `${mergeBase}...HEAD`, '--format=%B'], cwd);
  if (!output) {
    return [];
  }
  return output.split('\n\n').map((block) => block.trim()).filter(Boolean);
}

export function getCurrentBranch(cwd?: string): string {
  return runGit(['rev-parse', '--abbrev-ref', 'HEAD'], cwd);
}

export function getLatestCommitBody(cwd?: string): string {
  return runGit(['log', '-1', '--format=%B'], cwd);
}
