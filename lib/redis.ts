import Redis from "ioredis";

const g = globalThis as unknown as { _redis?: Redis };

function createClient(): Redis {
  const url = process.env.REDIS_URL ?? "redis://localhost:6379";
  const password = process.env.REDIS_PASSWORD || undefined;
  const client = new Redis(url, {
    password,
    lazyConnect: false,
    enableReadyCheck: true,
    retryStrategy: (times) => Math.min(times * 1000, 30000),
  });
  let errLogged = false;
  client.on("error", (err: Error) => {
    if (!errLogged) {
      console.error("[redis]", err.message);
      errLogged = true;
    }
  });
  client.on("connect", () => { errLogged = false; });
  return client;
}

export const redis: Redis = g._redis ?? (g._redis = createClient());
