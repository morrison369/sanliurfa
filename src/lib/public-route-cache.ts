type CacheEntry<T> = {
  expiresAt: number;
  data: T;
};

const DEFAULT_PUBLIC_ROUTE_CACHE_TTL_MS = Math.max(
  0,
  Number(process.env.PUBLIC_ROUTE_CACHE_TTL_MS || 60_000),
);

const publicRouteCache = new Map<string, CacheEntry<unknown>>();
const publicRouteInflight = new Map<string, Promise<unknown>>();

export async function getCachedPublicRouteData<T>(
  key: string,
  loader: () => Promise<T>,
  ttlMs = DEFAULT_PUBLIC_ROUTE_CACHE_TTL_MS,
): Promise<T> {
  const cached = publicRouteCache.get(key);
  if (cached && cached.expiresAt > Date.now()) {
    return cached.data as T;
  }

  const inflight = publicRouteInflight.get(key);
  if (inflight) return inflight as Promise<T>;

  const promise = loader()
    .then((data) => {
      publicRouteCache.set(key, {
        expiresAt: Date.now() + Math.max(0, ttlMs),
        data,
      });
      return data;
    })
    .finally(() => {
      publicRouteInflight.delete(key);
    });

  publicRouteInflight.set(key, promise);
  return promise;
}

export function clearPublicRouteCacheForTests(): void {
  publicRouteCache.clear();
  publicRouteInflight.clear();
}
