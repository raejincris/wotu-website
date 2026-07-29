/**
 * Product search index — sinh /search-index.json lúc build từ YAML sẵn có.
 * Nguồn "mua được" có TRANG THẬT: 18 sản phẩm (shop-products.yml → products +
 * productsAfterCta, route [id].astro), 6 combo (shop-home.yml → combos, route
 * combo/[slug].astro), 4 phòng mẫu (phong-mau.yml → rooms, route phong-mau/[slug]).
 *
 * Field `kw` = text đã BỎ DẤU (normalizeText) → client so khớp không dấu.
 * Chỉ dùng DATA CÓ THẬT (giá/sao/review từ YAML) — không bịa số (content-copy.md).
 * Endpoint 'self' → CSP không đổi. Client (Nav + /tim-kiem) fetch & cache.
 */
import type { APIRoute } from 'astro';
import shopProducts from '../data/shop-products.yml';
import shopHome from '../data/shop-home.yml';
import phongMau from '../data/phong-mau.yml';
import { normalizeText } from '../lib/search/normalize';
import type { SearchEntry } from '../lib/search/types';

// 45000000 → "45.000.000đ" (không phụ thuộc ICU — deterministic ở build Node).
const vnd = (n: number) => String(n).replace(/\B(?=(\d{3})+(?!\d))/g, '.') + 'đ';
// Tên đầy đủ khớp cách detail page dựng: name + nameEm + nameTail.
const fullName = (x: any) => `${x.name ?? ''} ${x.nameEm ?? ''}${x.nameTail ?? ''}`.replace(/\s+/g, ' ').trim();

function buildIndex(): SearchEntry[] {
  const out: SearchEntry[] = [];

  const sp = shopProducts as any;
  const products = [...(sp.products ?? []), ...(sp.productsAfterCta ?? [])];
  for (const p of products) {
    const title = fullName(p);
    const tags = (p.tags ?? []) as string[];
    out.push({
      type: 'product',
      id: String(p.id),
      title,
      cat: p.cat ?? '',
      catKey: p.catKey ?? '',
      room: p.room ?? '',
      priceNum: typeof p.priceNum === 'number' ? p.priceNum : null,
      priceText: p.price ?? '',
      rating: typeof p.ratingNum === 'number' ? p.ratingNum : null,
      reviews: typeof p.reviews === 'number' ? p.reviews : null,
      stock: tags.includes('in-stock'),
      img: p.photo ?? '',
      // href trong YAML đã đúng route [id].astro (sofa-may → trang bespoke).
      url: p.href ?? `/san-pham/${String(p.id).replace(/^p-/, '')}/`,
      kw: normalizeText([title, p.cat, p.catKey, p.room, ...tags].join(' ')),
    });
  }

  const combos = ((shopHome as any).combos ?? []) as any[];
  for (const c of combos) {
    const title = fullName(c);
    out.push({
      type: 'combo',
      id: String(c.id),
      title,
      cat: 'Combo trọn gói',
      catKey: 'combo',
      room: c.room ?? '',
      priceNum: typeof c.price === 'number' ? c.price : null,
      priceText: typeof c.price === 'number' ? vnd(c.price) : (c.price ?? ''),
      rating: typeof c.ratingNum === 'number' ? c.ratingNum : null,
      reviews: typeof c.reviews === 'number' ? c.reviews : null,
      stock: true,
      img: c.photo ?? '',
      url: `/combo/${String(c.id).replace(/^combo-/, '')}/`,
      kw: normalizeText([title, 'combo', c.room, c.desc].join(' ')),
    });
  }

  const rooms = ((phongMau as any).rooms ?? []) as any[];
  for (const r of rooms) {
    const title = `${r.name ?? ''} ${r.nameEm ?? ''}`.replace(/\s+/g, ' ').trim();
    out.push({
      type: 'room',
      id: String(r.slug),
      title,
      cat: r.style ?? 'Phòng mẫu',
      catKey: 'phong-mau',
      room: r.room ?? '',
      priceNum: null,
      priceText: '',
      rating: null,
      reviews: null,
      stock: false,
      img: r.photo ?? '',
      url: r.href || `/phong-mau/${String(r.slug)}/`,
      kw: normalizeText([title, r.style, r.room, ...(r.tags ?? [])].join(' ')),
    });
  }

  return out;
}

export const GET: APIRoute = () =>
  new Response(JSON.stringify(buildIndex()), {
    headers: { 'Content-Type': 'application/json; charset=utf-8' },
  });
