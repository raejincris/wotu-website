// Version của marketing site WOTU — TỰ ĐỘNG, không bump tay.
// Tính lúc build trong astro.config.mjs từ số thứ tự commit (commit đầu = 0.0.1,
// roll mỗi 9: n=100 → 1.0.0), inject qua Vite `define` thành `__SITE_VERSION__`.
// Hiển thị dạng `v{SITE_VERSION}` ở footer.
declare const __SITE_VERSION__: string;

export const SITE_VERSION =
  typeof __SITE_VERSION__ !== 'undefined' ? __SITE_VERSION__ : '1.0';
