/**
 * visual.spec.ts
 * Screenshot smoke tests cho WOTU website.
 *
 * Sau tái cấu trúc:
 *  - Studio homepage đã move sang /studio/ (không còn ở /)
 *  - Shop homepage mới ở /
 *
 * Tests:
 *  1. home-parity: chụp shop homepage mới tại / (desktop + mobile)
 *  2. studio-parity: chụp studio homepage tại /studio/ (desktop + mobile)
 *  3. routes smoke: check text trên key routes
 */
import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const screenshotsDir = path.join(__dirname, '__screenshots__');

async function settleAndShoot(page: import('@playwright/test').Page, file: string) {
  // Bypass reveal animations để screenshot deterministic.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('domcontentloaded');
  // Force-load lazy images bằng cách scroll full page rồi về top.
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  // Đợi images load xong (tối đa 8s).
  await page.evaluate(
    () =>
      new Promise<void>((res) => {
        const imgs = Array.from(document.querySelectorAll('img'));
        let pending = imgs.filter((img) => !img.complete).length;
        if (pending === 0) return res();
        const done = () => {
          pending -= 1;
          if (pending <= 0) res();
        };
        imgs.forEach((img) => {
          if (!img.complete) {
            img.addEventListener('load', done, { once: true });
            img.addEventListener('error', done, { once: true });
          }
        });
        setTimeout(res, 8000);
      })
  );
  await page.evaluate(() => new Promise((r) => setTimeout(r, 400)));
  await page.screenshot({ path: file, fullPage: true });
}

// ---------------------------------------------------------------------------
// SHOP HOMEPAGE (/) — new home after restructure
// ---------------------------------------------------------------------------
test.describe('shop homepage screenshot', () => {
  test('shop home (Astro site /)', async ({ page }, info) => {
    await page.goto('/');
    await settleAndShoot(
      page,
      path.join(screenshotsDir, `shop-home-${info.project.name}-new.png`)
    );
  });
});

// ---------------------------------------------------------------------------
// STUDIO HOMEPAGE (/studio/) — old home, now at subpath
// ---------------------------------------------------------------------------
test.describe('studio homepage screenshot', () => {
  test('studio home (Astro site /studio/)', async ({ page }, info) => {
    await page.goto('/studio/');
    await settleAndShoot(
      page,
      path.join(screenshotsDir, `studio-home-${info.project.name}-new.png`)
    );
  });
});

// ---------------------------------------------------------------------------
// ROUTES SMOKE — text checks key pages
// ---------------------------------------------------------------------------
test.describe('routes smoke', () => {
  test('shop homepage h1 chứa "Trọn bộ"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Trọn bộ');
  });

  test('/san-pham/ h1 chứa "sản phẩm"', async ({ page }) => {
    await page.goto('/san-pham/');
    await expect(page.locator('h1').first()).toContainText('sản phẩm');
  });

  test('/studio/ loads — #services section exists', async ({ page }) => {
    await page.goto('/studio/');
    await expect(page.locator('#services')).toBeAttached();
  });

  test('/studio/projects/ h1 chứa "chốn"', async ({ page }) => {
    await page.goto('/studio/projects/');
    await expect(page.locator('h1').first()).toContainText('chốn');
  });

  test('/studio/blog/ h1 chứa "không vội"', async ({ page }) => {
    await page.goto('/studio/blog/');
    await expect(page.locator('h1').first()).toContainText('không vội');
  });

  test('/combo/to-am/ h1 chứa "Tổ Ấm"', async ({ page }) => {
    await page.goto('/combo/to-am/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tổ Ấm');
  });

  test('/yeu-thich/ h1 chứa "Yêu thích"', async ({ page }) => {
    await page.goto('/yeu-thich/');
    await expect(page.locator('h1').first()).toContainText('Yêu thích');
  });
});
