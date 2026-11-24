import crypto from "crypto";
import { env } from "./env";

const PASSWORD_RE = /^[A-Za-z0-9]{6,12}$/;

export function getQueryPasswordPepper() {
  const pepper = env("QUERY_PASSWORD_PEPPER");
  if (!pepper || pepper.length < 16) {
    throw new Error("缺少或过短的 QUERY_PASSWORD_PEPPER（至少 16 位）");
  }
  return pepper;
}

export function assertValidQueryPassword(password: string) {
  if (!PASSWORD_RE.test(password)) {
    throw new Error("查单密码需为 6～12 位字母或数字");
  }
}

export function hashQueryPassword(password: string) {
  assertValidQueryPassword(password);
  const pepper = getQueryPasswordPepper();
  return crypto.createHmac("sha256", pepper).update(password).digest("hex");
}

export function verifyQueryPassword(password: string, hash: string) {
  if (!hash) return false;
  try {
    const computed = hashQueryPassword(password);
    const a = Buffer.from(computed);
    const b = Buffer.from(hash);
    if (a.length !== b.length) return false;
    return crypto.timingSafeEqual(a, b);
  } catch {
    return false;
  }
}
