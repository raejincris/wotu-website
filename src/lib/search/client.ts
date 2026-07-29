/**
 * Client search helpers — DÙNG CHUNG cho trang /tim-kiem/ và inline Nav search.
 * Chỉ chạy ở trình duyệt (fetch index). Không side-effect ở top-level → import
 * lúc build (endpoint/type) an toàn.
 */
import { normalizeText, tokenize } from './normalize';
import type { SearchEntry } from './types';

export type { SearchEntry };

let cache: Promise<SearchEntry[]> | null = null;

/** Tải /search-index.json 1 lần, cache ở module. Lỗi mạng → [] (degrade sạch). */
export function loadIndex(): Promise<SearchEntry[]> {
  if (!cache) {
    cache = fetch('/search-index.json')
      .then((r) => (r.ok ? r.json() : []))
      .catch(() => []);
  }
  return cache;
}

export interface ProductFilters {
  q?: string;
  cat?: string; // catKey: sofa/ban/.../combo/phong-mau; '' = tất cả
  price?: string; // key trong PRICE_BUCKETS; '' = tất cả
  room?: string; // phong-khach/...; '' = tất cả
  stock?: boolean; // true = chỉ còn hàng
}

/** Khoảng giá (đồng). Cận trên null = không giới hạn. */
export const PRICE_BUCKETS: Record<string, [number, number | null]> = {
  lt3: [0, 3_000_000],
  '3-6': [3_000_000, 6_000_000],
  '6-10': [6_000_000, 10_000_000],
  gt10: [10_000_000, null],
};

function inBucket(price: number | null, key?: string): boolean {
  if (!key || !PRICE_BUCKETS[key]) return true;
  if (price == null) return false;
  const [lo, hi] = PRICE_BUCKETS[key];
  return price >= lo && (hi == null || price < hi);
}

/**
 * Lọc + xếp hạng product index theo query (không dấu, AND token) + bộ lọc.
 * Query rỗng → trả tất cả đã lọc, ưu tiên rating cao.
 */
export function filterProducts(all: SearchEntry[], f: ProductFilters): SearchEntry[] {
  const tokens = tokenize(f.q ?? '');
  const nq = normalizeText(f.q ?? '');
  const scored: { e: SearchEntry; score: number }[] = [];
  for (const e of all) {
    if (f.cat && e.catKey !== f.cat) continue;
    if (f.room && e.room !== f.room) continue;
    if (f.stock && !e.stock) continue;
    if (!inBucket(e.priceNum, f.price)) continue;
    if (tokens.length && !tokens.every((t) => e.kw.includes(t))) continue;

    let score = 0;
    if (nq) {
      const t = normalizeText(e.title);
      if (t.startsWith(nq)) score += 100;
      else if (t.includes(nq)) score += 60;
      else score += 20;
    }
    score += e.rating ?? 0;
    scored.push({ e, score });
  }
  scored.sort((a, b) => b.score - a.score);
  return scored.map((s) => s.e);
}
