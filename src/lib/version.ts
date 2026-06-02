// Version của marketing site WOTU — TỰ ĐỘNG, không bump tay.
// Giá trị được tính lúc build trong astro.config.mjs (số commit = build number,
// mỗi push +1) và inject qua Vite `define` thành hằng `__SITE_VERSION__`.
// Hiển thị dạng `v{SITE_VERSION}` ở footer.
declare const __SITE_VERSION__: string;

export const SITE_VERSION =
  typeof __SITE_VERSION__ !== 'undefined' ? __SITE_VERSION__ : '1.0';
