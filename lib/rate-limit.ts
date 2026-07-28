import { redis } from "./redis";

const MAX_ATTEMPTS = 5;
const LOCKOUT_SECONDS = 30 * 60; // 30 minutes
const WINDOW_SECONDS = 10 * 60; // 10-minute attempt window

export function normalizeUsername(u: string): string {
  return u.replace(/[\p{P}\p{S}\s]+/gu, "").toLowerCase();
}

const cntKey = (t: string, v: string) => `rl:cnt:${t}:${v}`;
const lckKey = (t: string, v: string) => `rl:lock:${t}:${v}`;

export async function checkLockout(
  ip: string,
  username: string,
): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const u = normalizeUsername(username);
    const [ipL, uL] = await redis.mget(lckKey("ip", ip), lckKey("u", u));
    if (ipL !== null || uL !== null) {
      const key = ipL !== null ? lckKey("ip", ip) : lckKey("u", u);
      const ttl = await redis.ttl(key);
      return { blocked: true, retryAfter: Math.max(ttl, 0) };
    }
    return { blocked: false, retryAfter: 0 };
  } catch {
    // Redis unavailable — fail open (don't block logins)
    return { blocked: false, retryAfter: 0 };
  }
}

/** Increment attempt counter and check/set lockout. Called in better-auth before hook. */
export async function recordAndCheck(
  ip: string,
  username: string,
): Promise<{ blocked: boolean; retryAfter: number }> {
  try {
    const u = normalizeUsername(username);

    const existing = await checkLockout(ip, username);
    if (existing.blocked) return existing;

    const ipK = cntKey("ip", ip);
    const uK = cntKey("u", u);

    const [ipCnt, uCnt] = await Promise.all([redis.incr(ipK), redis.incr(uK)]);

    if (ipCnt === 1) await redis.expire(ipK, WINDOW_SECONDS);
    if (uCnt === 1) await redis.expire(uK, WINDOW_SECONDS);

    if (ipCnt > MAX_ATTEMPTS || uCnt > MAX_ATTEMPTS) {
      await Promise.all([
        redis.set(lckKey("ip", ip), "1", "EX", LOCKOUT_SECONDS),
        redis.set(lckKey("u", u), "1", "EX", LOCKOUT_SECONDS),
        redis.del(ipK, uK),
      ]);
      return { blocked: true, retryAfter: LOCKOUT_SECONDS };
    }

    return { blocked: false, retryAfter: 0 };
  } catch {
    // Redis unavailable — fail open
    return { blocked: false, retryAfter: 0 };
  }
}

/** Reset attempt counters on successful sign-in. */
export async function resetOnSuccess(ip: string, username: string): Promise<void> {
  try {
    const u = normalizeUsername(username);
    await redis.del(cntKey("ip", ip), cntKey("u", u));
  } catch {
    // ignore
  }
}
