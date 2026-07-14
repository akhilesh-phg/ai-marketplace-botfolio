import { env } from '@t/config';
import { createClient, type SupabaseClient } from '@supabase/supabase-js';

export type AuthUser = { userId: string; email: string };

// eslint-disable-next-line @typescript-eslint/no-unsafe-assignment -- @supabase/supabase-js types createClient with `any` generics; the auth.getUser surface we use is unit-tested
let authClient: SupabaseClient = createClient(env.SUPABASE_URL, env.SUPABASE_ANON_KEY, {
  auth: { autoRefreshToken: false, persistSession: false },
});

/** Test-only override for mocking `auth.getUser`. */
export function setAuthClientForTesting(client: SupabaseClient): void {
  authClient = client;
}

export async function verifyBearerToken(
  authorizationHeader: string | undefined,
): Promise<AuthUser | null> {
  if (!authorizationHeader?.startsWith('Bearer ')) {
    return null;
  }

  const token = authorizationHeader.slice('Bearer '.length).trim();
  if (!token) {
    return null;
  }

  const { data, error } = await authClient.auth.getUser(token);
  if (error || !data.user) {
    return null;
  }

  return { userId: data.user.id, email: data.user.email ?? '' };
}
