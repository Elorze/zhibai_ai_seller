import { envMode } from "./env";
import {
  getUsdtConfig,
  XLAYER_SCAN_FALLBACK_BLOCKS,
} from "./payment";

export type ChainTransfer = {
  txId: string;
  to: string;
  from: string;
  amountUsdt: number;
  confirmed: boolean;
  blockTimestamp?: number;
};

/** ERC-20 Transfer(address,address,uint256) */
const TRANSFER_TOPIC =
  "0xddf252ad1be2c89b69c2b068fc378daa952ba7f163c4a11628f55a4df523b3ef";

/** Public X Layer RPC caps eth_getLogs range (commonly 100 blocks). */
const LOG_CHUNK = 100;
const CHUNK_DELAY_MS = 140;

function sleep(ms: number) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function padTopicAddress(addr: string) {
  const hex = addr.replace(/^0x/i, "").toLowerCase();
  return `0x${hex.padStart(64, "0")}`;
}

async function rpcOnce<T>(
  url: string,
  method: string,
  params: unknown[],
): Promise<T> {
  const res = await fetch(url, {
    method: "POST",
    headers: { "Content-Type": "application/json", Accept: "application/json" },
    body: JSON.stringify({ jsonrpc: "2.0", id: 1, method, params }),
    signal: AbortSignal.timeout(20000),
  });
  if (!res.ok) throw new Error(`X Layer RPC HTTP ${res.status}`);
  const json = (await res.json()) as {
    result?: T;
    error?: { message?: string; code?: number };
  };
  if (json.error) {
    throw new Error(json.error.message || "X Layer RPC error");
  }
  return json.result as T;
}

async function rpc<T>(method: string, params: unknown[]): Promise<T> {
  const urls = getUsdtConfig().rpcUrls;
  let lastErr: Error | undefined;
  for (let i = 0; i < urls.length; i++) {
    try {
      return await rpcOnce<T>(urls[i], method, params);
    } catch (err) {
      lastErr = err instanceof Error ? err : new Error(String(err));
      // try next URL on rate limit / timeout / HTTP / RPC errors
    }
  }
  throw lastErr || new Error("X Layer RPC unavailable");
}

function sunToUsdt(valueHex: string) {
  const n = Number(BigInt(valueHex || "0x0"));
  if (!Number.isFinite(n)) return 0;
  return Math.round((n / 1e6) * 1e6) / 1e6;
}

function normalizeTxId(txId: string) {
  const t = txId.trim();
  if (/^0x[a-fA-F0-9]{64}$/.test(t)) return t.toLowerCase();
  if (/^[a-fA-F0-9]{64}$/.test(t)) return `0x${t.toLowerCase()}`;
  throw new Error("交易号格式无效（应为 0x + 64 位十六进制）");
}

function mapLog(log: {
  transactionHash?: string;
  topics?: string[];
  data?: string;
}): ChainTransfer | null {
  const txId = (log.transactionHash || "").toLowerCase();
  if (!txId) return null;
  const fromTopic = log.topics?.[1] || "";
  const toTopic = log.topics?.[2] || "";
  const from = `0x${fromTopic.slice(-40)}`;
  const to = `0x${toTopic.slice(-40)}`;
  const amountUsdt = sunToUsdt(log.data || "0x0");
  if (amountUsdt <= 0) return null;
  return { txId, to, from, amountUsdt, confirmed: true };
}

export async function getBlockNumber() {
  const hex = await rpc<string>("eth_blockNumber", []);
  return Number.parseInt(hex, 16);
}

export type FetchTransfersOpts = {
  fromBlock?: number | null;
  limit?: number;
};

export async function fetchRecentUsdtTransfersTo(
  address: string,
  limitOrOpts: number | FetchTransfersOpts = 50,
): Promise<ChainTransfer[]> {
  const opts: FetchTransfersOpts =
    typeof limitOrOpts === "number" ? { limit: limitOrOpts } : limitOrOpts;
  const limit = opts.limit ?? 50;
  const { contract } = getUsdtConfig();
  const latest = await getBlockNumber();
  const start =
    typeof opts.fromBlock === "number" && Number.isFinite(opts.fromBlock)
      ? Math.max(0, Math.floor(opts.fromBlock))
      : Math.max(0, latest - XLAYER_SCAN_FALLBACK_BLOCKS);
  const toTopic = padTopicAddress(address);
  const collected: ChainTransfer[] = [];

  // Scan newest → oldest within [start, latest]
  for (
    let toBlock = latest;
    toBlock >= start && collected.length < limit;
    toBlock -= LOG_CHUNK
  ) {
    const fromBlock = Math.max(start, toBlock - (LOG_CHUNK - 1));
    const logs = await rpc<
      Array<{
        transactionHash: string;
        topics: string[];
        data: string;
      }>
    >("eth_getLogs", [
      {
        fromBlock: `0x${fromBlock.toString(16)}`,
        toBlock: `0x${toBlock.toString(16)}`,
        address: contract,
        topics: [TRANSFER_TOPIC, null, toTopic],
      },
    ]);
    for (const log of logs || []) {
      const row = mapLog(log);
      if (row) collected.push(row);
    }
    if (fromBlock > start) await sleep(CHUNK_DELAY_MS);
  }

  const seen = new Set<string>();
  const out: ChainTransfer[] = [];
  for (const row of collected) {
    if (seen.has(row.txId)) continue;
    seen.add(row.txId);
    out.push(row);
    if (out.length >= limit) break;
  }
  return out;
}

export async function getUsdtTransferByTxId(
  txId: string,
): Promise<ChainTransfer | null> {
  const clean = normalizeTxId(txId);
  const receipt = await rpc<{
    status?: string;
    logs?: Array<{
      address?: string;
      topics?: string[];
      data?: string;
      transactionHash?: string;
    }>;
  } | null>("eth_getTransactionReceipt", [clean]);

  if (!receipt) return null;
  const confirmed = receipt.status === "0x1";
  const { contract, address: merchant } = getUsdtConfig();
  const contractLc = contract.toLowerCase();

  for (const log of receipt.logs || []) {
    if ((log.address || "").toLowerCase() !== contractLc) continue;
    if ((log.topics?.[0] || "").toLowerCase() !== TRANSFER_TOPIC) continue;
    const mapped = mapLog({ ...log, transactionHash: clean });
    if (!mapped) continue;
    if (!addressesEqual(mapped.to, merchant)) continue;
    return { ...mapped, confirmed };
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

export function xlayerConfirmations() {
  const n = Number(envMode("XLAYER_CONFIRMATIONS", "1"));
  return Number.isFinite(n) && n > 0 ? n : 1;
}
