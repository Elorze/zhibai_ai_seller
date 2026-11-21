import Database from "better-sqlite3";
import fs from "fs";
import path from "path";
import { env } from "./env";
import { allocateUniqueUsdtAmount, getPaymentTtlMinutes } from "./usdt-amount";

export type Product = {
  id: number;
  slug: string;
  name: string;
  summary: string;
  description: string;
  price_cny: number;
  daitu_code: string;
  visible: number;
  sort_order: number;
  created_at: string;
};

export type PaymentStatus =
  | "pending"
  | "confirming"
  | "paid"
  | "failed"
  | "expired"
  | "manual_review";

export type Order = {
  id: number;
  order_no: string;
  product_id: number;
  product_name: string;
  email: string;
  amount_cny: number;
  amount_usdt: number;
  payment_status: PaymentStatus;
  fulfill_status: "none" | "processing" | "done" | "error";
  payment_channel: string;
  payment_tx_id: string | null;
  expires_at: string | null;
  daitu_trade_no: string | null;
  deliver_secret: string | null;
  fulfill_error: string | null;
  created_at: string;
  paid_at: string | null;
  fulfilled_at: string | null;
};

let db: Database.Database | null = null;

function resolveDbPath() {
  const configured = env("DATABASE_PATH", "./data/zhibai.db");
  return path.isAbsolute(configured)
    ? configured
    : path.join(process.cwd(), configured);
}

function columnExists(database: Database.Database, table: string, column: string) {
  const cols = database.prepare(`PRAGMA table_info(${table})`).all() as {
    name: string;
  }[];
  return cols.some((c) => c.name === column);
}

function migrateOrders(database: Database.Database) {
  if (!columnExists(database, "orders", "payment_channel")) {
    database.exec(
      `ALTER TABLE orders ADD COLUMN payment_channel TEXT NOT NULL DEFAULT 'usdt_trc20'`,
    );
  }
  if (!columnExists(database, "orders", "payment_tx_id")) {
    database.exec(`ALTER TABLE orders ADD COLUMN payment_tx_id TEXT`);
  }
  if (!columnExists(database, "orders", "expires_at")) {
    database.exec(`ALTER TABLE orders ADD COLUMN expires_at TEXT`);
  }
  database.exec(
    `CREATE UNIQUE INDEX IF NOT EXISTS idx_orders_payment_tx_id
     ON orders(payment_tx_id) WHERE payment_tx_id IS NOT NULL`,
  );
}

export function getDb() {
  if (db) return db;
  const dbPath = resolveDbPath();
  fs.mkdirSync(path.dirname(dbPath), { recursive: true });
  db = new Database(dbPath);
  db.pragma("journal_mode = WAL");
  db.exec(`
    CREATE TABLE IF NOT EXISTS products (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      slug TEXT NOT NULL UNIQUE,
      name TEXT NOT NULL,
      summary TEXT NOT NULL DEFAULT '',
      description TEXT NOT NULL DEFAULT '',
      price_cny REAL NOT NULL,
      daitu_code TEXT NOT NULL,
      visible INTEGER NOT NULL DEFAULT 1,
      sort_order INTEGER NOT NULL DEFAULT 0,
      created_at TEXT NOT NULL DEFAULT (datetime('now'))
    );

    CREATE TABLE IF NOT EXISTS orders (
      id INTEGER PRIMARY KEY AUTOINCREMENT,
      order_no TEXT NOT NULL UNIQUE,
      product_id INTEGER NOT NULL,
      product_name TEXT NOT NULL,
      email TEXT NOT NULL,
      amount_cny REAL NOT NULL,
      amount_usdt REAL NOT NULL,
      payment_status TEXT NOT NULL DEFAULT 'pending',
      fulfill_status TEXT NOT NULL DEFAULT 'none',
      payment_channel TEXT NOT NULL DEFAULT 'usdt_trc20',
      payment_tx_id TEXT,
      expires_at TEXT,
      daitu_trade_no TEXT,
      deliver_secret TEXT,
      fulfill_error TEXT,
      created_at TEXT NOT NULL DEFAULT (datetime('now')),
      paid_at TEXT,
      fulfilled_at TEXT,
      FOREIGN KEY(product_id) REFERENCES products(id)
    );
  `);
  migrateOrders(db);
  seedProducts(db);
  return db;
}

function seedProducts(database: Database.Database) {
  const count = database.prepare("SELECT COUNT(*) as c FROM products").get() as {
    c: number;
  };
  if (count.c > 0) return;

  const insert = database.prepare(`
    INSERT INTO products (slug, name, summary, description, price_cny, daitu_code, visible, sort_order)
    VALUES (@slug, @name, @summary, @description, @price_cny, @daitu_code, @visible, @sort_order)
  `);

  const rows = [
    {
      slug: "gpt-plus-ios",
      name: "ChatGPT Plus · iOS 美区开通",
      summary: "充到你自己的账号，适合日常 Plus 使用。",
      description:
        "交付充值卡密与开通指引。请使用你自己的 ChatGPT 账号完成开通。质保关注订阅是否掉档；因账号环境、共享或违规导致的封号不在质保范围。",
      price_cny: 149,
      daitu_code: "8C2F1E5A1F8D8118",
      visible: 1,
      sort_order: 10,
    },
    {
      slug: "gpt-plus-annual-ios",
      name: "ChatGPT Plus · 年卡（iOS）",
      summary: "一次开通约 12 个月 Plus，适合长期使用。",
      description:
        "交付年卡类充值卡密与开通指引，充到你自己的账号。掉订阅按规则处理；封号不保。",
      price_cny: 1680,
      daitu_code: "GPTPLUS-ANNUAL-IOS-20261002",
      visible: 1,
      sort_order: 15,
    },
    {
      slug: "gpt-pro-10x-ios",
      name: "ChatGPT Pro 10x · iOS 美区开通",
      summary: "更高额度的 Pro 档，适合重度使用。",
      description:
        "交付充值卡密与开通指引，充到你自己的账号。掉订阅按规则处理；封号不保。",
      price_cny: 759,
      daitu_code: "F75FAA3508D63C46",
      visible: 1,
      sort_order: 20,
    },
    {
      slug: "gpt-pro-20x-ios",
      name: "ChatGPT Pro 20x · iOS 美区开通",
      summary: "最高常用 Pro 档，适合高强度工作流。",
      description:
        "交付充值卡密与开通指引，充到你自己的账号。掉订阅可按剩余周期协商；封号不保。",
      price_cny: 1490,
      daitu_code: "D88A649A5CC464F5",
      visible: 1,
      sort_order: 30,
    },
    {
      slug: "gpt-pro-50x-ios",
      name: "ChatGPT Pro 50x · iOS 美区开通",
      summary: "超高额度 Pro，适合极限用量。",
      description:
        "交付充值卡密与开通指引，充到你自己的账号。质保关注订阅掉档；封号不保。",
      price_cny: 3490,
      daitu_code: "2C3BD75F9CE2C758",
      visible: 1,
      sort_order: 40,
    },
    {
      slug: "claude-pro-month",
      name: "Claude Pro · 直充月卡",
      summary: "原号开通 Claude Pro 月卡（部分渠道可能要求 KYC）。",
      description:
        "交付直充类卡密/开通结果。若渠道要求 KYC 或风控拦截，可能无法到账；介意请先确认账号状态。封号不保。",
      price_cny: 168,
      daitu_code: "307E565E19051098",
      visible: 1,
      sort_order: 50,
    },
    {
      slug: "grok-premium",
      name: "Grok Premium · 会员卡密",
      summary: "美区 Premium 充值卡密，原号开通。",
      description:
        "交付充值卡密与开通指引。掉订阅按规则处理；封号不保。",
      price_cny: 268,
      daitu_code: "C01878BB9126D760",
      visible: 1,
      sort_order: 60,
    },
    {
      slug: "grok-super",
      name: "Grok Super · 会员卡密",
      summary: "更高档 Grok Super，适合重度使用。",
      description:
        "交付充值卡密与开通指引。掉订阅按规则处理；封号不保。",
      price_cny: 838,
      daitu_code: "9BFFB902156EC0F1",
      visible: 1,
      sort_order: 70,
    },
    {
      slug: "gemini-ultra-topup",
      name: "Gemini Ultra · 代充开通",
      summary: "代充类会员开通，非成品号。",
      description:
        "按代充流程开通到你指定的账号。请按页面说明提供必要信息。质保关注开通结果；账号环境问题不在质保范围。",
      price_cny: 898,
      daitu_code: "B7A1E6DC817933A8",
      visible: 1,
      sort_order: 80,
    },
    {
      slug: "gpt-plus-ph",
      name: "ChatGPT Plus · 菲区通道",
      summary: "低价通道，稳定性通常弱于美区 iOS。文案标明通道。",
      description: "菲区会员通道，默认隐藏。仅作货源备份。",
      price_cny: 129,
      daitu_code: "6D66FF49218BF45C",
      visible: 0,
      sort_order: 100,
    },
    {
      slug: "gpt-pro-20x-ph",
      name: "ChatGPT Pro 20x · 菲区通道",
      summary: "低价 Pro 通道，默认不对前台展示。",
      description: "默认隐藏。仅供后台启用。",
      price_cny: 1180,
      daitu_code: "69526F78D0568841",
      visible: 0,
      sort_order: 110,
    },
  ];

  const tx = database.transaction(() => {
    for (const row of rows) insert.run(row);
  });
  tx();
}

export function listVisibleProducts() {
  return getDb()
    .prepare(
      "SELECT * FROM products WHERE visible = 1 ORDER BY sort_order ASC, id ASC",
    )
    .all() as Product[];
}

export function listAllProducts() {
  return getDb()
    .prepare("SELECT * FROM products ORDER BY sort_order ASC, id ASC")
    .all() as Product[];
}

export function getProductBySlug(slug: string) {
  return getDb()
    .prepare("SELECT * FROM products WHERE slug = ?")
    .get(slug) as Product | undefined;
}

export function getProductById(id: number) {
  return getDb()
    .prepare("SELECT * FROM products WHERE id = ?")
    .get(id) as Product | undefined;
}

export function updateProduct(
  id: number,
  patch: {
    name?: string;
    summary?: string;
    description?: string;
    price_cny?: number;
    visible?: number | boolean;
  },
) {
  const current = getProductById(id);
  if (!current) return null;
  const visible =
    patch.visible === undefined
      ? current.visible
      : patch.visible
        ? 1
        : 0;
  getDb()
    .prepare(
      `UPDATE products SET name = ?, summary = ?, description = ?, price_cny = ?, visible = ? WHERE id = ?`,
    )
    .run(
      patch.name ?? current.name,
      patch.summary ?? current.summary,
      patch.description ?? current.description,
      patch.price_cny ?? current.price_cny,
      visible,
      id,
    );
  return getProductById(id);
}

export function createOrder(input: { product: Product; email: string }) {
  const database = getDb();
  const orderNo = `Z${Date.now()}${Math.floor(Math.random() * 900 + 100)}`;
  const amountUsdt = allocateUniqueUsdtAmount(database, input.product.price_cny);
  const ttl = getPaymentTtlMinutes();

  database
    .prepare(
      `INSERT INTO orders (
        order_no, product_id, product_name, email, amount_cny, amount_usdt,
        payment_channel, expires_at
      ) VALUES (?, ?, ?, ?, ?, ?, 'usdt_trc20', datetime('now', ?))`,
    )
    .run(
      orderNo,
      input.product.id,
      input.product.name,
      input.email.trim().toLowerCase(),
      input.product.price_cny,
      amountUsdt,
      `+${ttl} minutes`,
    );
  return getOrderByNo(orderNo)!;
}

export function getOrderByNo(orderNo: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE order_no = ?")
    .get(orderNo) as Order | undefined;
}

export function findOrder(orderNo: string, email: string) {
  return getDb()
    .prepare(
      "SELECT * FROM orders WHERE order_no = ? AND email = ? COLLATE NOCASE",
    )
    .get(orderNo, email.trim().toLowerCase()) as Order | undefined;
}

export function findPendingOrderByUsdtAmount(amountUsdt: number) {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE payment_status IN ('pending', 'confirming')
         AND ABS(amount_usdt - ?) < 0.001
         AND (expires_at IS NULL OR expires_at > datetime('now'))
       ORDER BY id ASC LIMIT 1`,
    )
    .get(amountUsdt) as Order | undefined;
}

export function findOrderByPaymentTx(txId: string) {
  return getDb()
    .prepare("SELECT * FROM orders WHERE payment_tx_id = ?")
    .get(txId) as Order | undefined;
}

export function listOrders(limit = 100) {
  return getDb()
    .prepare("SELECT * FROM orders ORDER BY id DESC LIMIT ?")
    .all(limit) as Order[];
}

export function listOpenPaymentOrders() {
  return getDb()
    .prepare(
      `SELECT * FROM orders
       WHERE payment_status IN ('pending', 'confirming')
       ORDER BY id ASC`,
    )
    .all() as Order[];
}

export function setPaymentStatus(
  orderNo: string,
  status: PaymentStatus,
  extra?: { payment_tx_id?: string | null },
) {
  if (extra?.payment_tx_id !== undefined) {
    getDb()
      .prepare(
        `UPDATE orders SET payment_status = ?, payment_tx_id = COALESCE(?, payment_tx_id),
         paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
         WHERE order_no = ?`,
      )
      .run(status, extra.payment_tx_id, status, orderNo);
  } else {
    getDb()
      .prepare(
        `UPDATE orders SET payment_status = ?,
         paid_at = CASE WHEN ? = 'paid' THEN datetime('now') ELSE paid_at END
         WHERE order_no = ?`,
      )
      .run(status, status, orderNo);
  }
  return getOrderByNo(orderNo);
}

export function markOrderPaid(orderNo: string, paymentTxId?: string | null) {
  getDb()
    .prepare(
      `UPDATE orders SET payment_status = 'paid', paid_at = datetime('now'),
       payment_tx_id = COALESCE(?, payment_tx_id) WHERE order_no = ?`,
    )
    .run(paymentTxId ?? null, orderNo);
  return getOrderByNo(orderNo);
}

export function expireOpenOrders() {
  getDb()
    .prepare(
      `UPDATE orders SET payment_status = 'expired'
       WHERE payment_status IN ('pending', 'confirming')
         AND expires_at IS NOT NULL
         AND expires_at <= datetime('now')`,
    )
    .run();
}

export function markOrderFulfillResult(
  orderNo: string,
  result: {
    fulfill_status: Order["fulfill_status"];
    daitu_trade_no?: string | null;
    deliver_secret?: string | null;
    fulfill_error?: string | null;
  },
) {
  getDb()
    .prepare(
      `UPDATE orders SET
        fulfill_status = ?,
        daitu_trade_no = COALESCE(?, daitu_trade_no),
        deliver_secret = COALESCE(?, deliver_secret),
        fulfill_error = ?,
        fulfilled_at = CASE WHEN ? = 'done' THEN datetime('now') ELSE fulfilled_at END
      WHERE order_no = ?`,
    )
    .run(
      result.fulfill_status,
      result.daitu_trade_no ?? null,
      result.deliver_secret ?? null,
      result.fulfill_error ?? null,
      result.fulfill_status,
      orderNo,
    );
  return getOrderByNo(orderNo);
}
