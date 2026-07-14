import * as Sentry from '@sentry/node';

type CaptureFn = (error: unknown) => void;

let captureFn: CaptureFn = (error) => {
  Sentry.captureException(error);
};

export function captureException(error: unknown): void {
  captureFn(error);
}

export function setCaptureException(fn: CaptureFn): void {
  captureFn = fn;
}

export function resetCaptureException(): void {
  captureFn = (error) => {
    Sentry.captureException(error);
  };
}
