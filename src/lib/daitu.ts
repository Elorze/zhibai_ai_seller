import crypto from "crypto";
import { env, envMode } from "./env";

type Dict = Record<string, string | number>;

function getConfig() {
  const baseUrl = env("DAITU_BASE_URL", "https://daituai.cc").replace(/\/$/, "");
  const appId = env("DAITU_APP_ID");
  const appKey = env("DAITU_APP_KEY");
  const dryRun =
    envMode("DAITU_FULFILL_DRY_RUN", env("DAITU_FULFILL_DRY_RUN", "0")) === "1";
  return { baseUrl, appId, appKey, dryRun };
}

export function isDaituDryRun() {
  return getConfig().dryRun;
}

export function signPayload(data: Dict, appKey: string) {
  const filtered = Object.entries(data)
    .filter(([k, v]) => k !== "sign" && v !== "" && v !== undefined && v !== null)
    .sort(([a], [b]) => (a < b ? -1 : a > b ? 1 : 0));
  const qs = filtered.map(([k, v]) => `${k}=${v}`).join("&");
  return crypto.createHash("md5").update(`${qs}&key=${appKey}`).digest("hex");
}

async function postForm(path: string, data: Dict = {}) {
  const { baseUrl, appId, appKey } = getConfig();
  if (!appId || !appKey) {
    throw new Error("缺少 DAITU_APP_ID / DAITU_APP_KEY");
  }
  const payload: Dict = { ...data, app_id: appId };
  payload.sign = signPayload(payload, appKey);
  const body = new URLSearchParams();
  for (const [k, v] of Object.entries(payload)) {
    body.set(k, String(v));
  }
  const res = await fetch(`${baseUrl}${path}`, {
    method: "POST",
    headers: {
      "Content-Type": "application/x-www-form-urlencoded",
      Accept: "application/json",
      "User-Agent": "zhibai-seller/0.1",
    },
    body,
    cache: "no-store",
    signal: AbortSignal.timeout(8000),
  });
  const text = await res.text();
  try {
    return JSON.parse(text) as {
      code: number;
      msg?: string;
      data?: unknown;
    };
  } catch {
    throw new Error(`带土接口返回非 JSON: HTTP ${res.status}`);
  }
}

export async function daituConnect() {
  return postForm("/shared/authentication/connect");
}

export async function daituTrade(input: {
  sharedCode: string;
  num?: number;
  contact: string;
  requestNo: string;
}) {
  const { dryRun } = getConfig();
  if (dryRun) {
    return {
      code: 200,
      msg: "dry-run",
      data: {
        tradeNo: `DRY${input.requestNo}`,
        amount: "0.00",
        secret: `DRY-RUN-SECRET-${input.sharedCode}`,
        stock: "999",
      },
    };
  }
  return postForm("/shared/commodity/trade", {
    shared_code: input.sharedCode,
    num: input.num ?? 1,
    contact: input.contact,
    request_no: input.requestNo.slice(0, 16),
    device: 0,
  });
}

export async function daituQuery(tradeNo: string) {
  return postForm("/shared/commodity/query", { tradeNo });
}
