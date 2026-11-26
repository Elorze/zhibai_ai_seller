export type PaymentChannelId = "usdt_xlayer" | "usdt_trc20" | "fiat_stub";

export type PaymentProvider = {
  id: PaymentChannelId;
  label: string;
  enabled: boolean;
};
