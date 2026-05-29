/**
 * gen-product-illos.mjs — sinh ảnh MINH HOẠ line-art theo nhóm sản phẩm (4:3).
 *
 * KHÔNG phải ảnh chụp sofa thật — là tranh line-art nội thất trên nền thương
 * hiệu, dùng làm placeholder catalog khi chưa có ảnh chụp. Khi có ảnh thật,
 * thay file cùng tên trong public/uploads/products/ là xong.
 *
 * Output: public/uploads/products/cat-<key>.png  (sofa ban ghe giuong tu ke den tham combo)
 * Chạy: node scripts/gen-product-illos.mjs
 */
import { chromium } from '@playwright/test';
import { mkdirSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const outDir = resolve(__dirname, '..', 'public/uploads/products');
mkdirSync(outDir, { recursive: true });

// Line-art nội thất — viewBox 400×300, nét đặt giữa, có đường sàn.
const S = 'fill="none" stroke="#3A2E22" stroke-width="6" stroke-linecap="round" stroke-linejoin="round"';
const floor = '<line x1="40" y1="248" x2="360" y2="248" stroke="#B8835A" stroke-width="3" stroke-dasharray="2 9" opacity="0.7"/>';
const icons = {
  sofa: `<rect x="78" y="120" width="244" height="56" rx="16" ${S}/><rect x="62" y="158" width="276" height="50" rx="14" ${S}/><rect x="56" y="150" width="30" height="66" rx="13" ${S}/><rect x="314" y="150" width="30" height="66" rx="13" ${S}/><line x1="84" y1="208" x2="84" y2="236" ${S}/><line x1="316" y1="208" x2="316" y2="236" ${S}/>${floor}`,
  ban: `<rect x="92" y="150" width="216" height="16" rx="8" ${S}/><line x1="108" y1="166" x2="108" y2="236" ${S}/><line x1="292" y1="166" x2="292" y2="236" ${S}/><line x1="150" y1="166" x2="150" y2="236" ${S}/><line x1="250" y1="166" x2="250" y2="236" ${S}/>${floor}`,
  ghe: `<path d="M152 96 q0 -10 10 -10 h76 q10 0 10 10 v84 h-96 z" ${S}/><rect x="138" y="178" width="124" height="20" rx="8" ${S}/><line x1="150" y1="198" x2="150" y2="240" ${S}/><line x1="250" y1="198" x2="250" y2="240" ${S}/>${floor}`,
  giuong: `<rect x="64" y="100" width="34" height="116" rx="8" ${S}/><rect x="92" y="160" width="252" height="48" rx="12" ${S}/><rect x="110" y="150" width="62" height="26" rx="10" ${S}/><line x1="100" y1="208" x2="100" y2="236" ${S}/><line x1="336" y1="208" x2="336" y2="236" ${S}/>${floor}`,
  tu: `<rect x="132" y="66" width="136" height="180" rx="8" ${S}/><line x1="200" y1="74" x2="200" y2="238" ${S}/><line x1="186" y1="150" x2="186" y2="170" ${S}/><line x1="214" y1="150" x2="214" y2="170" ${S}/>${floor}`,
  ke: `<rect x="118" y="68" width="164" height="178" rx="6" ${S}/><line x1="118" y1="118" x2="282" y2="118" ${S}/><line x1="118" y1="158" x2="282" y2="158" ${S}/><line x1="118" y1="198" x2="282" y2="198" ${S}/>${floor}`,
  den: `<path d="M168 92 h64 l16 52 h-96 z" ${S}/><line x1="200" y1="144" x2="200" y2="236" ${S}/><line x1="172" y1="236" x2="228" y2="236" ${S}/>${floor}`,
  tham: `<path d="M118 158 h164 l40 76 h-244 z" ${S}/><path d="M142 172 h116 l26 48 h-168 z" ${S} opacity="0.55"/><line x1="78" y1="234" x2="78" y2="244" ${S} opacity="0.5"/><line x1="120" y1="234" x2="120" y2="244" ${S} opacity="0.5"/><line x1="200" y1="234" x2="200" y2="244" ${S} opacity="0.5"/><line x1="280" y1="234" x2="280" y2="244" ${S} opacity="0.5"/><line x1="322" y1="234" x2="322" y2="244" ${S} opacity="0.5"/>`,
  // Combo = nhóm: sofa nhỏ + đèn + bàn tròn
  combo: `<rect x="60" y="150" width="150" height="40" rx="12" ${S}/><rect x="52" y="142" width="22" height="52" rx="10" ${S}/><rect x="196" y="142" width="22" height="52" rx="10" ${S}/><rect x="74" y="120" width="130" height="38" rx="12" ${S}/><line x1="70" y1="190" x2="70" y2="214" ${S}/><line x1="200" y1="190" x2="200" y2="214" ${S}/><ellipse cx="280" cy="186" rx="34" ry="12" ${S}/><line x1="280" y1="198" x2="280" y2="214" ${S}/><path d="M300 96 h44 l12 40 h-68 z" ${S}/><line x1="324" y1="136" x2="324" y2="214" ${S}/>${floor}`,
};

const labels = {
  sofa: 'Sofa', ban: 'Bàn', ghe: 'Ghế', giuong: 'Giường', tu: 'Tủ',
  ke: 'Kệ', den: 'Đèn', tham: 'Thảm', combo: 'Combo',
};

function template(key) {
  return `<!DOCTYPE html><html><head><meta charset="utf-8" />
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin />
<link href="https://fonts.googleapis.com/css2?family=Inter:wght@500&display=swap" rel="stylesheet" />
<style>
  *{margin:0;padding:0;box-sizing:border-box}
  html,body{width:1200px;height:900px}
  body{position:relative;overflow:hidden;
    background:repeating-linear-gradient(135deg, rgba(184,131,90,0.05) 0 2px, transparent 2px 14px),
               radial-gradient(125% 125% at 30% 18%, #F3EBDC 0%, #ECE0CB 55%, #E2D4B9 100%);}
  .frame{position:absolute;inset:34px;border:1px solid rgba(184,131,90,0.30);border-radius:4px}
  .art{position:absolute;inset:0;display:grid;place-items:center}
  .art svg{width:62%;height:auto}
  .tag{position:absolute;left:60px;bottom:54px;font-family:'Inter',sans-serif;font-weight:500;
    font-size:22px;letter-spacing:0.3em;text-transform:uppercase;color:#6B5C45}
  .brand{position:absolute;right:60px;bottom:54px;font-family:'Inter',sans-serif;font-weight:500;
    font-size:18px;letter-spacing:0.3em;text-transform:uppercase;color:#B8835A}
  .grain{position:absolute;inset:0;opacity:0.05;mix-blend-mode:multiply;pointer-events:none}
</style></head>
<body>
  <div class="frame"></div>
  <div class="art"><svg viewBox="0 0 400 300">${icons[key]}</svg></div>
  <div class="tag">${labels[key]}</div>
  <div class="brand">WOTU</div>
  <svg class="grain"><filter id="n"><feTurbulence type="fractalNoise" baseFrequency="0.9" numOctaves="2"/></filter><rect width="100%" height="100%" filter="url(#n)"/></svg>
</body></html>`;
}

const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1200, height: 900 }, deviceScaleFactor: 1 });
for (const key of Object.keys(icons)) {
  await page.setContent(template(key), { waitUntil: 'networkidle' });
  await page.evaluate(() => document.fonts.ready);
  await page.waitForTimeout(120);
  await page.screenshot({ path: resolve(outDir, `cat-${key}.png`), clip: { x: 0, y: 0, width: 1200, height: 900 } });
  console.log('✓ cat-' + key);
}
await browser.close();
console.log('Done →', outDir);
