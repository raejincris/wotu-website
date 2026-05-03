import { test, expect } from '@playwright/test';
import path from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __dirname = path.dirname(fileURLToPath(import.meta.url));

// Reference prototype lives one folder up from `site/`.
const BASELINE_URL = pathToFileURL(
  path.resolve(__dirname, '..', '..', 'homepage-a.html')
).href;

const screenshotsDir = path.join(__dirname, '__screenshots__');

async function settleAndShoot(page: import('@playwright/test').Page, file: string) {
  // Bypass reveal animations so screenshots are deterministic.
  await page.emulateMedia({ reducedMotion: 'reduce' });
  await page.waitForLoadState('domcontentloaded');
  // Force-load lazy images by scrolling the full page first, then back to top.
  await page.evaluate(async () => {
    const total = document.documentElement.scrollHeight;
    for (let y = 0; y < total; y += 600) {
      window.scrollTo(0, y);
      await new Promise((r) => setTimeout(r, 80));
    }
    window.scrollTo(0, 0);
  });
  // Give the now-eager-fetching images up to 8s to finish.
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

test.describe('home parity', () => {
  test('baseline (homepage-a.html)', async ({ page }, info) => {
    await page.goto(BASELINE_URL);
    await settleAndShoot(
      page,
      path.join(screenshotsDir, `home-${info.project.name}-baseline.png`)
    );
  });

  test('new (Astro site)', async ({ page }, info) => {
    await page.goto('/');
    await settleAndShoot(
      page,
      path.join(screenshotsDir, `home-${info.project.name}-new.png`)
    );
  });
});

test.describe('routes smoke', () => {
  test('projects listing renders', async ({ page }) => {
    await page.goto('/projects');
    // Scope to the article body — dev server injects extra <h1> via Astro DevToolbar.
    await expect(page.locator('main, body > header').first().locator('h1').first()).toContainText('chốn');
  });

  test('blog listing renders', async ({ page }) => {
    await page.goto('/blog');
    await expect(page.locator('main, body > header').first().locator('h1').first()).toContainText('không vội');
  });
});
