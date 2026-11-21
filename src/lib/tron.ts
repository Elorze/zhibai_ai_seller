import { env } from "./env";
import { getUsdtConfig } from "./payment";

/** Official USDT TRC20 on Tron mainnet */
export const USDT_TRC20_CONTRACT = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";

export type TronTransfer = {
  txId: string;
  to: string;
  from: string;
  amountUsdt: number;
  confirmed: boolean;
  blockTimestamp?: number;
};

function trongridBase() {
  return env("TRONGRID_BASE_URL", "https://api.trongrid.io").replace(/\/$/, "");
}

function headers(): Record<string, string> {
  const key = env("TRONGRID_API_KEY");
  const h: Record<string, string> = { Accept: "application/json" };
  if (key) h["TRON-PRO-API-KEY"] = key;
  return h;
}

function sunToUsdt(value: string | number) {
  const n = typeof value === "string" ? Number(value) : value;
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1e6) * 1e6) / 1e6;
}

export async function fetchRecentUsdtTransfersTo(
  address: string,
  limit = 50,
): Promise<TronTransfer[]> {
  const url = `${trongridBase()}/v1/accounts/${address}/transactions/trc20?only_to=true&limit=${limit}&contract_address=${USDT_TRC20_CONTRACT}`;
  const res = await fetch(url, {
    headers: headers(),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) {
    throw new Error(`TronGrid HTTP ${res.status}`);
  }
  const json = (await res.json()) as {
    data?: Array<{
      transaction_id: string;
      to: string;
      from: string;
      value: string;
      block_timestamp?: number;
      type?: string;
    }>;
  };
  return (json.data || [])
    .filter((row) => (row.type || "Transfer").toLowerCase().includes("transfer"))
    .map((row) => ({
      txId: row.transaction_id,
      to: row.to,
      from: row.from,
      amountUsdt: sunToUsdt(row.value),
      confirmed: true,
      blockTimestamp: row.block_timestamp,
    }));
}

export async function getUsdtTransferByTxId(
  txId: string,
): Promise<TronTransfer | null> {
  const clean = txId.trim();
  if (!/^[a-fA-F0-9]{64}$/.test(clean)) {
    throw new Error("交易号格式无效（应为 64 位十六进制）");
  }

  const infoUrl = `${trongridBase()}/wallet/gettransactioninfobyid`;
  const res = await fetch(infoUrl, {
    method: "POST",
    headers: { ...headers(), "Content-Type": "application/json" },
    body: JSON.stringify({ value: clean }),
    signal: AbortSignal.timeout(12000),
  });
  if (!res.ok) throw new Error(`TronGrid txinfo HTTP ${res.status}`);
  const info = (await res.json()) as {
    id?: string;
    receipt?: { result?: string };
    log?: Array<{ address?: string; topics?: string[]; data?: string }>;
    blockNumber?: number;
  };

  if (!info || !info.id) return null;

  // Fallback: query trc20 list filtered — if receipt missing, keep confirming
  const confirmed = Boolean(info.blockNumber) && info.receipt?.result !== "FAILED";

  const addrUrl = `${trongridBase()}/v1/transactions/${clean}/events`;
  try {
    const evRes = await fetch(addrUrl, {
      headers: headers(),
      signal: AbortSignal.timeout(12000),
    });
    if (evRes.ok) {
      const evJson = (await evRes.json()) as {
        data?: Array<{
          contract_address?: string;
          result?: { to?: string; from?: string; value?: string };
          event_name?: string;
        }>;
      };
      const usdtCfg = getUsdtConfig();
      for (const ev of evJson.data || []) {
        const contract = (ev.contract_address || "").toLowerCase();
        if (
          contract &&
          !contract.includes(USDT_TRC20_CONTRACT.toLowerCase()) &&
          contract !== USDT_TRC20_CONTRACT.toLowerCase()
        ) {
          // TronGrid may return hex contract; accept Transfer events with value
        }
        if ((ev.event_name || "").toLowerCase() !== "transfer") continue;
        const to = ev.result?.to || "";
        const from = ev.result?.from || "";
        const value = ev.result?.value || "0";
        if (!to) continue;
        return {
          txId: clean,
          to,
          from,
          amountUsdt: sunToUsdt(value),
          confirmed,
        };
      }
    }
  } catch {
    // fall through
  }

  // Last resort: scan recent transfers for this tx id on merchant address
  const merchant = getUsdtConfig().address;
  if (merchant && !merchant.startsWith("TYour")) {
    const recent = await fetchRecentUsdtTransfersTo(merchant, 200);
    const hit = recent.find((t) => t.txId.toLowerCase() === clean.toLowerCase());
    if (hit) return { ...hit, confirmed };
  }

  if (!confirmed) return null;
  return null;
}

export function amountsEqual(a: number, b: number) {
  return Math.abs(a - b) < 0.001;
}

export function addressesEqual(a: string, b: string) {
  return a.trim().toLowerCase() === b.trim().toLowerCase();
}
