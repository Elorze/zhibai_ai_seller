import type { APIRoute } from "astro";
import { z } from "zod";
import { findOrder } from "../../../lib/db";

export const prerender = false;

const schema = z.object({
  orderNo: z.string().min(6),
  email: z.string().email(),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = schema.parse(await request.json());
    const order = findOrder(body.orderNo, body.email);
    if (!order) {
      return new Response(JSON.stringify({ error: "未找到订单" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    return new Response(
      JSON.stringify({
        orderNo: order.order_no,
        productName: order.product_name,
        email: order.email,
        amountCny: order.amount_cny,
        amountUsdt: order.amount_usdt,
        paymentStatus: order.payment_status,
        fulfillStatus: order.fulfill_status,
        deliverSecret: order.deliver_secret,
        createdAt: order.created_at,
        paidAt: order.paid_at,
        fulfilledAt: order.fulfilled_at,
        fulfillError: order.fulfill_error,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "查询失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
