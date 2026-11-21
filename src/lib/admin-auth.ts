import crypto from "crypto";
import type { AstroCookies } from "astro";
import { env } from "./env";

const COOKIE = "zhibai_admin_session";

function tokenForPassword(password: string) {
  const secret = env("ADMIN_PASSWORD", "change-me");
  return crypto
    .createHmac("sha256", secret)
    .update(`zhibai-admin:${password}`)
    .digest("hex");
}

export function expectedAdminToken() {
  const password = env("ADMIN_PASSWORD", "change-me");
  return tokenForPassword(password);
}

export function isAdminAuthed(cookies: AstroCookies) {
  const value = cookies.get(COOKIE)?.value;
  return Boolean(value && value === expectedAdminToken());
}

export function adminCookieName() {
  return COOKIE;
}

export function makeAdminCookieValue() {
  return expectedAdminToken();
}

export function verifyAdminPassword(password: string) {
  const expected = env("ADMIN_PASSWORD", "change-me");
  return password === expected;
}
