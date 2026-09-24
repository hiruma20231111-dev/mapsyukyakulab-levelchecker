// 軽量ストア接続（Upstash/Vercel Redis を REDIS_URL でTCP接続）。サーバー専用。
import Redis from "ioredis";

// 接続URLを解決。プレフィックス付き（例 maps_REDIS_URL）にも対応するため、
// 明示名→一般スキャン（*_REDIS_URL / *_KV_URL）の順で最初に値のあるものを使う。
export function resolveStoreUrl(): string {
  if (process.env.REDIS_URL) return process.env.REDIS_URL;
  if (process.env.KV_URL) return process.env.KV_URL;
  const hit = Object.entries(process.env).find(
    ([k, v]) => !!v && /(^|_)(REDIS|KV)_URL$/i.test(k) && /^rediss?:\/\//i.test(String(v)),
  );
  return hit ? String(hit[1]) : "";
}

const URL = resolveStoreUrl();

let client: Redis | null = null;
export function getClient(): Redis | null {
  if (!URL) return null;
  if (!client) {
    client = new Redis(URL, { maxRetriesPerRequest: 2, enableReadyCheck: false, lazyConnect: false });
    client.on("error", () => {}); // 例外でクラッシュさせない
  }
  return client;
}

export function storeReady(): boolean {
  return !!URL;
}
