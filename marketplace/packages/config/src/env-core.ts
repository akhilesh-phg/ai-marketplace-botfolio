import { z } from 'zod';

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  SUPABASE_URL: z.string().min(1),
  SUPABASE_ANON_KEY: z.string().min(1),
  SUPABASE_SERVICE_ROLE_KEY: z.string().min(1),
  NEXT_PUBLIC_SUPABASE_URL: z.string().optional(),
  NEXT_PUBLIC_SUPABASE_ANON_KEY: z.string().optional(),
  R2_ACCOUNT_ID: z.string().min(1),
  R2_ACCESS_KEY_ID: z.string().min(1),
  R2_SECRET_ACCESS_KEY: z.string().min(1),
  R2_BUCKET: z.string().min(1),
  R2_ENDPOINT: z.string().min(1),
  INNGEST_EVENT_KEY: z.string().min(1),
  INNGEST_SIGNING_KEY: z.string().min(1),
  SENTRY_DSN: z.string().min(1),
  DATADOG_API_KEY: z.string().min(1),
  RESEND_API_KEY: z.string().min(1),
  OPENAI_API_KEY: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().min(1),
  API_BASE_URL: z.string().min(1),
  NEXT_PUBLIC_API_BASE_URL: z.string().optional(),
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
});

export type Env = z.infer<typeof envSchema>;

// Build steps (Vercel `next build`, CI `pnpm build`) compile code that imports
// these env modules but never execute the request-time paths that actually read
// secrets. Demanding every runtime secret at build time is wrong and blocks
// deploys, so validation is bypassed there. Real serverless/runtime invocations
// (no build lifecycle, no skip flag) still validate strictly and fail loud.
function shouldSkipValidation(source: Record<string, string | undefined>): boolean {
  const skipFlag = source.SKIP_ENV_VALIDATION;
  return (
    skipFlag === '1' ||
    skipFlag === 'true' ||
    source.NEXT_PHASE === 'phase-production-build' ||
    source.npm_lifecycle_event === 'build'
  );
}

export function parseEnv(source: Record<string, string | undefined>): Env {
  const result = envSchema.safeParse(source);
  if (result.success) {
    return result.data;
  }
  if (shouldSkipValidation(source)) {
    return source as unknown as Env;
  }
  throw new Error(`Invalid environment: ${result.error.message}`);
}
