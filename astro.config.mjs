// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import sitemap from '@astrojs/sitemap';
import yaml from '@rollup/plugin-yaml';
import pagefind from 'astro-pagefind';

import cloudflare from '@astrojs/cloudflare';

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
    }),
  ],

  vite: {
    plugins: [yaml()],
  },

  server: {
    port: 4321,
  },

  adapter: cloudflare(),
});