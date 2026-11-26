export type AppEnv = "development" | "production";

function rawEnv(key: string): string | undefined {
  const fromProcess =
    typeof process !== "undefined" ? process.env[key] : undefined;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const value = fromProcess || fromMeta;
  if (value === undefined || value === null || value === "") return undefined;
  return String(value);
}

export function env(key: string, fallback = "") {
  return rawEnv(key) ?? fallback;
}

/** APP_ENV=development|production (also accepts prod / production=true). */
export function appEnv(): AppEnv {
  const explicit = (rawEnv("APP_ENV") || "").trim().toLowerCase();
  if (explicit === "production" || explicit === "prod") return "production";
  if (explicit === "development" || explicit === "dev") return "development";
  const flag = (rawEnv("PRODUCTION") || "").trim().toLowerCase();
  if (flag === "1" || flag === "true" || flag === "yes") return "production";
  return "development";
}

/**
 * Mode-aware env: KEY_PRODUCTION / KEY_DEVELOPMENT first, then bare KEY.
 */
export function envMode(key: string, fallback = "") {
  const suffix = appEnv() === "production" ? "PRODUCTION" : "DEVELOPMENT";
  return rawEnv(`${key}_${suffix}`) ?? rawEnv(key) ?? fallback;
}
