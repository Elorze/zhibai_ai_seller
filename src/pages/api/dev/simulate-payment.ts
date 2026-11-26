import type { APIRoute } from "astro";
import { z } from "zod";
import { getOrderByNo } from "../../../lib/db";
import { isPaymentSimulateAllowed } from "../../../lib/payment";
import { confirmPaymentAndFulfill, orderPublicView } from "../../../lib/payment-confirm";

export const prerender = false;

const schema = z.object({
  orderNo: z.string().min(6),
  txId: z.string().min(8).optional(),
});

export const POST: APIRoute = async ({ request }) => {
  if (!isPaymentSimulateAllowed()) {
    return new Response(JSON.stringify({ error: "simulate disabled" }), {
      status: 403,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = schema.parse(await request.json());
    const order = getOrderByNo(body.orderNo);
    if (!order) {
      return new Response(JSON.stringify({ error: "订单不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const txId =
      body.txId ||
      `SIM${Date.now().toString(16)}${Math.floor(Math.random() * 1e6).toString(16)}`.padEnd(
        64,
        "0",
      ).slice(0, 64);
    const updated = await confirmPaymentAndFulfill({
      orderNo: body.orderNo,
      paymentTxId: txId,
      source: "simulate",
    });
    return new Response(JSON.stringify(orderPublicView(updated!)), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "simulate failed";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
