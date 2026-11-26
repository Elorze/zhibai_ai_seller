import { env, envMode } from "./env";
import { cnyToUsdtBase, getPaymentTtlMinutes } from "./usdt-amount";

export { cnyToUsdtBase, getPaymentTtlMinutes };

/** USDT0 on OKX X Layer mainnet (6 decimals) */
export const USDT_XLAYER_CONTRACT =
  "0x779Ded0c9e1022225f8E0630b35a9b54bE713736";

export const XLAYER_CHAIN_ID_DEFAULT = 196;
export const XLAYER_RPC_DEFAULT = "https://rpc.xlayer.tech";
export const XLAYER_RPC_FALLBACK = "https://xlayerrpc.okx.com";
/** Blocks before order creation to start scanning (clock / tip skew). */
export const XLAYER_SCAN_BLOCK_MARGIN = 60;
/** Lookback when order has no scan_from_block. */
export const XLAYER_SCAN_FALLBACK_BLOCKS = 2000;

export function getXlayerRpcUrls() {
  const listed = envMode("XLAYER_RPC_URLS", "")
    .split(",")
    .map((s) => s.trim().replace(/\/$/, ""))
    .filter(Boolean);
  if (listed.length) return listed;
  const primary = envMode("XLAYER_RPC_URL", XLAYER_RPC_DEFAULT).replace(
    /\/$/,
    "",
  );
  const urls = [primary];
  if (primary !== XLAYER_RPC_FALLBACK) urls.push(XLAYER_RPC_FALLBACK);
  return urls;
}

export function getUsdtConfig() {
  const network = envMode("USDT_NETWORK", "USDT-XLAYER");
  const networkLower = network.toLowerCase();
  const isTestnet =
    envMode("USDT_TESTNET") === "1" ||
    networkLower.includes("test") ||
    networkLower.includes("sepolia");
  const contract = envMode("USDT_CONTRACT", USDT_XLAYER_CONTRACT);
  const chainId = Number(
    envMode("XLAYER_CHAIN_ID", String(XLAYER_CHAIN_ID_DEFAULT)),
  );
  const rpcUrls = getXlayerRpcUrls();
  return {
    address: envMode(
      "USDT_ADDRESS",
      "0xYourUsdtAddressHere",
    ),
    network,
    contract,
    chainId: Number.isFinite(chainId) ? chainId : XLAYER_CHAIN_ID_DEFAULT,
    rpcUrl: rpcUrls[0] || XLAYER_RPC_DEFAULT,
    rpcUrls,
    isTestnet,
  };
}

/** @deprecated prefer cnyToUsdtBase + allocateUniqueUsdtAmount */
export function cnyToUsdt(cny: number) {
  return cnyToUsdtBase(cny);
}

export function paymentStatusLabel(status: string) {
  switch (status) {
    case "paid":
      return "已付款";
    case "failed":
      return "失败";
    case "confirming":
      return "确认中";
    case "expired":
      return "已过期";
    case "manual_review":
      return "人工复核";
    default:
      return "待付款";
  }
}

export function isPaymentSimulateAllowed() {
  return (
    envMode("ALLOW_PAYMENT_SIMULATE", env("ALLOW_PAYMENT_SIMULATE", "0")) === "1"
  );
}

export function isMerchantAddressConfigured(address: string) {
  const a = address.trim().toLowerCase();
  if (!a || a.startsWith("0xyour") || a.includes("placeholder")) return false;
  return /^0x[a-f0-9]{40}$/.test(a);
}
