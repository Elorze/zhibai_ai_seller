import type { APIRoute } from "astro";
import { z } from "zod";
import { orderPublicView } from "../../../lib/payment-confirm";
import { checkOrderPayment } from "../../../lib/payment-watcher";
import { paymentStatusLabel } from "../../../lib/payment";

export const prerender = false;

const schema = z.object({ orderNo: z.string().min(6) });

export const POST: APIRoute = async ({ request }) => {
  try {
    const body = schema.parse(await request.json());
    const order = await checkOrderPayment(body.orderNo);
    return new Response(
      JSON.stringify({
        ...orderPublicView(order),
        paymentStatusLabel: paymentStatusLabel(order.payment_status),
      }),
      { status: 200, headers: { "Content-Type": "application/json" } },
    );
  } catch (err) {
    const message = err instanceof Error ? err.message : "检查失败";
    return new Response(JSON.stringify({ error: message }), {
      status: 400,
      headers: { "Content-Type": "application/json" },
    });
  }
};
