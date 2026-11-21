export function env(key: string, fallback = "") {
  const fromProcess = typeof process !== "undefined" ? process.env[key] : undefined;
  const fromMeta = (import.meta.env as Record<string, string | undefined>)[key];
  const value = fromProcess || fromMeta;
  return value === undefined || value === null || value === "" ? fallback : String(value);
}
