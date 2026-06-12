/* Catalog lookup dùng chung (build-time) — sinh TỪ data YAML để href + ảnh
 * minh hoạ luôn khớp trang chi tiết. Dùng ở: /yeu-thich/ (wishlist render),
 * RecentlyViewed.astro ("Đã xem gần đây"). Import trong frontmatter Astro,
 * serialize qua catalogJson() rồi đưa xuống client qua define:vars. */
import shopProducts from '../data/shop-products.yml';
import shopHome from '../data/shop-home.yml';

export interface CatalogEntry {
  id: string;
  name: string;
  meta: string;
  price: number;
  priceLabel: string;
  href: string;
  illo: string;
  placeholder: string;
}

const num = (s: unknown) => Number(String(s ?? '').replace(/[^\d]/g, '')) || 0;

export function buildCatalog(): CatalogEntry[] {
  const allProds = [
    ...((shopProducts as any).products ?? []),
    ...((shopProducts as any).productsAfterCta ?? []),
  ];
  const combos = (shopHome as any).combos ?? [];

  return [
    ...combos.map((c: any) => ({
      id: c.id,
      name: `${c.name} ${c.nameEm ?? ''}${c.nameTail ?? ''}`.trim(),
      meta: c.cat,
      price: c.price ?? num(c.priceNew),
      priceLabel: c.priceNew ?? c.price ?? '',
      href: c.href,
      illo: `/uploads/products/combo-${c.room}.webp`,
      placeholder: c.placeholder ?? `Combo ${c.nameEm ?? ''}`.trim(),
    })),
    ...allProds.map((p: any) => ({
      id: p.id,
      name: `${p.name} ${p.nameEm ?? ''}${p.nameTail ?? ''}`.trim(),
      meta: p.cat,
      price: p.priceNum ?? num(p.price),
      priceLabel: p.price,
      href: p.href,
      illo: p.photo || `/uploads/products/cat-${p.catKey}.webp`,
      placeholder: p.placeholder ?? p.name,
    })),
  ];
}

/** Serialize cho client. Escape `</script>` đề phòng break-out qua define:vars. */
export function catalogJson(): string {
  return JSON.stringify(buildCatalog()).replace(/<\/script>/gi, '<\\/script>');
}
