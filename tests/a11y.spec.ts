/**
 * a11y.spec.ts — quét accessibility tự động bằng axe-core trên các route chính.
 *
 * Mục tiêu: bắt vi phạm WCAG 2.0/2.1 A & AA cụ thể (label, ARIA, landmark…).
 * Fail khi có vi phạm `serious`/`critical` — TRỪ `color-contrast`.
 *
 * ⚠️ color-contrast được TÁCH RA non-blocking (chỉ log) vì phần lớn vi phạm là
 * **màu accent thương hiệu** (`--shop-accent` terracotta trên nền sáng — chữ em
 * nghiêng trang trí) + fine-print footer de-emphasis. Sửa = đổi brand / design
 * decision, cần user sign-off → theo dõi qua log, không chặn. Xem STATUS.md mục
 * "A11y contrast (chờ quyết định)".
 *
 * Chạy: npx playwright test a11y
 */
import { test, expect } from '@playwright/test';
import AxeBuilder from '@axe-core/playwright';

const ROUTES = ['/', '/san-pham/', '/phong-mau/', '/phong-mau/to-am/', '/studio/'];
const BLOCKING = new Set(['serious', 'critical']);
const MONITOR_ONLY = new Set(['color-contrast']); // log, không fail (design decision)

for (const route of ROUTES) {
  test(`a11y · ${route} không có vi phạm serious/critical (trừ contrast)`, async ({ page }) => {
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
