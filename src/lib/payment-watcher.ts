import {
  expireOpenOrders,
  findOrderByPaymentTx,
  findPendingOrderByUsdtAmount,
  getOrderByNo,
  setPaymentStatus,
  type Order,
} from "./db";
import { confirmPaymentAndFulfill } from "./payment-confirm";
import { getUsdtConfig, isMerchantAddressConfigured } from "./payment";
import {
  addressesEqual,
  amountsEqual,
  fetchRecentUsdtTransfersTo,
  getUsdtTransferByTxId,
} from "./xlayer";

export type ChainCheck = "matched" | "none" | "error";

export async function scanAndMatchOpenOrders(opts?: {
  fromBlock?: number | null;
  onlyOrderNo?: string;
}) {
  expireOpenOrders();
  const { address } = getUsdtConfig();
  if (!isMerchantAddressConfigured(address)) {
    return { scanned: 0, matched: [] as string[] };
  }

  const transfers = await fetchRecentUsdtTransfersTo(address, {
    fromBlock: opts?.fromBlock,
    limit: 80,
  });
  const matched: string[] = [];

  for (const t of transfers) {
    if (!t.confirmed) continue;
    if (!addressesEqual(t.to, address)) continue;
    if (findOrderByPaymentTx(t.txId)) continue;

    const order = findPendingOrderByUsdtAmount(t.amountUsdt);
    if (!order) continue;
    if (opts?.onlyOrderNo && order.order_no !== opts.onlyOrderNo) continue;

    try {
      await confirmPaymentAndFulfill({
        orderNo: order.order_no,
        paymentTxId: t.txId,
        source: "scan",
      });
      matched.push(order.order_no);
    } catch {
      // leave for manual review / retry
    }
  }

  return { scanned: transfers.length, matched };
}

export async function checkOrderPayment(
  orderNo: string,
): Promise<{ order: Order; chainCheck: ChainCheck }> {
  expireOpenOrders();
  let order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid") {
    return { order, chainCheck: "matched" };
  }

  if (order.payment_status === "expired") {
    return { order, chainCheck: "none" };
  }

  setPaymentStatus(orderNo, "confirming");
  let chainCheck: ChainCheck = "none";
  try {
    const result = await scanAndMatchOpenOrders({
      fromBlock: order.scan_from_block,
      onlyOrderNo: orderNo,
    });
    chainCheck = result.matched.includes(orderNo) ? "matched" : "none";
  } catch {
    chainCheck = "error";
  }
  order = getOrderByNo(orderNo)!;
  if (order.payment_status === "paid") {
    return { order, chainCheck: "matched" };
  }
  if (order.payment_status === "confirming" && order.expires_at) {
    const stillOpen =
      !order.expires_at ||
      Date.parse(order.expires_at.replace(" ", "T") + "Z") > Date.now();
    if (stillOpen && order.payment_status === "confirming" && !order.payment_tx_id) {
      setPaymentStatus(orderNo, "pending");
      order = getOrderByNo(orderNo)!;
    }
  }
  return { order, chainCheck };
}

export async function verifyTxForOrder(orderNo: string, txId: string) {
  expireOpenOrders();
  const order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid") {
    return order;
  }

  setPaymentStatus(orderNo, "confirming");
  const transfer = await getUsdtTransferByTxId(txId);
  if (!transfer) {
    // empty receipt — keep confirming, do not fail
    return getOrderByNo(orderNo)!;
  }
  if (!transfer.confirmed) {
    return getOrderByNo(orderNo)!;
  }

  const { address } = getUsdtConfig();
  if (!addressesEqual(transfer.to, address)) {
    throw new Error("交易收款地址与本站不一致");
  }
  if (!amountsEqual(transfer.amountUsdt, order.amount_usdt)) {
    throw new Error(
      `金额不匹配：链上 ${transfer.amountUsdt}，订单 ${order.amount_usdt}`,
    );
  }

  return confirmPaymentAndFulfill({
    orderNo,
    paymentTxId: transfer.txId,
    source: "txid",
  });
}
