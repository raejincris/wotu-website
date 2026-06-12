/**
 * a11y.spec.ts — quét accessibility tự động bằng axe-core trên các route chính.
 *
 * Mục tiêu: bắt vi phạm WCAG 2.0/2.1 A & AA cụ thể (label, ARIA, landmark…).
 * Fail khi có vi phạm `serious`/`critical` — KỂ CẢ `color-contrast` (bật chặn 12/06
 * sau khi user chốt hướng accent-deep: accent sáng chỉ cho heading lớn ≥3:1,
 * accent-deep #94543D cho text chức năng ≥4.5:1, sage 2-deep #4E6F5D cho badge/CTA).
 *
 * Chạy: npx playwright test a11y
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/san-pham/', '/phong-mau/', '/phong-mau/to-am/', '/studio/'];
const BLOCKING = new Set(['serious', 'critical']);
const MONITOR_ONLY = new Set<string>(); // rỗng — color-contrast đã bật chặn (12/06)

for (const route of ROUTES) {
  test(`a11y · ${route} không có vi phạm serious/critical`, async ({ page }) => {
    // Reduce motion để reveal hiện tức thì — axe quét GIỮA transition opacity sẽ
    // blend màu chữ với nền → contrast fail chập chờn (node khác nhau mỗi lần).
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto(route, { waitUntil: 'networkidle' });

    const results = await new AxeBuilder({ page })
      .withTags(['wcag2a', 'wcag2aa', 'wcag21a', 'wcag21aa'])
      .analyze();

    const blocking = results.violations.filter(
      (v) => BLOCKING.has(v.impact ?? '') && !MONITOR_ONLY.has(v.id),
    );
    const minor = results.violations.filter(
      (v) => !BLOCKING.has(v.impact ?? '') || MONITOR_ONLY.has(v.id),
    );

    if (results.violations.length) {
      const fmt = (v: (typeof results.violations)[number]) =>
        `  [${v.impact}] ${v.id}: ${v.help} (${v.nodes.length} node) → ${v.nodes[0]?.target?.join(' ')}`;
      console.log(
        `\n── a11y ${route} ──` +
          (blocking.length ? `\nCHẶN:\n${blocking.map(fmt).join('\n')}` : '') +
          (minor.length ? `\nTheo dõi:\n${minor.map(fmt).join('\n')}` : ''),
      );
    }

    expect(blocking, `Vi phạm a11y serious/critical trên ${route}`).toEqual([]);
  });
}
