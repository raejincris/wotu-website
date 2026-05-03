// @ts-check
import { defineConfig } from 'astro/config';
import mdx from '@astrojs/mdx';
import yaml from '@rollup/plugin-yaml';

export default defineConfig({
  site: 'https://www.wotu.vn',
  output: 'static',
  integrations: [mdx()],
  vite: {
    plugins: [yaml()],
  },
  server: {
    port: 4321,
  },
});
