type Bucket = { fails: number; resetAt: number };

const buckets = new Map<string, Bucket>();

/** Simple in-memory fail counter. Returns true if allowed. */
export function allowAttempt(key: string, maxFails = 5, windowMs = 60_000) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { fails: 0, resetAt: now + windowMs });
    return true;
  }
  return cur.fails < maxFails;
}

export function recordFail(key: string, windowMs = 60_000) {
  const now = Date.now();
  const cur = buckets.get(key);
  if (!cur || cur.resetAt <= now) {
    buckets.set(key, { fails: 1, resetAt: now + windowMs });
    return;
  }
  cur.fails += 1;
}

export function clientKey(ip: string, emailOrOrder: string) {
  return `${ip}|${emailOrOrder.trim().toLowerCase()}`;
}
