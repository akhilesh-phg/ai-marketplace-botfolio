import { env } from '@/lib/env';

export function getSupabasePublicConfig(): { url: string; anonKey: string } {
  const url = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const anonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;
  return { url, anonKey };
}
