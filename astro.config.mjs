// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import pagefind from 'astro-pagefind';

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
  },
  server: {
    port: 4321,
  },
});
