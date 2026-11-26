import { fiatStubProvider } from "./fiat-stub";
import { usdtXlayerProvider } from "./usdt-xlayer";
import type { PaymentProvider } from "./types";

export type { PaymentChannelId, PaymentProvider } from "./types";

const registry: PaymentProvider[] = [usdtXlayerProvider, fiatStubProvider];

export function listPaymentProviders() {
  return registry;
}

export function listEnabledPaymentProviders() {
  return registry.filter((p) => p.enabled);
}

export function getPaymentProvider(id: string) {
  return registry.find((p) => p.id === id);
}
