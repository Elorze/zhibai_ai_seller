import type { APIRoute } from "astro";
import { z } from "zod";
import { createOrder, getProductById } from "../../../lib/db";
import { assertValidQueryPassword } from "../../../lib/query-password";

export const prerender = false;

const schema = z.object({
  productId: z.number().int().positive(),
  email: z.string().email(),
  queryPassword: z.string().min(6).max(12),
});

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = schema.parse(await request.json());
    assertValidQueryPassword(body.queryPassword);
    const product = getProductById(body.productId);
    if (!product || !product.visible) {
      return new Response(JSON.stringify({ error: "商品不存在或未上架" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    const order = createOrder({
      product,
      email: body.email,
      queryPassword: body.queryPassword,
    });
    return new Response(
      JSON.stringify({
        orderNo: order.order_no,
        amountUsdt: order.amount_usdt,
        expiresAt: order.expires_at,
        email: order.email,
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "下单失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
