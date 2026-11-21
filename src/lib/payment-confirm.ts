import {
  findOrderByPaymentTx,
  getOrderByNo,
  markOrderPaid,
  setPaymentStatus,
  type Order,
} from "./db";
import { confirmPaidAndFulfill } from "./fulfill";

/**
 * Idempotent: attach tx, mark paid, fulfill once.
 * Semi-style: never double-fulfill; reuse existing paid+done.
 */
export async function confirmPaymentAndFulfill(input: {
  orderNo: string;
  paymentTxId: string;
  source: "scan" | "txid" | "simulate" | "admin";
}) {
  const existingTx = findOrderByPaymentTx(input.paymentTxId);
  if (existingTx && existingTx.order_no !== input.orderNo) {
    throw new Error("该交易号已用于其他订单");
  }

  const order = getOrderByNo(input.orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status === "paid") {
    if (order.fulfill_status === "done" && order.deliver_secret) {
      return order;
    }
    return confirmPaidAndFulfill(order.order_no);
  }

  if (
    order.payment_status === "expired" ||
    order.payment_status === "manual_review"
  ) {
    // late payment / review: mark paid only via explicit admin or simulate path can override
    if (input.source !== "admin" && input.source !== "simulate") {
      setPaymentStatus(order.order_no, "manual_review", {
        payment_tx_id: input.paymentTxId,
      });
      throw new Error("订单已过期或进入人工复核，请联系客服");
    }
  }

  markOrderPaid(order.order_no, input.paymentTxId);
  return confirmPaidAndFulfill(order.order_no);
}

export function orderPublicView(order: Order) {
  return {
    orderNo: order.order_no,
    paymentStatus: order.payment_status,
    fulfillStatus: order.fulfill_status,
    amountUsdt: order.amount_usdt,
    paymentTxId: order.payment_tx_id,
    deliverSecret: order.deliver_secret,
    expiresAt: order.expires_at,
    fulfillError: order.fulfill_error,
  };
}
