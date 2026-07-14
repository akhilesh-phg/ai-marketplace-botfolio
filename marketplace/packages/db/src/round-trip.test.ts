import { parse } from 'dotenv';
import { eq } from 'drizzle-orm';
import { readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { describe, expect, it } from 'vitest';

function loadDatabaseUrl(): string | undefined {
  const envPath = resolve(fileURLToPath(new URL('.', import.meta.url)), '../../../.env');
  try {
    const parsed = parse(readFileSync(envPath, 'utf8'));
    return parsed.DATABASE_URL;
  } catch {
    return undefined;
  }
}

const databaseUrl = loadDatabaseUrl();

describe.skipIf(!databaseUrl)('db round-trip', () => {
  it('inserts and reads back a _meta row', async () => {
    if (!databaseUrl) {
      throw new Error('DATABASE_URL is unset; skipping db round-trip test');
    }

    const { db } = await import('./client.js');
    const { meta } = await import('./schema/_meta.js');

    const key = `ping-${Date.now()}`;

    await db.insert(meta).values({ key, value: 'pong' });

    const rows = await db.select().from(meta).where(eq(meta.key, key));

    expect(rows).toHaveLength(1);
    expect(rows[0]?.value).toBe('pong');

    await db.delete(meta).where(eq(meta.key, key));
  });
});
