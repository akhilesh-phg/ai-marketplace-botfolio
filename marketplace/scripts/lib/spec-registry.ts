import { readFileSync } from 'node:fs';
import { join } from 'node:path';

const SPEC_ID_RE = /^(P[0-9]+)-[0-9]{2}$|^contracts\/[A-Z0-9_]+$/;
const SPEC_TRAILER_RE = /^Spec:\s*(.+)\s*$/im;

export function isValidSpecId(id: string): boolean {
  return SPEC_ID_RE.test(id);
}

export function loadRegistry(rootDir: string): Set<string> {
  const raw = readFileSync(join(rootDir, 'specs/registry.json'), 'utf8');
  const parsed = JSON.parse(raw) as { specs: string[] };
  return new Set(parsed.specs);
}

export function extractSpecTrailers(commitBodies: string[]): string[] {
  const specs: string[] = [];
  for (const body of commitBodies) {
    for (const line of body.split('\n')) {
      const match = SPEC_TRAILER_RE.exec(line);
      if (match?.[1]) {
        specs.push(match[1].trim());
      }
    }
  }
  return specs;
}

export function hasValidSpecTrailer(commitBodies: string[], registry: Set<string>): boolean {
  const specs = extractSpecTrailers(commitBodies);
  return specs.some((id) => isValidSpecId(id) && registry.has(id));
}
