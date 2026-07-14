import { mkdtempSync, readFileSync, writeFileSync } from 'node:fs';
import { tmpdir } from 'node:os';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { parseState } from './lib/state.js';
import { setStateKey } from './lib/state.js';

const INITIAL_STATE = `phase: P0 - scaffold
slice: P0-01 monorepo-toolchain
status: SPEC
owner-model: opus
next-gate: p0-architecture-grade (manual, GPT 5.5)
HUMAN-ACTION-REQUIRED: true
last-arch-grade: .grades/P0-arch.md (PASS, min 7/10)
open-escalations: []
`;

describe('state-set', () => {
  it('round-trips a key through STATE.md', () => {
    const dir = mkdtempSync(join(tmpdir(), 'state-set-'));
    const statePath = join(dir, 'STATE.md');
    writeFileSync(statePath, INITIAL_STATE, 'utf8');

    const result = setStateKey(dir, 'status', 'CODING');
    expect(result.exitCode).toBe(0);

    const updated = parseState(readFileSync(statePath, 'utf8'));
    expect(updated.status).toBe('CODING');
  });

  it('rejects invalid keys', () => {
    const dir = mkdtempSync(join(tmpdir(), 'state-set-invalid-'));
    writeFileSync(join(dir, 'STATE.md'), INITIAL_STATE, 'utf8');

    const result = setStateKey(dir, 'not-a-key', 'x');
    expect(result.exitCode).toBe(1);
  });
});
