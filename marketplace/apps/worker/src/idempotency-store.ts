export type IdempotencyStore = {
  get(key: string): unknown;
  set(key: string, value: unknown): void;
};

export function createMemoryIdempotencyStore(): IdempotencyStore & { clear(): void } {
  const seen = new Map<string, unknown>();

  return {
    get(key: string) {
      return seen.get(key);
    },
    set(key: string, value: unknown) {
      seen.set(key, value);
    },
    clear() {
      seen.clear();
    },
  };
}

let activeStore: IdempotencyStore = createMemoryIdempotencyStore();

export function getIdempotencyStore(): IdempotencyStore {
  return activeStore;
}

export function setIdempotencyStore(store: IdempotencyStore): void {
  activeStore = store;
}

export function resetIdempotencyStore(): void {
  activeStore = createMemoryIdempotencyStore();
}
