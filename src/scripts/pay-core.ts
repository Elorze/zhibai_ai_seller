/** Browser-side payment logic for /pay/. Pure functions only, so the server test suite can check them against the Network's own binding. */
export interface PayLeg { to: string; amount: string; }
export interface PayQuote {
  scheme: string; network: string; asset: string; amount: string; payTo: string; maxTimeoutSeconds: number;
  extra: { name: string; spender: string; legs: PayLeg[]; model: string; version: string; requestBinding: string };
}

export const PERMIT2 = "0x000000000022d473030f116ddee9f6b43ac78ba3";
export const PAY_NETWORKS: Record<string, { chainId: number; label: string; asset: string; decimals: number; explorer: string }> = {
  "eip155:8453": { chainId: 8453, label: "Base", asset: "0x833589fcd6edb6e08f4c7c32d4f71b54bda02913", decimals: 6, explorer: "https://basescan.org" },
  "eip155:84532": { chainId: 84532, label: "Base Sepolia (test)", asset: "0x036cbd53842c5426634e7929541ec2318f3dcf7e", decimals: 6, explorer: "https://sepolia.basescan.org" },
  "eip155:56": { chainId: 56, label: "BNB Chain", asset: "0x8ac76a51cc950d9822d68b83fe1ad97b32cd580d", decimals: 18, explorer: "https://bscscan.com" },
};

const hex = (bytes: ArrayBuffer): string => [...new Uint8Array(bytes)].map(b => b.toString(16).padStart(2, "0")).join("");
export async function sha256Hex(text: string): Promise<string> {
  return hex(await crypto.subtle.digest("SHA-256", new TextEncoder().encode(text)));
}

/** Must stay byte-identical to `evmRequestBinding` in packages/payment/evm-x402 (a server test enforces it). */
export async function requestBinding(resource: string, requestId: string, body: string, quote: PayQuote): Promise<string> {
  return "0x" + await sha256Hex(JSON.stringify({
    v: "frely-evm:v1", resource, requestId, bodySha256: await sha256Hex(body), network: quote.network, asset: quote.asset,
    amount: quote.amount, legs: quote.extra.legs, spender: quote.extra.spender, timeout: quote.maxTimeoutSeconds,
    model: quote.extra.model, version: quote.extra.version,
  }));
}

/** Atomic units to a short decimal string, for showing the buyer what they pay. */
export function formatUsdc(atomic: string, decimals: number): string {
  const value = BigInt(atomic);
  const unit = 10n ** BigInt(decimals);
  const cents = (value * 10_000n + unit / 2n) / unit;
  return `${cents / 10_000n}.${(cents % 10_000n).toString().padStart(4, "0")}`;
}

/**
 * Checks everything the wallet is about to sign against the buyer's own request and cap,
 * then returns the EIP-712 message. Anything unexpected throws before the wallet is asked.
 */
export async function buildPaymentTypedData(input: { quote: PayQuote; resource: string; requestId: string; body: string; maxAtomic: string; nowSeconds: number }) {
  const { quote } = input;
  const network = PAY_NETWORKS[quote.network];
  if (!network || quote.scheme !== "exact" || quote.asset !== network.asset || quote.maxTimeoutSeconds < 30 || quote.maxTimeoutSeconds > 300) throw new Error("PAYMENT_QUOTE_INVALID");
  const legs = quote.extra.legs;
  if (!Array.isArray(legs) || legs.length < 1 || legs.length > 4 || legs.some(leg => !/^0x[0-9a-f]{40}$/.test(leg.to) || !/^[0-9]+$/.test(leg.amount))) throw new Error("PAYMENT_QUOTE_INVALID");
  if (legs.reduce((sum, leg) => sum + BigInt(leg.amount), 0n).toString() !== quote.amount) throw new Error("PAYMENT_QUOTE_INVALID");
  if (BigInt(quote.amount) > BigInt(input.maxAtomic)) throw new Error("PAYMENT_LIMIT_EXCEEDED");
  const binding = await requestBinding(input.resource, input.requestId, input.body, quote);
  if (quote.extra.requestBinding !== binding) throw new Error("PAYMENT_QUOTE_INVALID");
  const authorization = {
    permitted: legs.map(leg => ({ token: network.asset, amount: leg.amount })),
    spender: quote.extra.spender, nonce: BigInt(binding).toString(), deadline: String(input.nowSeconds + quote.maxTimeoutSeconds),
    witness: { requestBinding: binding, recipients: legs.map(leg => leg.to) },
  };
  const typedData = {
    domain: { name: "Permit2", chainId: network.chainId, verifyingContract: PERMIT2 },
    types: {
      EIP712Domain: [{ name: "name", type: "string" }, { name: "chainId", type: "uint256" }, { name: "verifyingContract", type: "address" }],
      PermitBatchWitnessTransferFrom: [
        { name: "permitted", type: "TokenPermissions[]" }, { name: "spender", type: "address" }, { name: "nonce", type: "uint256" },
        { name: "deadline", type: "uint256" }, { name: "witness", type: "FrelyPayment" },
      ],
      FrelyPayment: [{ name: "requestBinding", type: "bytes32" }, { name: "recipients", type: "address[]" }],
      TokenPermissions: [{ name: "token", type: "address" }, { name: "amount", type: "uint256" }],
    },
    primaryType: "PermitBatchWitnessTransferFrom",
    message: authorization,
  };
  return { authorization, typedData };
}

/** Same shape as the `PAYMENT-SIGNATURE` header the CLI sends. */
export function paymentHeader(resource: string, quote: PayQuote, owner: string, signature: string, authorization: unknown): string {
  const bytes = new TextEncoder().encode(JSON.stringify({ x402Version: 2, resource: { url: resource }, accepted: quote, payload: { owner: owner.toLowerCase(), signature: signature.toLowerCase(), authorization } }));
  let binary = "";
  for (const byte of bytes) binary += String.fromCharCode(byte);
  return btoa(binary);
}

const word = (value: string | bigint): string => (typeof value === "bigint" ? value.toString(16) : value.replace(/^0x/, "")).padStart(64, "0");
export const balanceOfData = (owner: string): string => "0x70a08231" + word(owner);
export const allowanceData = (owner: string): string => "0xdd62ed3e" + word(owner) + word(PERMIT2);
export const approveData = (amount: bigint): string => "0x095ea7b3" + word(PERMIT2) + word(amount);
