export type PaymentChannelId = "usdt_trc20" | "fiat_stub";

export type PaymentProvider = {
  id: PaymentChannelId;
  label: string;
  enabled: boolean;
};
