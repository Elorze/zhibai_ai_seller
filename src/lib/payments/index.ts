import { fiatStubProvider } from "./fiat-stub";
import { usdtTrc20Provider } from "./usdt-trc20";
import type { PaymentProvider } from "./types";

export type { PaymentChannelId, PaymentProvider } from "./types";

const registry: PaymentProvider[] = [usdtTrc20Provider, fiatStubProvider];

export function listPaymentProviders() {
  return registry;
}

export function listEnabledPaymentProviders() {
  return registry.filter((p) => p.enabled);
}

export function getPaymentProvider(id: string) {
  return registry.find((p) => p.id === id);
}
