import type { FulfillType, Product } from "./db";

export type FamilyId =
  | "chatgpt"
  | "claude"
  | "grok"
  | "gemini"
  | "codex";

export type FamilyMeta = {
  id: FamilyId;
  vendor: string;
  productLabel: string;
  match: (p: Product) => boolean;
  planLabel: (p: Product) => string;
  periodHint: (p: Product) => string;
};

export const FAMILY_DEFS: FamilyMeta[] = [
  {
    id: "chatgpt",
    vendor: "OpenAI",
    productLabel: "ChatGPT",
    match: (p) => p.slug.startsWith("gpt-"),
    planLabel: (p) => {
      if (p.channel_tag) {
        if (p.slug.includes("plus")) return `Plus · ${p.channel_tag}`;
        if (p.slug.includes("pro-20x")) return `Pro 20x · ${p.channel_tag}`;
        if (p.slug.includes("pro-50x")) return `Pro 50x · ${p.channel_tag}`;
      }
      if (p.slug.includes("chile")) return "Pro 50x 智利";
      if (p.slug.includes("annual")) return "Plus 年卡";
      if (p.slug.includes("plus")) return "Plus";
      if (p.slug.includes("pro-50x")) return "Pro 50x";
      if (p.slug.includes("pro-20x")) return "Pro 20x";
      if (p.slug.includes("pro-10x")) return "Pro 10x";
      return p.name.split("·")[0]?.trim() || p.name;
    },
    periodHint: (p) => (p.slug.includes("annual") ? "/ 年" : "/ 月"),
  },
  {
    id: "claude",
    vendor: "Anthropic",
    productLabel: "Claude",
    match: (p) => p.slug.startsWith("claude-") && p.fulfill_type === "account",
    planLabel: () => "Pro 成品号",
    periodHint: () => "",
  },
  {
    id: "grok",
    vendor: "xAI",
    productLabel: "Grok",
    match: (p) => p.slug.startsWith("grok-"),
    planLabel: (p) => {
      if (p.slug.includes("ultra")) return "Ultra";
      if (p.slug.includes("super")) return "Super";
      if (p.slug.includes("premium")) return "Premium";
      if (p.slug.includes("plus")) return "Plus";
      return "会员";
    },
    periodHint: () => "/ 月",
  },
  {
    id: "gemini",
    vendor: "Google",
    productLabel: "Gemini",
    match: (p) => p.slug.startsWith("gemini-") && p.fulfill_type === "account",
    planLabel: (p) => {
      if (p.slug.includes("5x")) return "Ultra 5X 成品号";
      if (p.slug.includes("20x")) return "Ultra 20X 成品号";
      return "成品号";
    },
    periodHint: () => "",
  },
  {
    id: "codex",
    vendor: "OpenAI",
    productLabel: "Codex",
    match: (p) => p.slug.startsWith("codex-"),
    planLabel: () => "点数额度",
    periodHint: () => "",
  },
];

export type FamilyPlan = {
  id: number;
  slug: string;
  name: string;
  priceCny: number;
  planLabel: string;
  periodHint: string;
  fulfillType: FulfillType;
  channelTag: string;
  accountWarning: string;
  inStock: boolean;
  daituCode: string;
};

export type ProductFamily = {
  id: FamilyId;
  vendor: string;
  productLabel: string;
  fromPrice: number;
  inStock: boolean;
  plans: FamilyPlan[];
};

export function groupProductsByFamily(
  products: Product[],
  stockByCode: Record<string, number> | null,
): ProductFamily[] {
  return FAMILY_DEFS.map((def) => {
    const plans = products
      .filter(def.match)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => {
        const known =
          stockByCode && Object.prototype.hasOwnProperty.call(stockByCode, p.daitu_code);
        const inStock = !known || (stockByCode![p.daitu_code] ?? 0) > 0;
        return {
          id: p.id,
          slug: p.slug,
          name: p.name,
          priceCny: p.price_cny,
          planLabel: def.planLabel(p),
          periodHint: def.periodHint(p),
          fulfillType: p.fulfill_type || "card",
          channelTag: p.channel_tag || "",
          accountWarning: p.account_warning || "",
          inStock,
          daituCode: p.daitu_code,
        };
      });
    if (plans.length === 0) return null;
    return {
      id: def.id,
      vendor: def.vendor,
      productLabel: def.productLabel,
      fromPrice: Math.min(...plans.map((p) => p.priceCny)),
      inStock: plans.some((p) => p.inStock),
      plans,
    };
  }).filter((f): f is ProductFamily => f !== null);
}
