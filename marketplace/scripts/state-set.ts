#!/usr/bin/env tsx
import { parseArgv } from './lib/argv.js';
import { isCliEntry } from './lib/cli-entry.js';
import { setStateKey } from './lib/state.js';

export const HELP = `state-set — the ONLY writer of STATE.md

usage: tsx scripts/state-set.ts --key <k> --value <v>

exit 0 on success, exit 1 on invalid key
`;

export { setStateKey };

async function main(): Promise<void> {
  const { help, flags } = parseArgv(process.argv.slice(2));
  if (help) {
    console.log(HELP.trim());
    process.exit(0);
  }

  const key = typeof flags.key === 'string' ? flags.key : undefined;
  const value = typeof flags.value === 'string' ? flags.value : undefined;
  if (!key || value === undefined) {
    console.error('Missing required --key and --value');
    process.exit(1);
  }

  const result = setStateKey(process.cwd(), key, value);
  if (result.exitCode === 1 && result.message) {
    console.error(result.message);
  }
  process.exit(result.exitCode);
}

if (isCliEntry(import.meta.url)) {
  void main();
}
