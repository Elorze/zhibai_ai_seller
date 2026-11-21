import type { APIRoute } from "astro";
import {
  adminCookieName,
  makeAdminCookieValue,
  verifyAdminPassword,
} from "../../../lib/admin-auth";

export const prerender = false;

export const POST: APIRoute = async ({ request, cookies }) => {
  const body = (await request.json()) as { password?: string };
  if (!body.password || !verifyAdminPassword(body.password)) {
    return new Response(JSON.stringify({ error: "密码错误" }), {
      status: 401,
      headers: { "Content-Type": "application/json" },
    });
  }
  cookies.set(adminCookieName(), makeAdminCookieValue(), {
    httpOnly: true,
    sameSite: "lax",
    path: "/",
    maxAge: 60 * 60 * 24 * 7,
  });
  return new Response(JSON.stringify({ ok: true }), {
    status: 200,
    headers: { "Content-Type": "application/json" },
  });
};
