import { env } from "./env";
import type Database from "better-sqlite3";

export function getPaymentTtlMinutes() {
  const n = Number(env("PAYMENT_ORDER_TTL_MIN", "30"));
  return Number.isFinite(n) && n > 0 ? n : 30;
}

export function cnyToUsdtBase(cny: number) {
  const rate = Number(env("USDT_CNY_RATE", "7.2"));
  return Math.round((cny / rate) * 100) / 100;
}

function round2(n: number) {
  return Math.round(n * 100) / 100;
}

/** Allocate unique USDT among open pending/confirming orders (+0.01 steps). */
export function allocateUniqueUsdtAmount(
  database: Database.Database,
  baseCny: number,
): number {
  const base = cnyToUsdtBase(baseCny);
  const occupied = new Set(
    (
      database
        .prepare(
          `SELECT amount_usdt AS a FROM orders
           WHERE payment_status IN ('pending', 'confirming')
             AND (expires_at IS NULL OR expires_at > datetime('now'))`,
        )
        .all() as { a: number }[]
    ).map((r) => round2(Number(r.a))),
  );

  let candidate = base;
  for (let i = 0; i < 5000; i++) {
    const v = round2(candidate);
    if (!occupied.has(v)) return v;
    candidate = round2(base + (i + 1) * 0.01);
  }
  throw new Error("无法分配唯一 USDT 金额，请稍后重试");
}
