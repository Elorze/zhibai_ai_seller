import { env, envMode } from "./env";
import { cnyToUsdtBase, getPaymentTtlMinutes } from "./usdt-amount";

export { cnyToUsdtBase, getPaymentTtlMinutes };

/** Official USDT TRC20 on Tron mainnet */
export const USDT_TRC20_MAINNET = "TR7NHqjeKQxGTCi8q8ZY4pL8otSzgjLj6t";
/** Nile testnet USDT TRC20 (faucet: https://nileex.io/join/getJoinPage) */
export const USDT_TRC20_NILE = "TXYZopYRdj2D9XRtbG411XZZ3kM5VkAeBf";

export function getUsdtConfig() {
  const network = envMode("USDT_NETWORK", "USDT-TRC20");
  const networkLower = network.toLowerCase();
  const isTestnet =
    envMode("USDT_TESTNET") === "1" ||
    networkLower.includes("nile") ||
    networkLower.includes("shasta") ||
    networkLower.includes("test");
  const defaultContract = isTestnet ? USDT_TRC20_NILE : USDT_TRC20_MAINNET;
  const contract = envMode("USDT_TRC20_CONTRACT", defaultContract);
  return {
    address: envMode("USDT_ADDRESS", "TYourUsdtAddressHere"),
    network,
    contract,
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
  return envMode("ALLOW_PAYMENT_SIMULATE", env("ALLOW_PAYMENT_SIMULATE", "0")) === "1";
}
