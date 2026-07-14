import { LoginForm } from '@/components/login-form';
import { env } from '@/lib/env';

export default function LoginPage() {
  const supabaseUrl = env.NEXT_PUBLIC_SUPABASE_URL ?? env.SUPABASE_URL;
  const supabaseAnonKey = env.NEXT_PUBLIC_SUPABASE_ANON_KEY ?? env.SUPABASE_ANON_KEY;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <LoginForm supabaseUrl={supabaseUrl} supabaseAnonKey={supabaseAnonKey} />
    </main>
  );
}
