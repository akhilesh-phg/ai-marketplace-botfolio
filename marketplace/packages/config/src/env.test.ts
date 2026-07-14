import { describe, expect, it } from 'vitest';

import { parseEnv } from './env-core.js';

const validEnv: Record<string, string> = {
  DATABASE_URL: 'postgres://localhost/db',
  SUPABASE_URL: 'https://example.supabase.co',
  SUPABASE_ANON_KEY: 'anon-key',
  SUPABASE_SERVICE_ROLE_KEY: 'service-role-key',
  R2_ACCOUNT_ID: 'account',
  R2_ACCESS_KEY_ID: 'access',
  R2_SECRET_ACCESS_KEY: 'secret',
  R2_BUCKET: 'bucket',
  R2_ENDPOINT: 'https://r2.example.com',
  INNGEST_EVENT_KEY: 'inngest-event',
  INNGEST_SIGNING_KEY: 'inngest-signing',
  SENTRY_DSN: 'https://sentry.example.com',
  DATADOG_API_KEY: 'datadog',
  RESEND_API_KEY: 'resend',
  OPENAI_API_KEY: 'openai',
  ANTHROPIC_API_KEY: 'anthropic',
  API_BASE_URL: 'http://localhost:8787',
};

describe('parseEnv', () => {
  it('accepts all required keys', () => {
    const env = parseEnv(validEnv);
    expect(env.DATABASE_URL).toBe(validEnv.DATABASE_URL);
  });

  it('rejects a missing required key', () => {
    const incomplete = { ...validEnv };
    delete incomplete.DATABASE_URL;
    expect(() => parseEnv(incomplete)).toThrow(/Invalid environment/);
  });

  it('allows optional NEXT_PUBLIC_* keys to be absent', () => {
    const env = parseEnv(validEnv);
    expect(env.NEXT_PUBLIC_SUPABASE_URL).toBeUndefined();
  });
});
