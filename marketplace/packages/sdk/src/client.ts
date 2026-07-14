import type { HealthResponse } from '@t/contracts';
import createClient from 'openapi-fetch';

import type { paths } from './generated/schema.js';

export type TrillionOptions = {
  baseUrl: string;
};

export class Trillion {
  private readonly client: ReturnType<typeof createClient<paths>>;

  constructor({ baseUrl }: TrillionOptions) {
    this.client = createClient<paths>({ baseUrl });
  }

  async health(): Promise<HealthResponse> {
    const { data, error } = await this.client.GET('/health');

    if (error !== undefined || data === undefined) {
      throw new Error('Health check failed');
    }

    return data;
  }
}
