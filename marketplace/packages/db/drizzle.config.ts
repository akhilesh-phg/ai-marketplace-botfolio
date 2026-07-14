import { defineConfig } from 'drizzle-kit';
import { parse } from 'dotenv';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

const packageDir = fileURLToPath(new URL('.', import.meta.url));

function getDatabaseUrl(): string {
  const envPath = resolve(packageDir, '../../.env');
  const parsed = parse(readFileSync(envPath, 'utf8'));
  const databaseUrl = parsed.DATABASE_URL;
  if (!databaseUrl) {
    throw new Error('DATABASE_URL is required in project-trillion/.env for drizzle-kit');
  }
  return databaseUrl;
}

export default defineConfig({
  schema: resolve(packageDir, 'src/schema'),
  out: resolve(packageDir, 'migrations'),
  dialect: 'postgresql',
  dbCredentials: {
    url: getDatabaseUrl(),
  },
});
