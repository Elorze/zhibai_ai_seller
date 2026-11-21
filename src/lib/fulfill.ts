import {
  getOrderByNo,
  getProductById,
  markOrderFulfillResult,
  markOrderPaid,
} from "./db";
import { daituTrade } from "./daitu";

export async function confirmPaidAndFulfill(orderNo: string) {
  const order = getOrderByNo(orderNo);
  if (!order) throw new Error("订单不存在");

  if (order.payment_status !== "paid") {
    // Admin / recovery path may confirm from pending or manual_review.
    markOrderPaid(orderNo, order.payment_tx_id);
  }

  const fresh = getOrderByNo(orderNo)!;
  if (fresh.fulfill_status === "done" && fresh.deliver_secret) {
    return fresh;
  }

  markOrderFulfillResult(orderNo, { fulfill_status: "processing" });
  const product = getProductById(fresh.product_id);
  if (!product) {
    return markOrderFulfillResult(orderNo, {
      fulfill_status: "error",
      fulfill_error: "商品不存在",
    });
  }

  try {
    const result = await daituTrade({
      sharedCode: product.daitu_code,
      contact: fresh.email,
      requestNo: fresh.order_no,
    });
    if (result.code !== 200) {
      return markOrderFulfillResult(orderNo, {
        fulfill_status: "error",
        fulfill_error: result.msg || `带土返回 code=${result.code}`,
      });
    }
    const data = (result.data || {}) as {
      tradeNo?: string;
      secret?: string | null;
    };
    return markOrderFulfillResult(orderNo, {
      fulfill_status: "done",
      daitu_trade_no: data.tradeNo || null,
      deliver_secret: data.secret || "已下单，请稍后查单或联系客服",
      fulfill_error: null,
    });
  } catch (err) {
    return markOrderFulfillResult(orderNo, {
      fulfill_status: "error",
      fulfill_error: err instanceof Error ? err.message : "履约失败",
    });
  }
}
