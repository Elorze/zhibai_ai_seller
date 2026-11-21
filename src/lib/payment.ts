import { env } from "./env";
import { cnyToUsdtBase, getPaymentTtlMinutes } from "./usdt-amount";

export { cnyToUsdtBase, getPaymentTtlMinutes };

export function getUsdtConfig() {
  return {
    address: env("USDT_ADDRESS", "TYourUsdtAddressHere"),
    network: env("USDT_NETWORK", "USDT-TRC20"),
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
