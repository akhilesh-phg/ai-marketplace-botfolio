export interface Metrics {
  increment(name: string, value?: number, tags?: Record<string, string>): void;
  gauge(name: string, value: number, tags?: Record<string, string>): void;
  timing(name: string, ms: number, tags?: Record<string, string>): void;
}

export class NoopMetrics implements Metrics {
  increment(_name: string, _value?: number, _tags?: Record<string, string>): void {}

  gauge(_name: string, _value: number, _tags?: Record<string, string>): void {}

  timing(_name: string, _ms: number, _tags?: Record<string, string>): void {}
}

export const defaultMetrics: Metrics = new NoopMetrics();
