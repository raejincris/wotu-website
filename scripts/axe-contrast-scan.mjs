// Script tạm — dump toàn bộ node color-contrast trên các route chính (xoá sau khi dùng).
import { chromium } from 'playwright';
import { AxeBuilder } from '@axe-core/playwright';

const ROUTES = ['/', '/san-pham/', '/san-pham/sofa-may/', '/san-pham/ghe-tua/', '/combo/', '/combo/to-am/', '/phong-mau/', '/phong-mau/to-am/', '/yeu-thich/', '/studio/', '/studio/blog/', '/studio/dich-vu/', '/404'];
const browser = await chromium.launch();
const ctx = await browser.newContext({ viewport: { width: 1440, height: 900 }, reducedMotion: 'reduce' });

for (const route of ROUTES) {
  const page = await ctx.newPage();
  try {
    await page.goto('http://localhost:4321' + route, { waitUntil: 'networkidle' });
    const results = await new AxeBuilder({ page }).withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa']).analyze();
    const cc = results.violations.find((v) => v.id === 'color-contrast');
    console.log(`\n===== ${route} — ${cc ? cc.nodes.length : 0} node =====`);
    if (cc) for (const n of cc.nodes) {
      const summary = (n.any[0]?.message || '').replace(/Element has insufficient color contrast of /, '');
      console.log(`  ${n.target.join(' ')}\n    ${summary}`);
    }
  } catch (e) {
    console.log(`\n===== ${route} — LỖI: ${e.message.split('\n')[0]}`);
  }
  await page.close();
}
await browser.close();
