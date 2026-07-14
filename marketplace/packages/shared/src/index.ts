export { AppError } from './app-error.js';
export { defaultMetrics, NoopMetrics, type Metrics } from './metrics.js';
export { parseOrError } from './parse-or-error.js';
export { err, ok, type Result } from './result.js';

export function identity<T>(x: T): T {
  return x;
}
