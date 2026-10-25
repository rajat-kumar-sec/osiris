type Entry<T> = {
  value: T;
  at: number;
  source: string;
  hit: number;
};

const store = new Map<string, Entry<unknown>>();
const inflight = new Map<string, Promise<unknown>>();

const REDIS_URL = process.env.UPSTASH_REDIS_REST_URL;
const REDIS_TOKEN = process.env.UPSTASH_REDIS_REST_TOKEN;

async function redisGet<T>(key: string): Promise<Entry<T> | null> {
  if (!REDIS_URL || !REDIS_TOKEN) return null;
  try {
    const res = await fetch(`${REDIS_URL}/get/${encodeURIComponent(key)}`, {
      headers: { Authorization: `Bearer ${REDIS_TOKEN}` },
      cache: "no-store",
    });
    if (!res.ok) return null;
    const json = (await res.json()) as { result?: string | null };
    if (!json.result) return null;
    return JSON.parse(json.result) as Entry<T>;
  } catch {
    return null;
  }
}

async function redisSet<T>(key: string, entry: Entry<T>, ttlSec: number) {
  if (!REDIS_URL || !REDIS_TOKEN) return;
  try {
    await fetch(`${REDIS_URL}/set/${encodeURIComponent(key)}?EX=${Math.max(60, Math.ceil(ttlSec))}`, {
      method: "POST",
      headers: { Authorization: `Bearer ${REDIS_TOKEN}`, "Content-Type": "application/json" },
      body: JSON.stringify(entry),
      cache: "no-store",
    });
  } catch {
    /* cache is best-effort */
  }
}

export type CacheResult<T> = {
  value: T;
  at: number;
  source: string;
  cached: boolean;
  stale: boolean;
  ageMs: number;
};

/**
 * Stale-while-revalidate cache with single-flight loading.
 * Serves stale data instantly while refreshing in the background,
 * so the UI never blocks on a slow upstream.
 */
export async function serve<T>(
  key: string,
  ttlMs: number,
  source: string,
  loader: () => Promise<T>,
): Promise<CacheResult<T>> {
  const now = Date.now();
  let entry = store.get(key) as Entry<T> | undefined;

  if (!entry) {
    entry = (await redisGet<T>(key)) ?? undefined;
    if (entry) store.set(key, entry as Entry<unknown>);
  }

  if (entry) {
    const age = now - entry.at;
    const stale = age > ttlMs;
    if (stale) {
      // refresh in the background, never block the request
      if (!inflight.has(key)) {
        const p = (async () => {
          try {
            const value = await loader();
            const fresh: Entry<T> = { value, at: Date.now(), source, hit: 0 };
            store.set(key, fresh as Entry<unknown>);
            void redisSet(key, fresh, Math.ceil((ttlMs * 6) / 1000));
          } catch {
            /* keep serving stale */
          } finally {
            inflight.delete(key);
          }
        })();
        inflight.set(key, p);
      }
    }
    entry.hit++;
    return { value: entry.value, at: entry.at, source: entry.source, cached: true, stale, ageMs: age };
  }

  if (inflight.has(key)) {
    const value = (await inflight.get(key)) as T;
    const e = store.get(key) as Entry<T>;
    return { value, at: e?.at ?? Date.now(), source: e?.source ?? source, cached: true, stale: false, ageMs: 0 };
  }

  const p = loader();
  inflight.set(key, p);
  try {
    const value = await p;
    const fresh: Entry<T> = { value, at: Date.now(), source, hit: 1 };
    store.set(key, fresh as Entry<unknown>);
    void redisSet(key, fresh, Math.ceil((ttlMs * 6) / 1000));
    return { value, at: fresh.at, source, cached: false, stale: false, ageMs: 0 };
  } finally {
    inflight.delete(key);
  }
}

export function cacheStats() {
  return {
    keys: store.size,
    entries: [...store.entries()].map(([k, v]) => ({
      key: k,
      ageMs: Date.now() - v.at,
      hits: v.hit,
    })),
    redis: Boolean(REDIS_URL && REDIS_TOKEN),
  };
}
