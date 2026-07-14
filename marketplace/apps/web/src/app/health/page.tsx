import { env } from '@/lib/env';

import { Card, CardContent, CardHeader, CardTitle } from '@/components/ui/card';

export const dynamic = 'force-dynamic';

type HealthResponse = {
  ok: boolean;
  service?: string;
  version?: string;
  ts?: string;
};

export default async function HealthPage() {
  const response = await fetch(`${env.NEXT_PUBLIC_API_BASE_URL}/health`, {
    cache: 'no-store',
  });

  const health = (await response.json()) as HealthResponse;

  return (
    <main className="flex min-h-screen items-center justify-center p-6">
      <Card className="w-full max-w-md">
        <CardHeader>
          <CardTitle>API health</CardTitle>
        </CardHeader>
        <CardContent>
          <p data-testid="api-health-status">{health.ok ? 'ok' : 'error'}</p>
        </CardContent>
      </Card>
    </main>
  );
}
