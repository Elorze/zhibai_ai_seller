import type { APIRoute } from "astro";
import { z } from "zod";
import { isAdminAuthed } from "../../../../lib/admin-auth";
import { getOrderByNo } from "../../../../lib/db";
import { confirmPaidAndFulfill } from "../../../../lib/fulfill";

export const prerender = false;

const schema = z.object({ orderNo: z.string().min(6) });

export const POST: APIRoute = async ({ request, cookies }) => {
  if (!isAdminAuthed(cookies)) {
    return new Response(JSON.stringify({ error: "未登录" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  try {
    const body = schema.parse(await request.json());
    const current = getOrderByNo(body.orderNo);
    if (!current) {
      return new Response(JSON.stringify({ error: "订单不存在" }), {
        status: 404,
        headers: { "Content-Type": "application/json" },
      });
    }
    if (current.payment_status !== "paid" && current.payment_status !== "manual_review") {
      return new Response(JSON.stringify({ error: "仅已付款/人工复核订单可重试履约" }), {
        status: 400,
        headers: { "Content-Type": "application/json" },
      });
    }
    const order = await confirmPaidAndFulfill(body.orderNo);
    return new Response(JSON.stringify({ order }), {
      status: 200,
      headers: { "Content-Type": "application/json" },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "重试失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
