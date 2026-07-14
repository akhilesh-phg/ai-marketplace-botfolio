const EXPORT_RE = /^\+export\s+(type|interface|function|const)\s+/m;
const PACKAGE_JSON_DEP_RE = /^\+.*"(dependencies|devDependencies|peerDependencies)"/m;
const DRIZZLE_TABLE_RE = /^\+.*pgTable\(/m;
const ENV_KEY_RE = /^\+.*\benv\.[A-Z0-9_]+/m;

export function detectNewDecisions(diff: string): boolean {
  if (!diff) {
    return false;
  }
  return (
    EXPORT_RE.test(diff) ||
    PACKAGE_JSON_DEP_RE.test(diff) ||
    DRIZZLE_TABLE_RE.test(diff) ||
    ENV_KEY_RE.test(diff)
  );
}
