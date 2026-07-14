#!/usr/bin/env tsx
import { isCliEntry } from './lib/cli-entry.js';
import { readState } from './lib/state.js';

export const HELP = `session-banner — print HUMAN ACTION REQUIRED banner from STATE.md

usage: tsx scripts/session-banner.ts

exit 0 always
`;

export function formatSessionBanner(state: {
  'HUMAN-ACTION-REQUIRED': string;
  'next-gate': string;
}): string | null {
  const required = state['HUMAN-ACTION-REQUIRED'].toLowerCase() === 'true';
  if (!required) {
    return null;
  }
  return `>>> HUMAN ACTION REQUIRED: ${state['next-gate']} <<<`;
}

async function main(): Promise<void> {
  if (process.argv.includes('--help') || process.argv.includes('-h')) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const state = readState(process.cwd());
  const banner = formatSessionBanner(state);
  if (banner) {
    console.log(banner);
  }
  process.exit(0);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
