import { readFileSync, writeFileSync } from 'node:fs';
import { join } from 'node:path';

export const STATE_KEYS = [
  'phase',
  'slice',
  'status',
  'owner-model',
  'next-gate',
  'HUMAN-ACTION-REQUIRED',
  'last-arch-grade',
  'open-escalations',
] as const;

export type StateKey = (typeof STATE_KEYS)[number];

export type StateRecord = Record<StateKey, string>;

export function parseState(content: string): StateRecord {
  const record = {} as StateRecord;
  for (const line of content.split('\n')) {
    const trimmed = line.trim();
    if (!trimmed || trimmed.startsWith('#')) {
      continue;
    }
    const colon = trimmed.indexOf(':');
    if (colon === -1) {
      continue;
    }
    const key = trimmed.slice(0, colon).trim() as StateKey;
    const value = trimmed.slice(colon + 1).trim();
    if ((STATE_KEYS as readonly string[]).includes(key)) {
      record[key] = value;
    }
  }
  return record;
}

export function formatState(record: StateRecord): string {
  return STATE_KEYS.map((key) => `${key}: ${record[key] ?? ''}`).join('\n') + '\n';
}

export function readState(rootDir: string): StateRecord {
  const content = readFileSync(join(rootDir, 'STATE.md'), 'utf8');
  return parseState(content);
}

export function writeState(rootDir: string, record: StateRecord): void {
  writeFileSync(join(rootDir, 'STATE.md'), formatState(record), 'utf8');
}

export function validateStateKey(key: string): key is StateKey {
  return (STATE_KEYS as readonly string[]).includes(key);
}

export function setStateKey(
  rootDir: string,
  key: string,
  value: string,
): { exitCode: 0 | 1; message?: string } {
  if (!validateStateKey(key)) {
    return { exitCode: 1, message: `Invalid STATE key: ${key}` };
  }
  const current = readState(rootDir);
  current[key] = value;
  writeState(rootDir, current);
  return { exitCode: 0 };
}
