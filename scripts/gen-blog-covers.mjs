/**
 * gen-blog-covers.mjs — sinh ảnh bìa branded cho từng bài Nhật ký (1600×900).
 *
 * Đây là ẢNH ĐỒ HOẠ THIẾT KẾ (typographic + motif), KHÔNG phải photo giả.
 * Đọc frontmatter trực tiếp từ src/content/blog/*.md để tiêu đề/category/tone
 * luôn khớp bài viết. Output → public/uploads/blog/<slug>.png.
 *
 * Chạy lại khi thêm/sửa bài:  node scripts/gen-blog-covers.mjs
 */
import { chromium } from '@playwright/test';
import { readFileSync, writeFileSync, readdirSync, mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, basename } from 'node:path';
import yaml from 'js-yaml';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');
const blogDir = resolve(root, 'src/content/blog');
const outDir = resolve(root, 'public/uploads/blog');
mkdirSync(outDir, { recursive: true });

// Palette theo tone — đồng bộ với token thương hiệu (global.css).
const palettes = {
  warm:  { bg: 'radial-gradient(125% 125% at 80% 15%, #ECE1CD 0%, #E1D3B8 55%, #D6C4A2 100%)', ink: '#2B231C', sub: '#6B5C45', accent: '#B8835A', ring: 'rgba(184,131,90,0.30)' },
  light: { bg: 'radial-gradient(125% 125% at 80% 15%, #FBF8F2 0%, #F1EADD 60%, #E7DDCB 100%)', ink: '#2B231C', sub: '#6B5C45', accent: '#B8835A', ring: 'rgba(184,131,90,0.24)' },
  deep:  { bg: 'radial-gradient(125% 125% at 80% 15%, #2B2118 0%, #1E170F 55%, #130E09 100%)', ink: '#F5F0E8', sub: '#CBB89B', accent: '#CD9866', ring: 'rgba(205,152,102,0.34)' },
  dark:  { bg: 'radial-gradient(125% 125% at 80% 15%, #221A12 0%, #18120C 55%, #100B07 100%)', ink: '#F5F0E8', sub: '#CBB89B', accent: '#CD9866', ring: 'rgba(205,152,102,0.30)' },
};

function parseFrontmatter(raw) {
  const m = raw.match(/^---\r?\n([\s\S]*?)\r?\n---/);
  return m ? yaml.load(m[1]) : {};
}

function template(post) {
  const p = palettes[post.tone] || palettes.warm;
  return `<!DOCTYPE html><html lang="vi"><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@500&display=swap" rel="stylesheet" />
<style>
  * { margin:0; padding:0; box-sizing:border-box; }
  html,body { width:1600px; height:900px; }
  body { position:relative; overflow:hidden; background:${p.bg}; color:${p.ink}; font-family:'Inter',sans-serif; }
  .frame { position:absolute; inset:40px; border:1px solid ${p.ring}; border-radius:3px; }
  /* Motif: quầng sáng / khẩu độ — gợi ánh sáng & khoảng trống */
  .rings { position:absolute; top:-260px; right:-200px; width:900px; height:900px; }
  .rings circle { fill:none; stroke:${p.ring}; stroke-width:1.5; }
  .glow { position:absolute; top:-340px; right:-260px; width:1000px; height:1000px;
          background:radial-gradient(circle at center, ${p.accent}22 0%, transparent 60%); }
  .content { position:absolute; left:96px; right:96px; bottom:92px; }
  .eyebrow { font-family:'Inter',sans-serif; font-weight:500; font-size:20px; letter-spacing:0.32em;
             text-transform:uppercase; color:${p.accent}; padding-left:0.32em; margin-bottom:28px; }
  .title { font-family:'Cormorant Garamond',serif; font-weight:400; font-size:84px; line-height:1.04;
           max-width:1100px; letter-spacing:-0.5px; }
  .title em { font-style:italic; color:${p.accent}; }
  .foot { position:absolute; left:96px; right:96px; top:74px; display:flex; justify-content:space-between;
          align-items:center; font-family:'Inter',sans-serif; font-weight:500; font-size:17px;
          letter-spacing:0.26em; text-transform:uppercase; color:${p.sub}; }
  .foot .brand { color:${p.ink}; letter-spacing:0.3em; }
  .grain { position:absolute; inset:0; opacity:0.05; mix-blend-mode:overlay; pointer-events:none; }
</style></head>
<body>
  <div class="glow"></div>
  <svg class="rings" viewBox="0 0 900 900"><circle cx="450" cy="450" r="200"/><circle cx="450" cy="450" r="300"/><circle cx="450" cy="450" r="410"/></svg>
  <div class="frame"></div>
  <div class="foot"><span class="brand">WOTU</span><span>Nhật ký · wotu.vn</span></div>
  <div class="content">
    <div class="eyebrow">${post.category || 'Ghi chép'}</div>
    <h1 class="title">${post.title}</h1>
  </div>
  <svg class="grain"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
</body></html>`;
}

const files = readdirSync(blogDir).filter((f) => f.endsWith('.md') || f.endsWith('.mdx'));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });

for (const f of files) {
  const slug = basename(f).replace(/\.(md|mdx)$/, '');
  const fm = parseFrontmatter(readFileSync(resolve(blogDir, f), 'utf8'));
  if (!fm.title) continue;
  await page.setContent(template(fm), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(150);
  const out = resolve(outDir, `${slug}.png`);
  await page.screenshot({ path: out, clip: { x: 0, y: 0, width: 1600, height: 900 } });
  console.log('✓', slug, '·', fm.tone, '·', fm.category);
}

await browser.close();
console.log('Done →', outDir);
