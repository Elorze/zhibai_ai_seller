import type { APIRoute } from "astro";
import { z } from "zod";
import {
  findOrderByNoAndPasswordHash,
  findOrdersByEmailAndPasswordHash,
  getProductById,
} from "../../../lib/db";
import { hashQueryPassword } from "../../../lib/query-password";
import { allowAttempt, clientKey, recordFail } from "../../../lib/rate-limit";

export const prerender = false;

const schema = z.union([
  z.object({
    mode: z.literal("list").optional(),
    email: z.string().email(),
    queryPassword: z.string().min(6).max(12),
  }),
  z.object({
    mode: z.literal("single").optional(),
    orderNo: z.string().min(6),
    queryPassword: z.string().min(6).max(12),
  }),
]);

function clientIp(request: Request) {
  return (
    request.headers.get("x-forwarded-for")?.split(",")[0]?.trim() ||
    request.headers.get("x-real-ip") ||
    "local"
  );
}

function serializeOrder(order: {
  order_no: string;
  product_id: number;
  product_name: string;
  email: string;
  amount_cny: number;
  amount_usdt: number;
  payment_status: string;
  fulfill_status: string;
  deliver_secret: string | null;
  fulfill_error: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
}) {
  const product = getProductById(order.product_id);
  return {
    orderNo: order.order_no,
    productName: order.product_name,
    email: order.email,
    amountCny: order.amount_cny,
    amountUsdt: order.amount_usdt,
    paymentStatus: order.payment_status,
    fulfillStatus: order.fulfill_status,
    fulfillType: product?.fulfill_type || "card",
    deliverSecret: order.deliver_secret,
    fulfillError: order.fulfill_error,
    createdAt: order.created_at,
    paidAt: order.paid_at,
    fulfilledAt: order.fulfilled_at,
  };
}

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = schema.parse(await request.json());
    const ip = clientIp(request);
    const idPart =
      "email" in body ? body.email : "orderNo" in body ? body.orderNo : "x";
    const key = clientKey(ip, idPart);
    if (!allowAttempt(key)) {
      return new Response(
        JSON.stringify({ error: "尝试过于频繁，请稍后再试" }),
        { status: 429, headers: { "Content-Type": "application/json" } },
      );
    }

    const hash = hashQueryPassword(body.queryPassword);

    if ("orderNo" in body && body.orderNo) {
      const order = findOrderByNoAndPasswordHash(body.orderNo, hash);
      if (!order) {
        recordFail(key);
        return new Response(JSON.stringify({ error: "未找到订单或密码错误" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(JSON.stringify({ order: serializeOrder(order) }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      });
    }

    if ("email" in body && body.email) {
      const orders = findOrdersByEmailAndPasswordHash(body.email, hash);
      if (orders.length === 0) {
        recordFail(key);
        return new Response(JSON.stringify({ error: "未找到订单或密码错误" }), {
          status: 404,
          headers: { "Content-Type": "application/json" },
        });
      }
      return new Response(
        JSON.stringify({ orders: orders.map(serializeOrder) }),
        { status: 200, headers: { "Content-Type": "application/json" } },
      );
    }

    return new Response(JSON.stringify({ error: "参数不完整" }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "查询失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
