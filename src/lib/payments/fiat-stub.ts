import type { PaymentProvider } from "./types";

/** Placeholder for Alipay/WeChat → USDT aggregators; not enabled yet. */
export const fiatStubProvider: PaymentProvider = {
  id: "fiat_stub",
  label: "支付宝/微信代收（未接入）",
  enabled: false,
};
