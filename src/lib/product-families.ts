import type { Product } from "./db";

export type FamilyId = "chatgpt" | "claude" | "grok" | "gemini";

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
      if (p.slug.includes("annual")) return "Plus 年卡";
      if (p.slug.includes("plus")) return "Plus";
      if (p.slug.includes("pro-50x")) return "Pro 50x";
      if (p.slug.includes("pro-20x")) return "Pro 20x";
      if (p.slug.includes("pro-10x")) return "Pro 10x";
      if (p.slug.includes("pro")) return "Pro";
      return p.name.split("·")[0]?.trim() || p.name;
    },
    periodHint: (p) => (p.slug.includes("annual") ? "/ 年" : "/ 月"),
  },
  {
    id: "claude",
    vendor: "Anthropic",
    productLabel: "Claude",
    match: (p) => p.slug.startsWith("claude-"),
    planLabel: () => "Pro",
    periodHint: () => "/ 月",
  },
  {
    id: "grok",
    vendor: "xAI",
    productLabel: "SuperGrok",
    match: (p) => p.slug.startsWith("grok-"),
    planLabel: (p) => {
      if (p.slug.includes("super")) return "Super";
      if (p.slug.includes("premium")) return "Premium";
      return "会员";
    },
    periodHint: () => "/ 月",
  },
  {
    id: "gemini",
    vendor: "Google",
    productLabel: "Gemini",
    match: (p) => p.slug.startsWith("gemini-"),
    planLabel: () => "Ultra",
    periodHint: () => "/ 月",
  },
];

export type FamilyPlan = {
  id: number;
  slug: string;
  name: string;
  priceCny: number;
  planLabel: string;
  periodHint: string;
};

export type ProductFamily = {
  id: FamilyId;
  vendor: string;
  productLabel: string;
  fromPrice: number;
  plans: FamilyPlan[];
};

export function groupProductsByFamily(products: Product[]): ProductFamily[] {
  return FAMILY_DEFS.map((def) => {
    const plans = products
      .filter(def.match)
      .sort((a, b) => a.sort_order - b.sort_order)
      .map((p) => ({
        id: p.id,
        slug: p.slug,
        name: p.name,
        priceCny: p.price_cny,
        planLabel: def.planLabel(p),
        periodHint: def.periodHint(p),
      }));
    if (plans.length === 0) return null;
    return {
      id: def.id,
      vendor: def.vendor,
      productLabel: def.productLabel,
      fromPrice: Math.min(...plans.map((p) => p.priceCny)),
      plans,
    };
  }).filter((f): f is ProductFamily => f !== null);
}
