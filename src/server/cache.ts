type CacheEntry = {
  value: any;
  expiresAt: number;
};

class MemoryCache {
  private store = new Map<string, CacheEntry>();

  get<T>(key: string): T | null {
    const entry = this.store.get(key);
    if (!entry) return null;
    if (Date.now() > entry.expiresAt) {
      this.store.delete(key);
      return null;
    }
    return entry.value as T;
  }

  set(key: string, value: any, ttlSeconds = 120) {
    this.store.set(key, {
      value,
      expiresAt: Date.now() + ttlSeconds * 1000,
    });
  }

  invalidate(...prefixes: string[]) {
    for (const key of this.store.keys()) {
      if (prefixes.some((prefix) => key.startsWith(prefix))) {
        this.store.delete(key);
      }
    }
  }
}

export const cache = new MemoryCache();
