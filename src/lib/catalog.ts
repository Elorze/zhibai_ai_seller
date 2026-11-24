import type Database from "better-sqlite3";
import type { FulfillType } from "./db";

export type CatalogRow = {
  slug: string;
  name: string;
  summary: string;
  description: string;
  price_cny: number;
  daitu_code: string;
  fulfill_type: FulfillType;
  channel_tag: string;
  account_warning: string;
  visible: number;
  sort_order: number;
};

const GEMINI_ACCOUNT_WARNING =
  "仅质保首登，登录后请勿频繁切换 IP，以免影响账号稳定性。";

/** Canonical Magfield A/C catalog — upserted on boot. */
export const CATALOG_ROWS: CatalogRow[] = [
  {
    slug: "gpt-plus-ios",
    name: "ChatGPT Plus · iOS 美区",
    summary: "卡密自助充到你自己的 ChatGPT 账号。",
    description:
      "付款后发放充值卡密与充值地址。请到充值站提交卡密并填写你自己的 ChatGPT 账号。质保关注掉订阅；封号通常不保。",
    price_cny: 149,
    daitu_code: "8C2F1E5A1F8D8118",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 10,
  },
  {
    slug: "gpt-plus-annual-ios",
    name: "ChatGPT Plus · 年卡（iOS）",
    summary: "约 12 个月 Plus，卡密自助充。",
    description:
      "付款后发放年卡类充值卡密。请到充值站充到你自己的账号。掉订阅按规则处理；封号不保。",
    price_cny: 1680,
    daitu_code: "GPTPLUS-ANNUAL-IOS-20261002",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 15,
  },
  {
    slug: "gpt-pro-10x-ios",
    name: "ChatGPT Pro 10x · iOS 美区",
    summary: "Pro 10x 卡密自助充。",
    description: "付款后发卡密与充值地址，充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 759,
    daitu_code: "F75FAA3508D63C46",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 20,
  },
  {
    slug: "gpt-pro-20x-ios",
    name: "ChatGPT Pro 20x · iOS 美区",
    summary: "Pro 20x 卡密自助充。",
    description: "付款后发卡密与充值地址，充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 1490,
    daitu_code: "D88A649A5CC464F5",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 30,
  },
  {
    slug: "gpt-pro-50x-ios",
    name: "ChatGPT Pro 50x · iOS 美区",
    summary: "Pro 50x 卡密自助充。",
    description: "付款后发卡密与充值地址，充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 3490,
    daitu_code: "2C3BD75F9CE2C758",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 40,
  },
  {
    slug: "gpt-pro-50x-chile",
    name: "ChatGPT Pro 50x · 智利区",
    summary: "智利区 Pro 50x 卡密自助充。",
    description: "付款后发卡密与充值地址。请按商品说明核对账号条件后充值。",
    price_cny: 3490,
    daitu_code: "GPTPRO25X-CHILE-20260930",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 45,
  },
  {
    slug: "gpt-plus-ph",
    name: "ChatGPT Plus · 菲区通道",
    summary: "特惠通道，稳定性通常弱于美区 iOS。",
    description: "菲区卡密自助充。付款后发卡密，请到充值站充到你自己的账号。",
    price_cny: 129,
    daitu_code: "6D66FF49218BF45C",
    fulfill_type: "card",
    channel_tag: "特惠通道",
    account_warning: "",
    visible: 1,
    sort_order: 50,
  },
  {
    slug: "gpt-pro-20x-ph",
    name: "ChatGPT Pro 20x · 菲区通道",
    summary: "特惠 Pro 通道。",
    description: "菲区 Pro 卡密自助充。付款后发卡密，请到充值站充到你自己的账号。",
    price_cny: 1180,
    daitu_code: "69526F78D0568841",
    fulfill_type: "card",
    channel_tag: "特惠通道",
    account_warning: "",
    visible: 1,
    sort_order: 55,
  },
  {
    slug: "codex-points",
    name: "Codex 点数额度",
    summary: "按规格兑换 Codex 点数额度（卡密）。",
    description:
      "付款后发放兑换卡密，请按发货说明前往指定地址登录符合条件的账号完成兑换。Free 账号勿下。",
    price_cny: 100,
    daitu_code: "DRAFT6893152BA47870EF",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 60,
  },
  {
    slug: "grok-plus",
    name: "Grok Plus · 美区蓝V",
    summary: "Grok Plus 卡密自助充（含蓝V相关说明以发货为准）。",
    description: "付款后发卡密，请到充值站充到你自己的 Free 状态 Grok 账号。",
    price_cny: 68,
    daitu_code: "0B96BC7C7F85809E",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 70,
  },
  {
    slug: "grok-premium",
    name: "Grok Premium · 美区",
    summary: "Grok Premium 卡密自助充。",
    description: "付款后发卡密，请到充值站充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 268,
    daitu_code: "C01878BB9126D760",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 75,
  },
  {
    slug: "grok-super",
    name: "Grok Super · 美区",
    summary: "Grok Super 卡密自助充。",
    description: "付款后发卡密，请到充值站充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 838,
    daitu_code: "9BFFB902156EC0F1",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 80,
  },
  {
    slug: "grok-ultra",
    name: "Grok Ultra · 美区",
    summary: "Grok Ultra 卡密自助充。",
    description: "付款后发卡密，请到充值站充到你自己的账号。掉订阅按规则；封号不保。",
    price_cny: 1680,
    daitu_code: "96A0C324544B897E",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 85,
  },
  {
    slug: "claude-pro-account",
    name: "Claude Pro · 免K成品号",
    summary: "成品账号交付，直接登录使用（非卡密充值）。",
    description:
      "付款后发放成品账号资料（账号/密码等）。请按发货内容登录使用。质保以商品说明为准（通常含首登与订阅相关约定）。",
    price_cny: 288,
    daitu_code: "21B2AC8107463979",
    fulfill_type: "account",
    channel_tag: "",
    account_warning: "",
    visible: 1,
    sort_order: 90,
  },
  {
    slug: "gemini-ultra-5x-account",
    name: "Gemini Ultra 5X · 成品号",
    summary: "成品账号交付，直接登录使用。",
    description:
      "付款后发放成品账号资料。本商品为成品号，不是充值到你已有谷歌账号。",
    price_cny: 548,
    daitu_code: "8E7B67C254E14278",
    fulfill_type: "account",
    channel_tag: "",
    account_warning: GEMINI_ACCOUNT_WARNING,
    visible: 1,
    sort_order: 100,
  },
  {
    slug: "gemini-ultra-20x-account",
    name: "Gemini Ultra 20X · 成品号",
    summary: "成品账号交付，直接登录使用。",
    description:
      "付款后发放成品账号资料。本商品为成品号，不是充值到你已有谷歌账号。",
    price_cny: 780,
    daitu_code: "B9CFC5EAB8580343",
    fulfill_type: "account",
    channel_tag: "",
    account_warning: GEMINI_ACCOUNT_WARNING,
    visible: 1,
    sort_order: 105,
  },
  // Legacy rows — keep but hide
  {
    slug: "claude-pro-month",
    name: "Claude Pro · 直充月卡（下架）",
    summary: "旧码已失效，已下架。",
    description: "请改选 Claude Pro 成品号。",
    price_cny: 168,
    daitu_code: "307E565E19051098",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 0,
    sort_order: 900,
  },
  {
    slug: "gemini-ultra-topup",
    name: "Gemini Ultra · 代充（下架）",
    summary: "代充品已下架，请选成品号。",
    description: "已下架。",
    price_cny: 898,
    daitu_code: "B7A1E6DC817933A8",
    fulfill_type: "card",
    channel_tag: "",
    account_warning: "",
    visible: 0,
    sort_order: 910,
  },
];

export function upsertCatalog(database: Database.Database) {
  const insert = database.prepare(`
    INSERT INTO products (
      slug, name, summary, description, price_cny, daitu_code,
      fulfill_type, channel_tag, account_warning, visible, sort_order
    ) VALUES (
      @slug, @name, @summary, @description, @price_cny, @daitu_code,
      @fulfill_type, @channel_tag, @account_warning, @visible, @sort_order
    )
    ON CONFLICT(slug) DO UPDATE SET
      name = excluded.name,
      summary = excluded.summary,
      description = excluded.description,
      price_cny = excluded.price_cny,
      daitu_code = excluded.daitu_code,
      fulfill_type = excluded.fulfill_type,
      channel_tag = excluded.channel_tag,
      account_warning = excluded.account_warning,
      visible = excluded.visible,
      sort_order = excluded.sort_order
  `);

  const tx = database.transaction(() => {
    for (const row of CATALOG_ROWS) insert.run(row);
  });
  tx();
}
