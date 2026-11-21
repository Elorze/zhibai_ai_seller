import {
  PAY_NETWORKS, allowanceData, approveData, balanceOfData, buildPaymentTypedData, formatUsdc, paymentHeader, type PayQuote,
} from "./pay-core";

interface Wallet { request(input: { method: string; params?: unknown[] }): Promise<unknown>; }
interface CatalogRow {
  model: string; protocol: string; endpoint: string; price: { amount: string };
  payment: { options: { network: string; asset: string; amount: string; decimals: number; spender: string }[] };
}
const $ = <T extends HTMLElement>(id: string): T => document.getElementById(id) as T;
const status = $("pay-status"), form = $("pay-form");
const modelSelect = $<HTMLSelectElement>("pay-model"), networkSelect = $<HTMLSelectElement>("pay-network");
const sendButton = $<HTMLButtonElement>("pay-send"), connectButton = $<HTMLButtonElement>("pay-connect"), approveButton = $<HTMLButtonElement>("pay-approve");
let rows: CatalogRow[] = [];
let wallet: Wallet | undefined;
let account = "";
let busy = false;

const messages: Record<string, string> = {
  WALLET_NOT_FOUND: "No browser wallet was found. Open this page in a browser with a wallet extension.",
  PAYMENT_LIMIT_EXCEEDED: "The price changed above what you were shown. Nothing was signed.",
  PAYMENT_QUOTE_INVALID: "The payment terms did not match your request. Nothing was signed.",
  FRELY_EXECUTION_FAILED_NOT_CHARGED: "The request failed, so you were not charged. You can try again.",
  FRELY_EXECUTION_OUTCOME_UNKNOWN_NOT_CHARGED: "The request did not complete, so you were not charged. You can try again.",
  PAYMENT_INSUFFICIENT_FUNDS: "Your wallet does not hold enough USDC on this network.",
  PAYMENT_ALLOWANCE_MISSING: "Allow USDC first (one-time), then send again.",
};
const say = (text: string): void => { status.textContent = text; };
const fail = (error: unknown): void => {
  const code = error instanceof Error ? error.message : "";
  say(messages[code] ?? (code && /^[A-Z_]{4,64}$/.test(code) ? `The request was not completed (${code}). You were not charged.` : "The request was not completed. You were not charged."));
};
const current = () => {
  const row = rows.find(item => item.model === modelSelect.value);
  const option = row?.payment.options.find(item => item.network === networkSelect.value);
  return row && option ? { row, option, network: PAY_NETWORKS[option.network]! } : undefined;
};

async function call<T>(method: string, params: unknown[] = []): Promise<T> {
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  return await wallet.request({ method, params }) as T;
}
async function read(to: string, data: string): Promise<bigint> {
  return BigInt(await call<string>("eth_call", [{ to, data }, "latest"]));
}
async function refresh(): Promise<void> {
  const cur = current();
  if (!cur) return;
  $("pay-price").textContent = `${formatUsdc(cur.option.amount, cur.option.decimals)} USDC on ${cur.network.label}, only if it succeeds`;
  $("pay-approve-box").hidden = true;
  sendButton.disabled = true;
  if (!account) return;
  const chain = Number.parseInt(await call<string>("eth_chainId"), 16);
  if (chain !== cur.network.chainId) {
    await call("wallet_switchEthereumChain", [{ chainId: `0x${cur.network.chainId.toString(16)}` }]);
  }
  const [balance, allowance] = await Promise.all([read(cur.network.asset, balanceOfData(account)), read(cur.network.asset, allowanceData(account))]);
  $("pay-balance").textContent = `${formatUsdc(balance.toString(), cur.option.decimals)} USDC`;
  const price = BigInt(cur.option.amount);
  if (balance < price) { say("Your wallet does not hold enough USDC on this network."); return; }
  if (allowance < price) { $("pay-approve-box").hidden = false; say("One-time setup needed before you can pay."); return; }
  sendButton.disabled = false;
  say("Ready. You are charged only if the answer succeeds.");
}
async function run(task: () => Promise<void>): Promise<void> {
  if (busy) return;
  busy = true;
  for (const b of [connectButton, approveButton, sendButton]) b.disabled = true;
  try { await task(); } catch (error) { fail(error); }
  finally { busy = false; connectButton.disabled = false; approveButton.disabled = false; await refresh().catch(() => undefined); }
}

connectButton.addEventListener("click", () => void run(async () => {
  wallet = (window as unknown as { ethereum?: Wallet }).ethereum;
  if (!wallet) throw new Error("WALLET_NOT_FOUND");
  const accounts = await call<unknown[]>("eth_requestAccounts");
  if (typeof accounts[0] !== "string" || !/^0x[0-9a-fA-F]{40}$/.test(accounts[0])) throw new Error("WALLET_NOT_FOUND");
  account = accounts[0].toLowerCase();
  $("pay-wallet").textContent = account;
}));
approveButton.addEventListener("click", () => void run(async () => {
  const cur = current();
  if (!cur || !account) return;
  await call<string>("eth_sendTransaction", [{ from: account, to: cur.network.asset, data: approveData((1n << 256n) - 1n) }]);
  say("Waiting for the approval to confirm…");
  for (let i = 0; i < 60; i++) {
    await new Promise(resolve => setTimeout(resolve, 2000));
    if (await read(cur.network.asset, allowanceData(account)) >= BigInt(cur.option.amount)) return;
  }
  throw new Error("APPROVAL_NOT_CONFIRMED");
}));
sendButton.addEventListener("click", () => void run(async () => {
  const cur = current();
  const input = $<HTMLTextAreaElement>("pay-input").value.trim();
  if (!cur || !account || !input) { say("Enter a request first."); return; }
  const endpoint = cur.row.endpoint;
  const path = new URL(endpoint).pathname;
  const requestId = `web_${crypto.randomUUID()}`;
  const body = JSON.stringify({ model: cur.row.model, input, max_output_tokens: 512 });
  const post = (header?: string) => fetch(path, { method: "POST", body, redirect: "error", credentials: "omit", signal: AbortSignal.timeout(90_000),
    headers: { "content-type": "application/json", "x-frely-request-id": requestId, ...(header ? { "PAYMENT-SIGNATURE": header } : {}) } });
  say("Preparing your payment…");
  const challenge = await post();
  if (challenge.status !== 402) throw new Error(((await challenge.json().catch(() => ({}))) as { code?: string }).code ?? "REQUEST_REFUSED");
  const quote = ((await challenge.json()) as { accepts: PayQuote[] }).accepts.find(item => item.network === cur.option.network);
  if (!quote) throw new Error("PAYMENT_QUOTE_INVALID");
  const { authorization, typedData } = await buildPaymentTypedData({ quote, resource: endpoint, requestId, body, maxAtomic: cur.option.amount, nowSeconds: Math.floor(Date.now() / 1000) });
  say("Approve the signature in your wallet. It does not move funds until the answer succeeds.");
  const signature = await call<string>("eth_signTypedData_v4", [account, JSON.stringify(typedData)]);
  say("Working on your answer…");
  const response = await post(paymentHeader(endpoint, quote, account, signature, authorization));
  const text = await response.text();
  if (response.status !== 200) throw new Error((() => { try { return (JSON.parse(text) as { code?: string }).code ?? "REQUEST_REFUSED"; } catch { return "REQUEST_REFUSED"; } })());
  let answer = text;
  try {
    const parsed = JSON.parse(text) as { output_text?: string; output?: { content?: { text?: string }[] }[] };
    answer = parsed.output_text ?? parsed.output?.flatMap(item => item.content ?? []).map(part => part.text ?? "").join("") ?? text;
  } catch { /* show raw text */ }
  $("pay-answer").textContent = answer || text;
  const receipt = response.headers.get("PAYMENT-RESPONSE");
  let hash = "";
  try { hash = (JSON.parse(atob(receipt ?? "")) as { transaction?: string }).transaction ?? ""; } catch { /* no receipt */ }
  $("pay-receipt").textContent = hash && /^0x[0-9a-f]{64}$/i.test(hash) ? `Paid ${formatUsdc(cur.option.amount, cur.option.decimals)} USDC. Transaction: ${cur.network.explorer}/tx/${hash}` : "Paid.";
  $("pay-result").hidden = false;
  say("Done.");
}));
modelSelect.addEventListener("change", () => void refresh().catch(fail));
networkSelect.addEventListener("change", () => void refresh().catch(fail));

(async () => {
  const response = await fetch("/x402/frely/catalog", { credentials: "omit", redirect: "error", signal: AbortSignal.timeout(15_000) });
  if (!response.ok) throw new Error("CATALOG_UNAVAILABLE");
  rows = ((await response.json()) as { data: CatalogRow[] }).data.filter(row => row.protocol === "responses" && row.payment?.options?.some(option => PAY_NETWORKS[option.network]));
  if (!rows.length) throw new Error("CATALOG_EMPTY");
  for (const row of rows) modelSelect.add(new Option(row.model, row.model));
  const networks = [...new Set(rows.flatMap(row => row.payment.options.map(option => option.network)))].filter(id => PAY_NETWORKS[id]);
  for (const id of networks) networkSelect.add(new Option(PAY_NETWORKS[id]!.label, id));
  form.hidden = false;
  say("Connect your wallet to begin.");
  await refresh();
})().catch(error => { say(error instanceof Error && error.message === "CATALOG_EMPTY" ? "No models are available for wallet payment right now." : "Could not load models. Try again later."); });
