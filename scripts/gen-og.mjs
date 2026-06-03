/**
 * gen-og.mjs — sinh branded OG image (public/og.png, 1200×630).
 *
 * Render bằng chromium (qua @playwright/test) một template HTML editorial:
 * logo-light WOTU + eyebrow + slogan trên nền cocoa. KHÔNG cần ảnh chụp thật.
 *
 * Chạy lại khi đổi logo/slogan:  node scripts/gen-og.mjs
 */
import { chromium } from '@playwright/test';
import sharp from 'sharp';
import { readFileSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const root = resolve(__dirname, '..');

const logoSvg = readFileSync(resolve(root, 'public/logo-light.svg'), 'utf8');
const out = resolve(root, 'public/og.png');

const html = `<!DOCTYPE html>
<html lang="vi">
<head>
<meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.googleapis.com" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Cormorant+Garamond:ital,wght@0,400;0,500;1,400&family=Inter:wght@500&display=swap" rel="stylesheet" />
<style>
  * { margin: 0; padding: 0; box-sizing: border-box; }
  html, body { width: 1200px; height: 630px; }
  body {
    display: flex; align-items: center; justify-content: center;
    background:
      radial-gradient(120% 120% at 50% 0%, #221a13 0%, #1A1410 45%, #120d0a 100%);
    font-family: 'Inter', sans-serif;
    overflow: hidden;
  }
  .frame {
    position: absolute; inset: 38px;
    border: 1px solid rgba(184, 131, 90, 0.40);
    border-radius: 4px;
    pointer-events: none;
  }
  .stack {
    display: flex; flex-direction: column; align-items: center;
    text-align: center; gap: 30px;
  }
  .eyebrow {
    font-family: 'Inter', sans-serif;
    font-weight: 500; font-size: 19px; letter-spacing: 0.42em;
    text-transform: uppercase; color: #B8835A; padding-left: 0.42em;
  }
  .logo svg { width: 430px; height: auto; display: block; }
  .slogan {
    font-family: 'Cormorant Garamond', serif;
    font-style: italic; font-weight: 400;
    font-size: 46px; line-height: 1.25; color: #F5F0E8;
    max-width: 880px;
  }
  .foot {
    font-family: 'Inter', sans-serif;
    font-weight: 500; font-size: 18px; letter-spacing: 0.22em;
    text-transform: uppercase; color: rgba(245, 240, 232, 0.62);
    padding-left: 0.22em;
  }
</style>
</head>
<body>
  <div class="frame"></div>
  <div class="stack">
    <div class="eyebrow">Studio nội thất · Quy Nhơn</div>
    <div class="logo">${logoSvg}</div>
    <div class="slogan">Thiết kế &amp; thi công nội thất —<br/>một khoảng lặng, giữa đời vội.</div>
    <div class="foot">wotu.vn</div>
  </div>
</body>
</html>`;

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 630 }, deviceScaleFactor: 1 });
await page.setContent(html, { waitUntil: 'networkidle' });
await page.evaluate(() => document.fonts.ready);
await page.waitForTimeout(250);
const buf = await page.screenshot({ clip: { x: 0, y: 0, width: 1200, height: 630 } });
await browser.close();
// OG phải là PNG/JPG (Facebook/Zalo không ăn WebP) — nén palette để giảm ~50%.
await sharp(buf).png({ palette: true, quality: 90, compressionLevel: 9 }).toFile(out);
console.log('✓ OG image written →', out);
