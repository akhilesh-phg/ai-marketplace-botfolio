import { expect, test } from '@playwright/test';

test('GET /health returns ok:true', async ({ request, baseURL }) => {
  const response = await request.get(`${baseURL}/health`);

  expect(response.status()).toBe(200);

  const body = (await response.json()) as { ok?: boolean };

  expect(body.ok).toBe(true);
});
