// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import pagefind from 'astro-pagefind';

// Version tự động lúc build — KHÔNG bump tay.
// Quy ước: commit đầu tiên = v0.0.1. Số thứ tự commit (n) tách thành 3 chữ số,
// roll khi quá 9: patch = n%10, minor = (n/10)%10, major = n/100.
//   n=1   → 0.0.1     n=10  → 0.1.0     n=100 → 1.0.0     n=200 → 2.0.0
// Tính lúc build (repo có git). Cloudflare clone SHALLOW → count thiếu, nên
// nếu phát hiện shallow thì tự `git fetch --unshallow` để lấy đủ lịch sử rồi
// đếm. Không git / unshallow thất bại → fallback short SHA (vẫn đổi mỗi push).
const SITE_VERSION = (() => {
  const git = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  let shallow = git('git rev-parse --is-shallow-repository') === 'true';
  if (shallow) {
    git('git fetch --unshallow --quiet');
    shallow = git('git rev-parse --is-shallow-repository') === 'true';
  }
  const n = parseInt(git('git rev-list --count HEAD'), 10);
  if (n > 0 && !shallow) {
    const patch = n % 10;
    const minor = Math.floor(n / 10) % 10;
    const major = Math.floor(n / 100);
    return `${major}.${minor}.${patch}`;
  }
  const sha = (
    git('git rev-parse --short HEAD') ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    ''
  ).slice(0, 7);
  return sha ? `0.0.0+${sha}` : '0.0.0';
})();

export default defineConfig({
  site: 'https://www.wotu.vn',
  output: 'static',
  integrations: [
    pagefind(),
    mdx(),
    sitemap({
      filter: (page) => !page.includes('/admin'),
      changefreq: 'monthly',
      priority: 0.7,
      // Ưu tiên crawl theo giá trị SEO của từng route: trang bán hàng / landing
      // cao nhất, trang tiện ích / pháp lý thấp nhất.
      serialize(item) {
        const path = new URL(item.url).pathname;
        const rules = [
          { re: /^\/$/,                            priority: 1.0, changefreq: 'weekly'  }, // shop home
          { re: /^\/studio\/$/,                    priority: 0.9, changefreq: 'monthly' },
          { re: /^\/san-pham\/$/,                  priority: 0.9, changefreq: 'weekly'  },
          { re: /^\/combo\//,                      priority: 0.9, changefreq: 'weekly'  },
          { re: /^\/studio\/dich-vu\//,            priority: 0.8, changefreq: 'monthly' }, // service landing (local SEO)
          { re: /^\/san-pham\/.+/,                 priority: 0.8, changefreq: 'weekly'  }, // product detail
          { re: /^\/studio\/(projects|blog)\/$/,   priority: 0.8, changefreq: 'monthly' },
          { re: /^\/studio\/(projects|blog)\/.+/,  priority: 0.7, changefreq: 'monthly' },
          { re: /^\/(yeu-thich|tim-kiem)\//,       priority: 0.4, changefreq: 'monthly' },
          { re: /^\/bao-mat/,                      priority: 0.3, changefreq: 'yearly'  },
        ];
        const match = rules.find((r) => r.re.test(path));
        if (match) {
          item.priority = match.priority;
          item.changefreq = match.changefreq;
        }
        return item;
      },
    }),
  ],
  vite: {
    plugins: [yaml()],
    define: {
      __SITE_VERSION__: JSON.stringify(SITE_VERSION),
    },
  },
  server: {
    port: 4321,
  },
});
