function escapeRegex(value: string): string {
  return value.replace(/[.+?^${}()|[\]\\]/g, '\\$&');
}

/**
 * Convert a glob to a regex. `**` matches across path segments (including `/`),
 * a single `*` matches within a segment only. This must handle `*` in any
 * position (e.g. `scripts/gate-*.ts`), not just trailing wildcards.
 */
function globToRegex(pattern: string): RegExp {
  let regex = '';
  for (let i = 0; i < pattern.length; i += 1) {
    if (pattern.startsWith('**', i)) {
      regex += '.*';
      i += 1;
    } else if (pattern[i] === '*') {
      regex += '[^/]*';
    } else {
      regex += escapeRegex(pattern[i]);
    }
  }
  return new RegExp(`^${regex}$`);
}

export function matchGlob(pattern: string, filePath: string): boolean {
  const normalized = filePath.replace(/\\/g, '/');
  if (pattern.endsWith('/**')) {
    const prefix = pattern.slice(0, -3);
    if (normalized === prefix || normalized.startsWith(`${prefix}/`)) {
      return true;
    }
  }
  if (pattern.includes('*')) {
    return globToRegex(pattern).test(normalized);
  }
  return normalized === pattern;
}

export function matchesAnyGlob(patterns: string[], filePath: string): boolean {
  return patterns.some((pattern) => matchGlob(pattern, filePath));
}
