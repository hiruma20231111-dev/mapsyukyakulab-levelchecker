// 営業メンバー・リード・目標・設定のストア。
// Redis があればそれを使い、無ければプロセス内メモリにフォールバック（Redis未接続でも動く）。
import crypto from "node:crypto";
import { getClient } from "./redis";
import { scoreV3 } from "@/lib/domain/score";
import {
  type SalesMember,
  type Lead,
  type LeadStatus,
  type AppSettings,
  type LeadStats,
  DEFAULT_SETTINGS,
} from "./types";

const TTL_MAX = 315360000; // 10年（無期限相当）

// ---- Redis未接続時のフォールバック（globalThis で HMR をまたいで共有）----
const g = globalThis as unknown as {
  __lcSales?: Map<string, SalesMember>;
  __lcLeads?: Map<string, Lead>;
  __lcGoals?: Map<string, number>;
  __lcSettings?: { v: AppSettings };
  __lcStats?: Map<string, LeadStats>;
};
const salesMem = g.__lcSales ?? (g.__lcSales = new Map());
const leadMem = g.__lcLeads ?? (g.__lcLeads = new Map());
const goalMem = g.__lcGoals ?? (g.__lcGoals = new Map());
const settingsMem = g.__lcSettings ?? (g.__lcSettings = { v: { ...DEFAULT_SETTINGS } });
const statMem = g.__lcStats ?? (g.__lcStats = new Map());

function rid(n = 8): string {
  return crypto.randomBytes(n).toString("hex").slice(0, n);
}
function token(): string {
  return crypto.randomBytes(18).toString("base64url");
}

function slugify(name: string): string {
  const base = (name || "")
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 20);
  return `${base || "r"}-${Math.random().toString(36).slice(2, 8)}`;
}

// =====================================================================
// 営業メンバー
// =====================================================================
const SALES_INDEX = "lc:sales:index";

export async function createSales(name: string): Promise<SalesMember> {
  const rec: SalesMember = {
    id: rid(8),
    name: name.trim() || "名称未設定",
    token: token(),
    role: "sales",
    active: true,
    createdAt: Date.now(),
  };
  const c = getClient();
  if (c) {
    try {
      await c.set(`lc:sales:${rec.id}`, JSON.stringify(rec));
      await c.set(`lc:salestok:${rec.token}`, rec.id);
      await c.lpush(SALES_INDEX, rec.id);
      await c.expire(SALES_INDEX, TTL_MAX);
      return rec;
    } catch { /* fallback */ }
  }
  salesMem.set(rec.id, rec);
  return rec;
}

export async function getSales(id: string): Promise<SalesMember | null> {
  if (!id) return null;
  const c = getClient();
  if (c) {
    try {
      const s = await c.get(`lc:sales:${id}`);
      if (s) return JSON.parse(s) as SalesMember;
    } catch { /* fallback */ }
  }
  return salesMem.get(id) ?? null;
}

export async function getSalesByToken(tok: string): Promise<SalesMember | null> {
  if (!tok) return null;
  const c = getClient();
  if (c) {
    try {
      const id = await c.get(`lc:salestok:${tok}`);
      if (id) return getSales(id);
    } catch { /* fallback */ }
  }
  for (const s of salesMem.values()) if (s.token === tok) return s;
  return null;
}

export async function listSales(): Promise<SalesMember[]> {
  const c = getClient();
  if (c) {
    try {
      const ids = await c.lrange(SALES_INDEX, 0, 999);
      const out: SalesMember[] = [];
      for (const id of ids || []) {
        const s = await getSales(id);
        if (s) out.push(s);
      }
      if (out.length || (ids && ids.length)) return out;
    } catch { /* fallback */ }
  }
  return [...salesMem.values()].sort((a, b) => a.createdAt - b.createdAt);
}

export async function updateSales(id: string, patch: Partial<Pick<SalesMember, "name" | "active" | "lineUrl">>): Promise<SalesMember | null> {
  const cur = await getSales(id);
  if (!cur) return null;
  const next: SalesMember = { ...cur, ...patch };
  const c = getClient();
  if (c) {
    try {
      await c.set(`lc:sales:${id}`, JSON.stringify(next));
      return next;
    } catch { /* fallback */ }
  }
  salesMem.set(id, next);
  return next;
}

export async function deleteSales(id: string): Promise<void> {
  const cur = await getSales(id);
  const c = getClient();
  if (c) {
    try {
      if (cur) await c.del(`lc:salestok:${cur.token}`);
      await c.del(`lc:sales:${id}`);
      await c.lrem(SALES_INDEX, 0, id);
    } catch { /* fallback */ }
  }
  salesMem.delete(id);
}

// =====================================================================
// リード（診断＝追客案件）
// =====================================================================
const LEADS_INDEX = "lc:leads:index";

export interface CreateLeadInput {
  salesId: string;
  storeName: string;
  answers: Lead["answers"];
  query?: string;
  weights?: Lead["weights"];
  descText?: string;
  keywords?: string;
}

export async function createLead(input: CreateLeadInput): Promise<Lead> {
  const now = Date.now();
  const s = scoreV3(input.answers, input.weights);
  const rec: Lead = {
    id: rid(10),
    slug: slugify(input.storeName),
    salesId: input.salesId,
    storeName: input.storeName.trim() || "店舗名未設定",
    answers: input.answers,
    query: input.query,
    weights: input.weights,
    descText: input.descText,
    keywords: input.keywords,
    total: s.total,
    rank: s.rank,
    status: "pre",
    statusHistory: [{ status: "pre", ts: now }],
    createdAt: now,
    updatedAt: now,
  };
  const c = getClient();
  if (c) {
    try {
      await c.set(`lc:lead:${rec.id}`, JSON.stringify(rec));
      await c.set(`lc:leadslug:${rec.slug}`, rec.id);
      await c.lpush(LEADS_INDEX, rec.id);
      await c.lpush(`lc:leads:sales:${rec.salesId}`, rec.id);
      await c.expire(LEADS_INDEX, TTL_MAX);
      await c.expire(`lc:leads:sales:${rec.salesId}`, TTL_MAX);
      return rec;
    } catch { /* fallback */ }
  }
  leadMem.set(rec.id, rec);
  return rec;
}

export async function getLead(id: string): Promise<Lead | null> {
  if (!id) return null;
  const c = getClient();
  if (c) {
    try {
      const s = await c.get(`lc:lead:${id}`);
      if (s) return JSON.parse(s) as Lead;
    } catch { /* fallback */ }
  }
  return leadMem.get(id) ?? null;
}

export async function getLeadBySlug(slug: string): Promise<Lead | null> {
  if (!slug) return null;
  const c = getClient();
  if (c) {
    try {
      const id = await c.get(`lc:leadslug:${slug}`);
      if (id) return getLead(id);
    } catch { /* fallback */ }
  }
  for (const l of leadMem.values()) if (l.slug === slug) return l;
  return null;
}

export async function updateLeadStatus(id: string, status: LeadStatus): Promise<Lead | null> {
  const cur = await getLead(id);
  if (!cur) return null;
  const now = Date.now();
  const next: Lead = {
    ...cur,
    status,
    statusHistory: [...cur.statusHistory, { status, ts: now }],
    updatedAt: now,
  };
  const c = getClient();
  if (c) {
    try {
      await c.set(`lc:lead:${id}`, JSON.stringify(next));
      return next;
    } catch { /* fallback */ }
  }
  leadMem.set(id, next);
  return next;
}

export async function deleteLead(id: string): Promise<void> {
  const cur = await getLead(id);
  const c = getClient();
  if (c) {
    try {
      if (cur) {
        await c.del(`lc:leadslug:${cur.slug}`);
        await c.lrem(`lc:leads:sales:${cur.salesId}`, 0, id);
        await c.del(`lc:lead:stat:${cur.slug}`);
      }
      await c.del(`lc:lead:${id}`);
      await c.lrem(LEADS_INDEX, 0, id);
    } catch { /* fallback */ }
  }
  leadMem.delete(id);
  if (cur) statMem.delete(cur.slug);
}

export async function listLeadsBySales(salesId: string, limit = 500): Promise<Lead[]> {
  const c = getClient();
  if (c) {
    try {
      const ids = await c.lrange(`lc:leads:sales:${salesId}`, 0, limit - 1);
      const out: Lead[] = [];
      for (const id of ids || []) {
        const l = await getLead(id);
        if (l) out.push(l);
      }
      if (out.length || (ids && ids.length)) return out;
    } catch { /* fallback */ }
  }
  return [...leadMem.values()].filter((l) => l.salesId === salesId).sort((a, b) => b.createdAt - a.createdAt);
}

export async function listAllLeads(limit = 2000): Promise<Lead[]> {
  const c = getClient();
  if (c) {
    try {
      const ids = await c.lrange(LEADS_INDEX, 0, limit - 1);
      const out: Lead[] = [];
      for (const id of ids || []) {
        const l = await getLead(id);
        if (l) out.push(l);
      }
      if (out.length || (ids && ids.length)) return out;
    } catch { /* fallback */ }
  }
  return [...leadMem.values()].sort((a, b) => b.createdAt - a.createdAt);
}

// =====================================================================
// 月間目標（営業別 / 年月キー yyyy-mm）
// =====================================================================
export function monthKey(d = new Date()): string {
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}`;
}

export async function getGoal(salesId: string, ym: string): Promise<number | null> {
  const key = `lc:goal:${salesId}:${ym}`;
  const c = getClient();
  if (c) {
    try {
      const v = await c.get(key);
      if (v != null) return Number(v);
    } catch { /* fallback */ }
  }
  const m = goalMem.get(key);
  return m == null ? null : m;
}

export async function setGoal(salesId: string, ym: string, n: number): Promise<void> {
  const key = `lc:goal:${salesId}:${ym}`;
  const c = getClient();
  if (c) {
    try {
      await c.set(key, String(n));
      return;
    } catch { /* fallback */ }
  }
  goalMem.set(key, n);
}

/** 目標（未設定ならデフォルトにフォールバック）。 */
export async function getEffectiveGoal(salesId: string, ym: string): Promise<number> {
  const g2 = await getGoal(salesId, ym);
  if (g2 != null) return g2;
  const st = await getSettings();
  return st.defaultMonthlyGoal;
}

// =====================================================================
// 設定
// =====================================================================
const SETTINGS_KEY = "lc:settings";

export async function getSettings(): Promise<AppSettings> {
  const c = getClient();
  if (c) {
    try {
      const s = await c.get(SETTINGS_KEY);
      if (s) return { ...DEFAULT_SETTINGS, ...(JSON.parse(s) as Partial<AppSettings>) };
    } catch { /* fallback */ }
  }
  return { ...settingsMem.v };
}

export async function setSettings(patch: Partial<AppSettings>): Promise<AppSettings> {
  const cur = await getSettings();
  const next: AppSettings = { ...cur, ...patch };
  const c = getClient();
  if (c) {
    try {
      await c.set(SETTINGS_KEY, JSON.stringify(next));
      return next;
    } catch { /* fallback */ }
  }
  settingsMem.v = next;
  return next;
}

/** 全体のLINE 友だち追加URL（フォールバック）。設定→環境変数の順。 */
export async function getLineAddUrl(): Promise<string> {
  const s = await getSettings();
  return s.lineAddUrl || process.env.LINE_ADD_URL || "";
}

/** リードのLINE URLを解決：発行した営業のLINE → 全体設定 → 環境変数。 */
export async function resolveLineUrlForSales(salesId: string): Promise<string> {
  const sales = salesId ? await getSales(salesId) : null;
  if (sales?.lineUrl) return sales.lineUrl;
  return getLineAddUrl();
}

// =====================================================================
// 公開結果ページの閲覧統計
// =====================================================================
export async function recordView(slug: string): Promise<void> {
  if (!slug) return;
  const now = Date.now();
  const c = getClient();
  if (c) {
    try {
      await c.hincrby(`lc:lead:stat:${slug}`, "views", 1);
      await c.hset(`lc:lead:stat:${slug}`, "lastTs", String(now));
      await c.expire(`lc:lead:stat:${slug}`, TTL_MAX);
      return;
    } catch { /* fallback */ }
  }
  const s = statMem.get(slug) ?? { views: 0, lastTs: 0 };
  s.views += 1;
  s.lastTs = now;
  statMem.set(slug, s);
}

export async function getStats(slug: string): Promise<LeadStats> {
  const empty: LeadStats = { views: 0, lastTs: 0 };
  if (!slug) return empty;
  const c = getClient();
  if (c) {
    try {
      const h = await c.hgetall(`lc:lead:stat:${slug}`);
      if (h && Object.keys(h).length) return { views: +(h.views || 0), lastTs: +(h.lastTs || 0) };
    } catch { /* fallback */ }
  }
  return statMem.get(slug) ?? empty;
}
