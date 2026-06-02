// @ts-check
import { execSync } from 'node:child_process';
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import pagefind from 'astro-pagefind';

// Version tự động lúc build — KHÔNG bump tay.
// Major.minor cố định ('1.0'); build number = số commit (mỗi push +1).
// Tính lúc build trên Cloudflare (repo có git). Local folder này không phải git
// → rơi về '1.0'. Shallow clone → dùng short SHA (vẫn đổi mỗi push) thay vì
// commit count sai.
const SITE_VERSION = (() => {
  const BASE = '1.0';
  const git = (cmd) => {
    try {
      return execSync(cmd, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim();
    } catch {
      return '';
    }
  };
  const shallow = git('git rev-parse --is-shallow-repository') === 'true';
  const count = git('git rev-list --count HEAD');
  if (count && !shallow) return `${BASE}.${count}`;
  const sha = (
    git('git rev-parse --short HEAD') ||
    process.env.WORKERS_CI_COMMIT_SHA ||
    process.env.CF_PAGES_COMMIT_SHA ||
    ''
  ).slice(0, 7);
  return sha ? `${BASE}+${sha}` : BASE;
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
