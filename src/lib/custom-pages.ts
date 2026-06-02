/**
 * custom-pages.ts — danh sách trang tuỳ chỉnh (page-builder Phase 3).
 *
 * Mỗi trang là 1 file YAML trong src/data/pages/<slug>.yml với:
 *   title, description, template (shop|studio), nav (bool), layout[], blocks[]
 * Route động src/pages/[page].astro build từng trang; Nav đọc list này để tự
 * thêm trang có nav:true vào menu.
 */
const mods = import.meta.glob('../data/pages/*.yml', { eager: true });

export interface CustomPage {
  slug: string;
  title: string;
  description: string;
  template: 'shop' | 'studio';
  nav: boolean;
  layout: any;
  blocks: any[];
}

export const customPages: CustomPage[] = Object.entries(mods).map(([path, mod]) => {
  const slug = path.split('/').pop()!.replace(/\.yml$/, '');
  const d = ((mod as any).default ?? {}) as any;
  return {
    slug,
    title: d.title || slug,
    description: d.description || '',
    template: d.template === 'studio' ? 'studio' : 'shop',
    nav: !!d.nav,
    layout: d.layout,
    blocks: Array.isArray(d.blocks) ? d.blocks : [],
  };
});

/** Trang hiện trên menu của một phần (shop|studio). */
export function navPages(template: 'shop' | 'studio'): CustomPage[] {
  return customPages.filter((p) => p.nav && p.template === template);
}
