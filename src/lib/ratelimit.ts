type Bucket = { tokens: number; updated: number };

const buckets = new Map<string, Bucket>();

export function rateLimit(key: string, limit: number, windowMs: number) {
  const now = Date.now();
  const b = buckets.get(key) ?? { tokens: limit, updated: now };
  const refill = ((now - b.updated) / windowMs) * limit;
  b.tokens = Math.min(limit, b.tokens + refill);
  b.updated = now;
  const allowed = b.tokens >= 1;
  if (allowed) b.tokens -= 1;
  buckets.set(key, b);
  return {
    allowed,
    remaining: Math.floor(b.tokens),
    resetMs: Math.ceil((limit - b.tokens) * (windowMs / limit)),
  };
}

export function clientIp(req: Request): string {
  const h = req.headers;
  return (
    h.get("cf-connecting-ip") ||
    h.get("x-real-ip") ||
    h.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    "127.0.0.1"
  );
}
