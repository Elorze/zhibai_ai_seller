import crypto from "crypto";
import { env } from "./env";

type StockMap = Record<string, number>;

let cache: { at: number; map: StockMap } | null = null;
const CACHE_MS = 60_000;

function sign(data: Record<string, string | number>, appKey: string) {
  const filtered = Object.entries(data)
    .filter(([k, v]) => k !== "sign" && v !== "" && v !== undefined && v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const qs = filtered.map(([k, v]) => `${k}=${v}`).join("&");
  return crypto.createHash("md5").update(`${qs}&key=${appKey}`).digest("hex");
}

async function fetchItemsStockMap(): Promise<StockMap> {
  const baseUrl = env("DAITU_BASE_URL", "https://daituai.cc").replace(/\/$/, "");
  const appId = env("DAITU_APP_ID");
  const appKey = env("DAITU_APP_KEY");
  if (!appId || !appKey) return {};

  const payload: Record<string, string | number> = { app_id: appId };
  payload.sign = sign(payload, appKey);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) body.set(k, String(v));

  const res = await fetch(`${baseUrl}/shared/commodity/items`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "magfield-seller/0.2",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(12_000),
  });
  const rawText = (await res.text()).replace(/^\uFEFF/, "");
  const json = JSON.parse(rawText) as {
    code?: number;
    data?: Array<{ children?: Array<{ code?: string; stock?: number | string }> }>;
  };
  if (json.code !== 200 || !Array.isArray(json.data)) return {};

  const map: StockMap = {};
  for (const cat of json.data) {
    for (const child of cat.children || []) {
      if (!child.code) continue;
      const n = Number(child.stock);
      map[child.code] = Number.isFinite(n) ? n : 0;
    }
  }
  return map;
}

/** Returns stock by daitu_code. On failure returns null (caller should not force OOS). */
export async function getDaituStockByCode(): Promise<StockMap | null> {
  const now = Date.now();
  if (cache && now - cache.at < CACHE_MS) return cache.map;
  try {
    const map = await fetchItemsStockMap();
    cache = { at: now, map };
    return map;
  } catch {
    return cache?.map ?? null;
  }
}

export function isInStock(stockMap: StockMap | null, daituCode: string) {
  if (!stockMap) return true; // unknown → allow click; API will fail if truly OOS
  if (!(daituCode in stockMap)) return true;
  return stockMap[daituCode] > 0;
}
