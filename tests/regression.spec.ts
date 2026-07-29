/**
 * regression.spec.ts
 * QA tests cho WOTU website — sau tái cấu trúc shop homepage + studio subpath.
 * Run against local preview server (http://localhost:4321).
 * Uses `npm run preview` via playwright.config.ts webServer config.
 *
 * Routing mới:
 *   /              → Shop homepage (mới)
 *   /san-pham/     → Catalog sản phẩm
 *   /san-pham/sofa-may/ → Chi tiết sản phẩm
 *   /combo/to-am/  → Chi tiết combo
 *   /yeu-thich/    → Wishlist
 *   /studio/       → Studio homepage (cũ, đã move)
 *   /studio/projects/ + /studio/projects/[slug]
 *   /studio/blog/  + /studio/blog/[slug]
 *   /bao-mat       → Chính sách bảo mật
 */
import { test, expect } from '@playwright/test';

// ---------------------------------------------------------------------------
// HELPER — clear localStorage trước mỗi test liên quan cart/favorites
// ---------------------------------------------------------------------------
async function clearStorage(page: import('@playwright/test').Page): Promise<void> {
  await page.evaluate(() => {
    localStorage.removeItem('wotu-shop-cart-v1');
    localStorage.removeItem('wotu-shop-fav-v1');
  });
}

// ---------------------------------------------------------------------------
// 1. ROUTING — tất cả routes phải trả về 200
// ---------------------------------------------------------------------------
test.describe('1 · Routing — all routes return 200', () => {
  const routes = [
    '/',
    '/san-pham/',
    '/san-pham/sofa-may/',
    '/combo/',
    '/combo/to-am/',
    '/yeu-thich/',
    '/studio/',
    '/studio/projects/',
    '/studio/projects/can-ho-flc-quy-nhon',
    '/studio/projects/can-ho-studio-tms-quy-nhon',
    '/studio/projects/cafe-bach-tra',
    '/studio/projects/nha-anh-phuc-phu-tai',
    '/studio/blog/',
    '/studio/blog/vat-lieu-gia-dep-theo-thoi-gian',
    '/studio/blog/anh-sang-truoc-do-noi-that',
    '/tuyen-dung/',
    '/bao-mat',
  ];

  for (const route of routes) {
    test(`GET ${route} returns 200`, async ({ page }) => {
      const response = await page.goto(route);
      expect(response?.status()).toBe(200);
    });
  }
});

// ---------------------------------------------------------------------------
// 2. SHOP HOMEPAGE (/) — smoke tests
// ---------------------------------------------------------------------------
test.describe('2 · Shop homepage — smoke', () => {
  test('hero h1 chứa "Trọn bộ"', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('h1').first()).toContainText('Trọn bộ');
  });

  // Nav desktop: link chính top-level, link phụ gom vào dropdown "Thêm" (15/07 —
  // 9 link phẳng từng làm label bẻ 2 dòng đè logo).
  const NAV_TOP = ['/combo/', '/san-pham/', '/phong-mau/', '/studio/', '/#contact'];
  const NAV_MORE = ['/#inspo', '/#why', '/bao-gia/', '/noi-that-quy-nhon/'];

  test('Nav: link chính visible; link phụ trong dropdown "Thêm" (desktop) / attached (mobile)', async ({ page }, testInfo) => {
    await page.goto('/');
    // Scope to the nav-links div to avoid matching the CTA "Đặt tư vấn" button.
    const navLinks = page.locator('.shop-nav-links');
    if (testInfo.project.name === 'desktop') {
      for (const href of NAV_TOP) {
        await expect(navLinks.locator(`a[href="${href}"]`)).toBeVisible();
      }
      // Link trong dropdown: attached khi đóng → visible sau khi mở.
      for (const href of NAV_MORE) {
        await expect(navLinks.locator(`.shop-nav-more a[href="${href}"]`)).toBeAttached();
      }
      await navLinks.locator('.shop-nav-more summary').click();
      for (const href of NAV_MORE) {
        await expect(navLinks.locator(`.shop-nav-more a[href="${href}"]`)).toBeVisible();
      }
    } else {
      // Mobile: .shop-nav-links CSS-hidden — chỉ cần attached.
      for (const href of [...NAV_TOP, ...NAV_MORE]) {
        await expect(navLinks.locator(`a[href="${href}"]`)).toBeAttached();
      }
    }
  });

  test('Nav dropdown "Thêm": Esc đóng + trả focus; click ngoài đóng (desktop)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'dropdown chỉ hiện trên desktop');
    await page.goto('/');
    const more = page.locator('.shop-nav-more');
    const summary = more.locator('summary');
    await summary.click();
    await expect(more).toHaveAttribute('open', '');
    await page.keyboard.press('Escape');
    await expect(more).not.toHaveAttribute('open', '');
    await expect(summary).toBeFocused();
    // Mở lại → click ra ngoài (giữa trang) → đóng.
    await summary.click();
    await expect(more).toHaveAttribute('open', '');
    await page.mouse.click(10, 300); // mép trái trang — chắc chắn không trúng link
    await expect(more).not.toHaveAttribute('open', '');
  });

  test('Nav drawer mobile: hamburger mở/đóng, đủ 9 link, aria-expanded + focus', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'hamburger chỉ hiện ≤1100px');
    await page.goto('/');
    const toggle = page.locator('.shop-nav-toggle');
    const drawer = page.locator('#wotu-shop-drawer');
    await expect(toggle).toBeVisible();
    await expect(drawer).toBeHidden();
    await toggle.click();
    await expect(drawer).toBeVisible();
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
    await expect(drawer.locator('.shop-drawer-nav a')).toHaveCount(9);
    for (const href of [...NAV_TOP, ...NAV_MORE]) {
      await expect(drawer.locator(`a[href="${href}"]`)).toBeVisible();
    }
    await drawer.locator('.shop-drawer-close').click();
    await expect(drawer).toBeHidden();
    await expect(toggle).toHaveAttribute('aria-expanded', 'false');
    await expect(toggle).toBeFocused();
  });

  test('Nav mobile: không tràn ngang (scrollWidth ≤ clientWidth)', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name === 'desktop', 'guard cho viewport hẹp');
    await page.goto('/');
    const overflow = await page.evaluate(
      () => document.documentElement.scrollWidth - document.documentElement.clientWidth,
    );
    expect(overflow).toBeLessThanOrEqual(1);
  });

  test('Nav search inline: mở thanh → gõ "sofa" → ra kết quả Pagefind; Esc đóng', async ({ page }) => {
    await page.goto('/');
    const wrap = page.locator('[data-shop-search]');
    const input = wrap.locator('.shop-search-input');
    const panel = wrap.locator('.shop-search-panel');
    // Mở: click nút search → KHÔNG điều hướng sang /tim-kiem/, thanh input hiện.
    await wrap.locator('.shop-search-toggle').click();
    await expect(page).toHaveURL(/\/$/); // vẫn ở trang chủ
    await expect(wrap).toHaveClass(/open/);
    await expect(input).toBeVisible();
    // Gõ query → panel kết quả có link tới sản phẩm (Pagefind chạy ở bản build).
    await input.fill('sofa');
    await expect(panel).toBeVisible({ timeout: 6000 });
    await expect(panel.locator('a.shop-search-result').first()).toBeVisible({ timeout: 6000 });
    // Esc → đóng.
    await input.press('Escape');
    await expect(wrap).not.toHaveClass(/open/);
    await expect(panel).toBeHidden();
  });

  test('combo grid hiển thị đủ 6 cards', async ({ page }) => {
    await page.goto('/');
    // combo-card count in the combo-grid
    const cards = page.locator('#combo-grid .combo-card');
    await expect(cards).toHaveCount(6);
  });

  test('bestseller grid hiển thị 4 product-card', async ({ page }) => {
    await page.goto('/');
    const cards = page.locator('#shop .products-grid .product-card');
    await expect(cards).toHaveCount(4);
  });

  test('section layout: các section bọc data-cms-section trong .cms-sections + có order', async ({ page }) => {
    await page.goto('/');
    const wrap = page.locator('.cms-sections');
    await expect(wrap).toBeAttached();
    for (const id of ['combos', 'bestsellers', 'inspo', 'whyUs', 'reviews', 'cta', 'newsletter']) {
      await expect(page.locator(`.cms-sections [data-cms-section="${id}"]`)).toHaveCount(1);
    }
    // combos là section đầu tiên (order 0 theo layout mặc định)
    const order = await page.locator('[data-cms-section="combos"]').evaluate((el) => getComputedStyle(el).order);
    expect(order).toBe('0');
  });

  test('cms-preview: ?cms=1 patch text + toggle + reorder section', async ({ page }) => {
    await page.goto('/?cms=1');
    await expect(page.locator('html')).toHaveAttribute('data-cms-preview', '1');

    // patch nội dung hero
    await page.evaluate(() =>
      window.postMessage({ type: 'patch', key: 'hero.title', value: 'WOTU TEST PATCH' }, location.origin));
    await expect(page.locator('[data-cms="hero.title"]')).toContainText('WOTU TEST PATCH');

    // patch tiêu đề section (combos)
    await page.evaluate(() =>
      window.postMessage({ type: 'patch', key: 'sections.combos.heading', value: 'TIÊU ĐỀ COMBO TEST' }, location.origin));
    await expect(page.locator('[data-cms="sections.combos.heading"]')).toContainText('TIÊU ĐỀ COMBO TEST');

    // tắt section combos → ẩn
    await page.evaluate(() =>
      window.postMessage({ type: 'section', id: 'combos', on: false }, location.origin));
    await expect(page.locator('[data-cms-section="combos"]')).toBeHidden();

    // sắp xếp lại: newsletter lên đầu (order 0)
    await page.evaluate(() =>
      window.postMessage({ type: 'reorder', order: ['newsletter', 'combos'] }, location.origin));
    await expect(page.locator('[data-cms-section="newsletter"]')).toHaveCSS('order', '0');

    // đổi ảnh hero (data URL 1px)
    const px = 'data:image/gif;base64,R0lGODlhAQABAAAAACH5BAEKAAEALAAAAAABAAEAAAICTAEAOw==';
    await page.evaluate((src) =>
      window.postMessage({ type: 'img', key: 'hero.photo', src }, location.origin), px);
    await expect(page.locator('[data-cms-img="hero.photo"]')).toHaveAttribute('src', px);

    // patch theo hàng (combo đầu tiên — giá khuyến mãi)
    await page.evaluate(() =>
      window.postMessage({ type: 'patch', key: 'combos.0.priceNew', value: '9.999.999đ' }, location.origin));
    await expect(page.locator('[data-cms="combos.0.priceNew"]')).toContainText('9.999.999đ');
  });

  test('hero CTA "Xem combo nổi bật" tồn tại và dẫn đến #combos', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a[href="#combos"]').first();
    await expect(cta).toBeVisible();
  });

  test('#combos section tồn tại trong DOM', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#combos')).toBeAttached();
  });

  test('#inspo section và #why section tồn tại', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#inspo')).toBeAttached();
    await expect(page.locator('#why')).toBeAttached();
  });

  test('#contact section tồn tại và có form', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('#contact')).toBeAttached();
    await expect(page.locator('form[data-shop-contact]')).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 3. CATALOG SẢN PHẨM (/san-pham/) — smoke tests
// ---------------------------------------------------------------------------
test.describe('3 · /san-pham/ — catalog smoke', () => {
  test('h1 chứa "sản phẩm"', async ({ page }) => {
    await page.goto('/san-pham/');
    await expect(page.locator('h1').first()).toContainText('sản phẩm');
  });

  test('cat tiles hiển thị đủ 9 tiles', async ({ page }) => {
    await page.goto('/san-pham/');
    const tiles = page.locator('.cat-tile');
    await expect(tiles).toHaveCount(9);
  });

  test('filter sidebar có 5 nhóm filter (details.fgrp)', async ({ page }) => {
    await page.goto('/san-pham/');
    const groups = page.locator('.filters .fgrp');
    const count = await groups.count();
    // 5 nhóm: Theo phòng / Khoảng giá / Chất liệu / Màu sắc / Trạng thái.
    // ("Danh mục" sidebar bị bỏ — duplicate với cat tiles ở top.)
    expect(count).toBeGreaterThanOrEqual(5);
  });

  test('product grid có ít nhất 7 product-card-item', async ({ page }) => {
    await page.goto('/san-pham/');
    const cards = page.locator('.card.product-card-item');
    const count = await cards.count();
    expect(count).toBeGreaterThanOrEqual(7);
  });

  test('sort dropdown tồn tại với đúng options', async ({ page }) => {
    await page.goto('/san-pham/');
    const select = page.locator('select[aria-label="Sắp xếp"]');
    await expect(select).toBeVisible();
    const options = await select.locator('option').allInnerTexts();
    expect(options).toContain('Bán chạy nhất');
    expect(options).toContain('Giá thấp → cao');
  });

  test('cat tile "Sofa" tồn tại với data-cat="sofa"', async ({ page }) => {
    await page.goto('/san-pham/');
    const sofaTile = page.locator('.cat-tile[data-cat="sofa"]');
    await expect(sofaTile).toBeAttached();
  });

  test('filter sidebar có input data-filter-room cho phong-ngu', async ({ page }) => {
    await page.goto('/san-pham/');
    const roomFilter = page.locator('input[data-filter-room="phong-ngu"]');
    await expect(roomFilter).toBeAttached();
  });

  test('feature combo card dẫn đến /combo/to-am/', async ({ page }) => {
    await page.goto('/san-pham/');
    const featureCard = page.locator('.card.feature[href="/combo/to-am/"]');
    await expect(featureCard).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 4. TRANG CHI TIẾT SẢN PHẨM (/san-pham/sofa-may/)
// ---------------------------------------------------------------------------
test.describe('4 · /san-pham/sofa-may/ — product detail', () => {
  test('h1 chứa tên sản phẩm "Mây"', async ({ page }) => {
    await page.goto('/san-pham/sofa-may/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Mây');
  });

  test('"Thêm vào giỏ" button tồn tại', async ({ page }) => {
    await page.goto('/san-pham/sofa-may/');
    const addBtn = page.locator('#addCart');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toContainText('Thêm vào giỏ');
  });

  test('gallery thumbnail buttons có ít nhất 3 swatches vải', async ({ page }) => {
    await page.goto('/san-pham/sofa-may/');
    // fabric swatches
    const swatches = page.locator('.swatches .swatch');
    const count = await swatches.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('thông số kỹ thuật (specs) hiển thị với kích thước', async ({ page }) => {
    await page.goto('/san-pham/sofa-may/');
    const body = await page.content();
    expect(body).toContain('Kích thước');
  });
});

// ---------------------------------------------------------------------------
// 5. TRANG CHI TIẾT COMBO (/combo/to-am/)
// ---------------------------------------------------------------------------
test.describe('5 · /combo/to-am/ — combo detail', () => {
  test('h1 chứa "Tổ Ấm"', async ({ page }) => {
    await page.goto('/combo/to-am/');
    await expect(page.getByRole('heading', { level: 1 })).toContainText('Tổ Ấm');
  });

  test('reading nav tồn tại với links (items, desc, faq)', async ({ page }) => {
    await page.goto('/combo/to-am/');
    const readNav = page.locator('nav.read-nav');
    await expect(readNav).toBeVisible();
    await expect(readNav.locator('a[href="#items"]')).toBeVisible();
    await expect(readNav.locator('a[href="#faq"]')).toBeVisible();
  });

  test('#items section tồn tại và có các sản phẩm trong combo', async ({ page }) => {
    await page.goto('/combo/to-am/');
    await expect(page.locator('#items')).toBeAttached();
    const items = page.locator('.item-card');
    const count = await items.count();
    expect(count).toBeGreaterThanOrEqual(3);
  });

  test('#faq section tồn tại với ít nhất 4 details accordion', async ({ page }) => {
    await page.goto('/combo/to-am/');
    const faqSection = page.locator('#faq');
    await expect(faqSection).toBeAttached();
    const accordions = faqSection.locator('details');
    const count = await accordions.count();
    expect(count).toBeGreaterThanOrEqual(4);
  });

  test('"Thêm vào giỏ" button tồn tại', async ({ page }) => {
    await page.goto('/combo/to-am/');
    const addBtn = page.locator('#pdAdd');
    await expect(addBtn).toBeVisible();
    await expect(addBtn).toContainText('Thêm combo vào giỏ');
  });

  test('breadcrumb hiển thị đường dẫn đúng', async ({ page }) => {
    await page.goto('/combo/to-am/');
    const crumb = page.locator('.crumb');
    await expect(crumb).toBeVisible();
    await expect(crumb.locator('a[href="/"]')).toBeVisible();
  });

  test('combo động /combo/an-cu/ có bảng giá đồ rời + tổng', async ({ page }) => {
    await page.goto('/combo/an-cu/');
    const quote = page.locator('.pd-quote');
    await expect(quote).toBeVisible();
    await expect(quote.getByRole('heading', { level: 2 })).toContainText('Bảng giá đồ rời');
    await expect(quote.locator('.pq-total')).toContainText('Tổng giá trị đồ rời');
  });

  test('combo động chưa có items thì KHÔNG hiện bảng giá', async ({ page }) => {
    await page.goto('/combo/an-yen/');
    await expect(page.locator('.pd-quote')).toHaveCount(0);
  });
});

// ---------------------------------------------------------------------------
// 6. WISHLIST (/yeu-thich/) — empty state
// ---------------------------------------------------------------------------
test.describe('6 · /yeu-thich/ — wishlist', () => {
  test('empty state hiển thị khi localStorage trống', async ({ page }) => {
    // Goto trước để page load, rồi clear storage và reload
    await page.goto('/yeu-thich/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    // wait for client-side JS to run
    await page.evaluate(() => new Promise((r) => setTimeout(r, 300)));
    const emptyEl = page.locator('#wl-empty');
    await expect(emptyEl).not.toHaveAttribute('hidden');
  });

  test('h1 chứa "Yêu thích"', async ({ page }) => {
    await page.goto('/yeu-thich/');
    await expect(page.locator('h1').first()).toContainText('Yêu thích');
  });
});

// ---------------------------------------------------------------------------
// 7. 404 PAGE
// ---------------------------------------------------------------------------
test.describe('7 · /404 — custom not found page', () => {
  test('truy cập URL không tồn tại trả về 404 content', async ({ page }) => {
    // Astro static build trả về 404.html cho path không tồn tại
    await page.goto('/trang-khong-ton-tai-xyz/');
    const body = await page.content();
    // Trang 404 custom có "404" text và link về trang chủ
    expect(body).toContain('404');
  });

  test('trang 404 có "khoảng trống" trong h1', async ({ page }) => {
    await page.goto('/trang-nay-khong-ton-tai/');
    // Kiểm tra nội dung trang 404 custom
    const body = await page.content();
    expect(body).toContain('khoảng trống');
  });

  test('trang 404 có link về trang chủ shop', async ({ page }) => {
    await page.goto('/mot-trang-khong-co-that/');
    const homeLink = page.locator('a[href="/"]').first();
    await expect(homeLink).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 8. STUDIO HOMEPAGE (/studio/) — đã move từ /
// ---------------------------------------------------------------------------
test.describe('8 · /studio/ — studio homepage', () => {
  test('page load thành công và có sections cốt lõi', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    // Studio page dùng BaseLayout với sections từ Hero, Services, etc.
    await expect(page.locator('#services')).toBeAttached();
    await expect(page.locator('#about')).toBeAttached();
    await expect(page.locator('#contact')).toBeAttached();
    await expect(page.locator('#process')).toBeAttached();
  });

  test('TweaksPanel tồn tại ở /studio/ (không có ở shop)', async ({ page }) => {
    await page.goto('/studio/');
    // TweaksPanel renders #wotu-tweaks panel
    const tweaks = page.locator('#wotu-tweaks');
    await expect(tweaks).toBeAttached();
  });

  test('section layout: sections bọc data-cms-section trong .cms-sections', async ({ page }) => {
    await page.goto('/studio/');
    await expect(page.locator('.cms-sections')).toBeAttached();
    for (const id of ['philosophy', 'services', 'projects', 'process', 'about', 'quote', 'contact']) {
      await expect(page.locator(`.cms-sections [data-cms-section="${id}"]`)).toHaveCount(1);
    }
  });

  test('anchor nav desktop: #services, #about, #contact tồn tại', async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  });
});

// ---------------------------------------------------------------------------
// 9. STUDIO CONTENT COLLECTIONS (/studio/projects/, /studio/blog/)
// ---------------------------------------------------------------------------
test.describe('9 · Studio content collections', () => {
  test('/studio/projects/ hiển thị h1 chứa "chốn"', async ({ page }) => {
    await page.goto('/studio/projects/');
    await expect(page.locator('h1').first()).toContainText('chốn');
  });

  test('/studio/projects/ có link đến 4 dự án', async ({ page }) => {
    await page.goto('/studio/projects/');
    await expect(page.locator('a[href="/studio/projects/can-ho-flc-quy-nhon"]')).toBeAttached();
    await expect(page.locator('a[href="/studio/projects/can-ho-studio-tms-quy-nhon"]')).toBeAttached();
    await expect(page.locator('a[href="/studio/projects/cafe-bach-tra"]')).toBeAttached();
    await expect(page.locator('a[href="/studio/projects/nha-anh-phuc-phu-tai"]')).toBeAttached();
  });

  test('/studio/projects/can-ho-flc-quy-nhon — frontmatter render đúng', async ({ page }) => {
    await page.goto('/studio/projects/can-ho-flc-quy-nhon');
    await expect(page.getByRole('heading', { name: 'Căn hộ FLC Sea Tower' })).toBeVisible();
    const body = await page.content();
    expect(body).toContain('Quy Nhơn');
    expect(body).toContain('2024');
  });

  test('/studio/projects/cafe-bach-tra — back link về /studio/projects/', async ({ page }) => {
    await page.goto('/studio/projects/cafe-bach-tra');
    const backLink = page.getByRole('link', { name: '← Tất cả dự án' });
    await expect(backLink).toBeVisible();
  });

  test('/studio/blog/ hiển thị h1 chứa "không vội"', async ({ page }) => {
    await page.goto('/studio/blog/');
    await expect(page.locator('h1').first()).toContainText('không vội');
  });

  test('/studio/blog/ hiển thị 2 blog titles', async ({ page }) => {
    await page.goto('/studio/blog/');
    await expect(page.locator('h2').filter({ hasText: 'Vật liệu' })).toBeVisible();
    await expect(page.locator('h2').filter({ hasText: 'Ánh sáng' })).toBeVisible();
  });

  test('/studio/blog/vat-lieu-gia-dep-theo-thoi-gian — title render', async ({ page }) => {
    await page.goto('/studio/blog/vat-lieu-gia-dep-theo-thoi-gian');
    await expect(page.getByRole('heading', { name: 'Vật liệu già đẹp theo thời gian' })).toBeVisible();
  });

  test('click project card navigates to detail page', async ({ page }) => {
    await page.goto('/studio/projects/');
    await page.waitForLoadState('networkidle');
    const projectLink = page.locator('a[href="/studio/projects/can-ho-flc-quy-nhon"]').first();
    await projectLink.scrollIntoViewIfNeeded();
    await projectLink.click({ force: true });
    await expect(page).toHaveURL(/\/studio\/projects\/can-ho-flc-quy-nhon/);
    await expect(page.getByRole('heading', { name: 'Căn hộ FLC Sea Tower' })).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 10. STUDIO — ANCHOR NAVIGATION (desktop only, /studio/)
// ---------------------------------------------------------------------------
test.describe('10 · Studio anchor navigation', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only');
  });

  const anchors = [
    { href: '#services', id: 'services' },
    { href: '#about', id: 'about' },
    { href: '#contact', id: 'contact' },
  ];

  for (const { href, id } of anchors) {
    test(`section #${id} tồn tại trong /studio/`, async ({ page }) => {
      await page.goto('/studio/');
      await page.waitForLoadState('domcontentloaded');
      const section = page.locator(`#${id}`);
      await expect(section).toBeAttached();
      await page.evaluate((h) => {
        const link = document.querySelector<HTMLAnchorElement>(`.wotu-nav-links a[href="${h}"]`);
        link?.click();
      }, href);
      await expect(section).toBeAttached();
    });
  }
});

// ---------------------------------------------------------------------------
// 11. STUDIO — MOBILE HAMBURGER MENU (mobile only, /studio/)
// ---------------------------------------------------------------------------
test.describe('11 · Studio mobile hamburger menu', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'mobile', 'mobile only');
  });

  test('hamburger visible, desktop nav hidden trên /studio/', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.wotu-nav-toggle')).toBeVisible();
    await expect(page.locator('.wotu-nav-links')).toBeHidden();
  });

  test('click hamburger → drawer mở', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    const toggle = page.locator('.wotu-nav-toggle');
    const drawer = page.locator('#wotu-mobile-drawer');
    await expect(drawer).toHaveAttribute('hidden', '');
    await toggle.click();
    await expect(drawer).not.toHaveAttribute('hidden');
    await expect(toggle).toHaveAttribute('aria-expanded', 'true');
  });

  test('nút đóng drawer hoạt động', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.wotu-nav-toggle').click();
    await expect(page.locator('#wotu-mobile-drawer')).not.toHaveAttribute('hidden');
    await page.locator('.wotu-mobile-drawer__close').click();
    await expect(page.locator('#wotu-mobile-drawer')).toHaveAttribute('hidden', '');
  });

  test('Escape key đóng drawer', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.wotu-nav-toggle').click();
    const drawer = page.locator('#wotu-mobile-drawer');
    await expect(drawer).not.toHaveAttribute('hidden');
    await page.keyboard.press('Escape');
    await expect(drawer).toHaveAttribute('hidden', '');
    await expect(page.locator('.wotu-nav-toggle')).toHaveAttribute('aria-expanded', 'false');
  });

  test('body scroll lock khi drawer mở (html.wotu-drawer-open)', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.wotu-nav-toggle').click();
    await expect(page.locator('html')).toHaveClass(/wotu-drawer-open/);
  });

  test('click drawer link → drawer đóng', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('.wotu-nav-toggle').click();
    const drawer = page.locator('#wotu-mobile-drawer');
    await expect(drawer).not.toHaveAttribute('hidden');
    await page.locator('.wotu-mobile-drawer__nav a').first().click();
    await expect(drawer).toHaveAttribute('hidden', '');
  });
});

// ---------------------------------------------------------------------------
// 12. STUDIO — CONTACT FORM (/studio/)
// ---------------------------------------------------------------------------
test.describe('12 · Studio contact form', () => {
  test('form có đủ 4 fields: name, email, phone, message', async ({ page }) => {
    await page.goto('/studio/');
    const form = page.locator('#wotu-contact-form');
    await expect(form).toBeVisible();
    await expect(form.locator('[name="name"]')).toBeAttached();
    await expect(form.locator('[name="email"]')).toBeAttached();
    await expect(form.locator('[name="phone"]')).toBeAttached();
    await expect(form.locator('[name="message"]')).toBeAttached();
  });

  test('honeypot botcheck tồn tại và có tabindex=-1', async ({ page }) => {
    await page.goto('/studio/');
    const honeypot = page.locator('[name="botcheck"]');
    await expect(honeypot).toBeAttached();
    await expect(honeypot).toHaveAttribute('tabindex', '-1');
  });

  test('hidden fields đúng: access_key, subject, from_name, redirect=false', async ({ page }) => {
    await page.goto('/studio/');
    const form = page.locator('#wotu-contact-form');
    await expect(form.locator('[name="access_key"]')).toHaveAttribute('type', 'hidden');
    await expect(form.locator('[name="subject"]')).toHaveAttribute('type', 'hidden');
    const redirect = form.locator('[name="redirect"]');
    await expect(redirect).toHaveAttribute('type', 'hidden');
    await expect(redirect).toHaveAttribute('value', 'false');
  });

  test('submit với mock fetch → success message "Cảm ơn"', async ({ page }) => {
    await page.route('https://api.web3forms.com/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK' }),
      });
    });
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#contact').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator('#wotu-contact-form [name="name"]').fill('Nguyễn Văn A');
    await page.locator('#wotu-contact-form [name="email"]').fill('test@example.com');
    await page.locator('#wotu-contact-form [name="message"]').fill('Muốn tư vấn nội thất.');
    const submitBtn = page.locator('#wotu-contact-submit');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    const feedback = page.locator('#wotu-contact-feedback');
    await expect(feedback).toContainText('Cảm ơn', { timeout: 5000 });
    await expect(submitBtn).toContainText('Đã gửi');
  });

  test('name và email có required; phone không có', async ({ page }) => {
    await page.goto('/studio/');
    await expect(page.locator('#wotu-contact-form [name="name"]')).toHaveAttribute('required', '');
    await expect(page.locator('#wotu-contact-form [name="email"]')).toHaveAttribute('required', '');
    const phoneRequired = await page.locator('#wotu-contact-form [name="phone"]').getAttribute('required');
    expect(phoneRequired).toBeNull();
  });
});

// ---------------------------------------------------------------------------
// 12b. TRANG TUYỂN DỤNG — form ứng tuyển
// ---------------------------------------------------------------------------
test.describe('12b · /tuyen-dung/ — form ứng tuyển', () => {
  test('hidden fields: subject = "[WOTU] Ứng tuyển", redirect=false', async ({ page }) => {
    await page.goto('/tuyen-dung/');
    const form = page.locator('#wotu-apply-form');
    const subject = form.locator('[name="subject"]');
    await expect(subject).toHaveAttribute('type', 'hidden');
    await expect(subject).toHaveAttribute('value', '[WOTU] Ứng tuyển');
    await expect(form.locator('[name="redirect"]')).toHaveAttribute('value', 'false');
  });

  test('có ô chọn vị trí + ô link CV', async ({ page }) => {
    await page.goto('/tuyen-dung/');
    await expect(page.locator('#wotu-apply-form select[name="position"]')).toBeVisible();
    await expect(page.locator('#wotu-apply-form [name="cv_link"]')).toBeAttached();
    // 4 vị trí + "Vị trí khác" + option placeholder disabled = 6 option
    const opts = page.locator('#wotu-apply-form select[name="position"] option');
    expect(await opts.count()).toBeGreaterThanOrEqual(5);
  });

  test('submit với mock fetch → success message', async ({ page }) => {
    await page.route('https://api.web3forms.com/submit', async (route) => {
      await route.fulfill({
        status: 200,
        contentType: 'application/json',
        body: JSON.stringify({ success: true, message: 'OK' }),
      });
    });
    await page.goto('/tuyen-dung/');
    await page.waitForLoadState('domcontentloaded');
    await page.locator('#ung-tuyen').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);
    await page.locator('#wotu-apply-form [name="name"]').fill('Trần Thị B');
    await page.locator('#wotu-apply-form [name="phone"]').fill('0933774708');
    await page.locator('#wotu-apply-form select[name="position"]').selectOption({ index: 1 });
    const submitBtn = page.locator('#wotu-apply-submit');
    await submitBtn.scrollIntoViewIfNeeded();
    await submitBtn.click({ force: true });
    await expect(page.locator('#wotu-apply-feedback')).toContainText('Cảm ơn', { timeout: 5000 });
    await expect(submitBtn).toContainText('Đã gửi');
  });
});

// ---------------------------------------------------------------------------
// 13. SEO & META TAGS
// ---------------------------------------------------------------------------
test.describe('13 · SEO & meta tags', () => {
  test('shop homepage: title chứa WOTU, description, canonical, lang=vi', async ({ page }) => {
    await page.goto('/');
    await expect(page).toHaveTitle(/WOTU/);
    const description = await page.locator('meta[name="description"]').getAttribute('content');
    expect(description).toBeTruthy();
    expect(description!.length).toBeGreaterThan(20);
    const canonical = await page.locator('link[rel="canonical"]').getAttribute('href');
    expect(canonical).toBeTruthy();
    expect(await page.locator('html').getAttribute('lang')).toBe('vi');
  });

  test('shop homepage: OG tags đầy đủ (title, description, url luôn có; image tùy)', async ({ page }) => {
    await page.goto('/');
    await expect(page.locator('meta[property="og:title"]')).toBeAttached();
    await expect(page.locator('meta[property="og:description"]')).toBeAttached();
    await expect(page.locator('meta[property="og:url"]')).toBeAttached();
    // og:image chỉ render khi ShopLayout nhận prop ogImage — không bắt buộc trên trang chủ
    // Chỉ kiểm tra nếu có
    const ogImage = page.locator('meta[property="og:image"]');
    const count = await ogImage.count();
    if (count > 0) {
      const content = await ogImage.getAttribute('content');
      expect(content).toBeTruthy();
    }
  });

  test('shop homepage: Twitter card meta tags', async ({ page }) => {
    await page.goto('/');
    const card = await page.locator('meta[name="twitter:card"]').getAttribute('content');
    expect(card).toBe('summary_large_image');
    await expect(page.locator('meta[name="twitter:title"]')).toBeAttached();
  });

  test('/studio/ project detail có title chứa tên dự án', async ({ page }) => {
    await page.goto('/studio/projects/can-ho-flc-quy-nhon');
    await expect(page).toHaveTitle(/Căn hộ FLC Sea Tower/);
  });

  test('/studio/ blog detail có title chứa "Vật liệu"', async ({ page }) => {
    await page.goto('/studio/blog/vat-lieu-gia-dep-theo-thoi-gian');
    await expect(page).toHaveTitle(/Vật liệu/);
  });

  test('/sitemap-index.xml tồn tại trong dist/ và chứa sitemap-0.xml', async ({}) => {
    const fs = await import('node:fs');
    const path = await import('node:path');
    const sitemapPath = path.join(process.cwd(), 'dist', 'sitemap-index.xml');
    const exists = fs.existsSync(sitemapPath);
    expect(exists, 'dist/sitemap-index.xml missing from build output').toBe(true);
    const content = fs.readFileSync(sitemapPath, 'utf8');
    expect(content).toContain('sitemap-0.xml');
  });

  test('/robots.txt accessible, có Sitemap: line, disallow /admin/', async ({ page }) => {
    const response = await page.goto('/robots.txt');
    expect(response?.status()).toBe(200);
    const body = await page.locator('body').innerText();
    expect(body).toContain('Sitemap:');
    expect(body).toContain('/admin/');
  });
});

// ---------------------------------------------------------------------------
// 14. SECURITY — CSP meta tag
// ---------------------------------------------------------------------------
test.describe('14 · Security — CSP meta tag', () => {
  test('shop homepage có CSP meta http-equiv tag', async ({ page }) => {
    await page.goto('/');
    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(csp).toBeAttached();
    const content = await csp.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('/studio/ có CSP meta http-equiv tag', async ({ page }) => {
    await page.goto('/studio/');
    const csp = page.locator('meta[http-equiv="Content-Security-Policy"]');
    await expect(csp).toBeAttached();
    const content = await csp.getAttribute('content');
    expect(content).toBeTruthy();
  });

  test('tất cả external links dùng rel=noopener noreferrer (shop homepage)', async ({ page }) => {
    await page.goto('/');
    const externalLinks = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLAnchorElement>('a[target="_blank"]'))
        .filter((a) => !a.closest('astro-dev-toolbar'))
        .map((a) => ({ href: a.href, rel: a.getAttribute('rel') }));
    });
    // shop có thể không có external links — bỏ qua nếu không tìm thấy
    for (const { href, rel } of externalLinks) {
      expect(rel, `link to ${href} missing noopener`).toContain('noopener');
      expect(rel, `link to ${href} missing noreferrer`).toContain('noreferrer');
    }
  });
});

// ---------------------------------------------------------------------------
// 15. REVEAL ANIMATIONS & ACCESSIBILITY (shop homepage)
// ---------------------------------------------------------------------------
test.describe('15 · Reveal animations & accessibility', () => {
  test('prefers-reduced-motion: [data-reveal] get .is-visible immediately (studio)', async ({ page }) => {
    await page.emulateMedia({ reducedMotion: 'reduce' });
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 100)));
    const reveals = await page.locator('[data-reveal]').all();
    expect(reveals.length).toBeGreaterThan(0);
    for (const el of reveals) {
      await expect(el).toHaveClass(/is-visible/);
    }
  });

  test('all img trên /studio/ có alt attribute không rỗng', async ({ page }) => {
    const routes = ['/studio/', '/studio/projects/', '/studio/projects/can-ho-flc-quy-nhon', '/studio/blog/'];
    for (const route of routes) {
      await page.goto(route);
      const imgs = await page.locator('img').all();
      for (const img of imgs) {
        const alt = await img.getAttribute('alt');
        expect(alt, `img on ${route} missing alt`).not.toBeNull();
        expect(alt!.trim(), `img on ${route} has empty alt`).not.toBe('');
      }
    }
  });

  test('shop homepage: logo img có alt attribute', async ({ page }) => {
    await page.goto('/');
    const logo = page.locator('nav.shop-nav img[alt="WOTU"]');
    await expect(logo).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 16. CART INTERACTION — add to cart + cart drawer
// ---------------------------------------------------------------------------
test.describe('16 · Cart interaction', () => {
  test('click "Giỏ" button trên combo card → cart badge increment → cart drawer mở và hiển thị item', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // cart badge ban đầu phải hidden
    const badge = page.locator('#wotu-cart-badge');
    await expect(badge).toHaveAttribute('hidden', '');

    // scroll đến combo section và click "Giỏ" button đầu tiên (trên combo card không phải feature)
    await page.locator('#combos').scrollIntoViewIfNeeded();
    await page.waitForTimeout(300);

    // combo-add button: "Giỏ" button trên combo card thường (không phải feature card)
    const addBtn = page.locator('.combo-card:not(.feature) .combo-add').first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    // sau khi click: badge phải hiện và count = 1
    await expect(badge).not.toHaveAttribute('hidden');
    await expect(badge).toHaveText('1');

    // click cart button → drawer mở
    const cartBtn = page.locator('#wotu-cart-btn');
    await cartBtn.click();
    const drawer = page.locator('#wotu-cart-drawer');
    await expect(drawer).not.toHaveAttribute('hidden');
    await expect(drawer).toBeVisible();
  });
});

// ---------------------------------------------------------------------------
// 17. FILTER TEST — cat tile filter trên /san-pham/
// ---------------------------------------------------------------------------
test.describe('17 · Filter — cat tile filter', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only — layout phụ thuộc viewport');
  });

  test('click cat tile "Sofa" → chỉ còn cards data-cat="sofa" visible', async ({ page }) => {
    await page.goto('/san-pham/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));

    // click tile sofa
    const sofaTile = page.locator('.cat-tile[data-cat="sofa"]');
    await sofaTile.click();
    await page.waitForTimeout(300);

    // sau khi filter: cards visible phải có data-cat="sofa"
    const visibleCards = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('.card.product-card-item'))
        .filter((el) => el.style.display !== 'none' && el.offsetParent !== null)
        .map((el) => el.dataset.cat ?? '');
    });

    // phải có ít nhất 1 sofa card visible
    expect(visibleCards.filter((c) => c === 'sofa').length).toBeGreaterThanOrEqual(1);
    // không có card cat khác sofa đang visible
    const nonSofa = visibleCards.filter((c) => c !== 'sofa' && c !== '');
    expect(nonSofa.length).toBe(0);
  });
});

// ---------------------------------------------------------------------------
// 18. /combo/ — catalog combo smoke + filter + cart
// ---------------------------------------------------------------------------
test.describe('18 · /combo/ — catalog combo', () => {
  test('h1 chứa "combo"', async ({ page }) => {
    await page.goto('/combo/');
    await expect(page.locator('h1').first()).toContainText('combo');
  });

  test('room tiles hiển thị đủ 7 tiles (Tất cả + 6 phòng)', async ({ page }) => {
    await page.goto('/combo/');
    await expect(page.locator('.cat-tile')).toHaveCount(7);
  });

  test('grid có đủ 6 combo (product-card-item)', async ({ page }) => {
    await page.goto('/combo/');
    await expect(page.locator('.product-card-item')).toHaveCount(6);
  });

  test('feature card dẫn đến /combo/an-cu/', async ({ page }) => {
    await page.goto('/combo/');
    const featureCard = page.locator('.card.feature[href="/combo/an-cu/"]');
    await expect(featureCard).toBeVisible();
  });

  test('filter sidebar có nhóm Khoảng giá + Trạng thái', async ({ page }) => {
    await page.goto('/combo/');
    const groups = page.locator('.filters .fgrp');
    expect(await groups.count()).toBeGreaterThanOrEqual(2);
    await expect(page.locator('input[data-filter-tag="bestseller"]')).toBeAttached();
  });

  test('Nav "Combo nội thất" trỏ tới /combo/ và active highlight', async ({ page }) => {
    await page.goto('/combo/');
    const link = page.locator('.shop-nav-links a[href="/combo/"]');
    await expect(link).toBeAttached();
    await expect(link).toHaveAttribute('aria-current', 'page');
  });

  test('nút "Xem tất cả combo" trên trang chủ trỏ /combo/', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a.shop-btn-outline[href="/combo/"]');
    await expect(cta.first()).toBeAttached();
  });
});

// ---------------------------------------------------------------------------
// 19. /combo/ — room tile filter + cart (desktop only)
// ---------------------------------------------------------------------------
test.describe('19 · /combo/ — room filter & cart', () => {
  test.beforeEach(async ({}, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only — layout phụ thuộc viewport');
  });

  test('click tile "Phòng ngủ" → chỉ còn combo data-cat="phong-ngu" visible', async ({ page }) => {
    await page.goto('/combo/');
    await page.waitForLoadState('domcontentloaded');
    await page.evaluate(() => new Promise((r) => setTimeout(r, 200)));

    await page.locator('.cat-tile[data-cat="phong-ngu"]').click();
    await page.waitForTimeout(300);

    const visible = await page.evaluate(() => {
      return Array.from(document.querySelectorAll<HTMLElement>('.product-card-item'))
        .filter((el) => !el.hidden && el.offsetParent !== null)
        .map((el) => el.dataset.cat ?? '');
    });
    expect(visible.length).toBeGreaterThanOrEqual(1);
    expect(visible.every((c) => c === 'phong-ngu')).toBe(true);
  });

  test('click "Thêm nhanh vào giỏ" → badge increment', async ({ page }) => {
    await page.goto('/combo/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const badge = page.locator('#wotu-cart-badge');
    await expect(badge).toHaveAttribute('hidden', '');

    const addBtn = page.locator('.product-card-item:not(.feature) [data-add]').first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    await expect(badge).not.toHaveAttribute('hidden');
    await expect(badge).toHaveText('1');
  });
});

// ---------------------------------------------------------------------------
// 20. /phong-mau/ — gallery phòng mẫu + chi tiết (isometric hotspot)
// ---------------------------------------------------------------------------
test.describe('20 · /phong-mau/ — phòng mẫu', () => {
  test('nút "Khám phá phòng mẫu" trên trang chủ trỏ /phong-mau/', async ({ page }) => {
    await page.goto('/');
    const cta = page.locator('a.shop-btn-ghost[href="/phong-mau/"]');
    await expect(cta.first()).toBeAttached();
  });

  test('gallery hiển thị đủ 4 phòng (1 live + 3 sắp ra mắt)', async ({ page }) => {
    await page.goto('/phong-mau/');
    await expect(page.locator('.pm-card')).toHaveCount(4);
    await expect(page.locator('.pm-card.soon')).toHaveCount(3);
    // Phòng live là một <a> link sang chi tiết.
    await expect(page.locator('a.pm-card[href="/phong-mau/to-am/"]')).toBeAttached();
  });

  test('hero carousel: nút › đổi cả cụm (chữ + ảnh)', async ({ page }) => {
    await page.goto('/phong-mau/');
    const copies = page.locator('.pm-hero-copy');
    const imgs = page.locator('.pm-img-slide');
    await expect(copies).toHaveCount(4);
    await expect(imgs).toHaveCount(4);
    await expect(copies.nth(0)).toHaveClass(/active/);
    await expect(imgs.nth(0)).toHaveClass(/active/);
    await page.locator('.pm-nav.next').click();
    await expect(copies.nth(1)).toHaveClass(/active/);
    await expect(imgs.nth(1)).toHaveClass(/active/);
    await expect(copies.nth(0)).not.toHaveClass(/active/);
  });

  test('chi tiết Tổ Ấm: có isometric hotspot, sơ đồ mặt bằng, 4 sản phẩm', async ({ page }) => {
    await page.goto('/phong-mau/to-am/');
    await expect(page.locator('h1')).toContainText('Tổ Ấm');
    await expect(page.locator('.iso-dot[data-hotspot]')).toHaveCount(4);
    await expect(page.locator('.dim-svg')).toBeAttached();
    await expect(page.locator('.prod-card')).toHaveCount(4);
  });

  test('click hotspot → popover hiện; Escape → đóng', async ({ page }, testInfo) => {
    test.skip(testInfo.project.name !== 'desktop', 'desktop only — popover phụ thuộc con trỏ');
    await page.goto('/phong-mau/to-am/');
    const firstDot = page.locator('.iso-dot[data-hotspot="0"]');
    const firstPop = page.locator('.iso-pop[data-pop="0"]');
    await expect(firstPop).toBeHidden();
    await firstDot.click();
    await expect(firstPop).toBeVisible();
    await page.keyboard.press('Escape');
    await expect(firstPop).toBeHidden();
  });

  test('"+ Giỏ" trên product card → badge increment', async ({ page }) => {
    await page.goto('/phong-mau/to-am/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const badge = page.locator('#wotu-cart-badge');
    await expect(badge).toHaveAttribute('hidden', '');

    const addBtn = page.locator('.prod-card .prod-add').first();
    await addBtn.scrollIntoViewIfNeeded();
    await addBtn.click();

    await expect(badge).not.toHaveAttribute('hidden');
    await expect(badge).toHaveText('1');
  });
});

// ---------------------------------------------------------------------------
// 21 · Shop UX Pack (P2 — lightbox, qty, empty-state, bulk add, viValidate)
// ---------------------------------------------------------------------------
test.describe('21 · Shop UX Pack', () => {
  test('Lightbox: click ảnh chính → dialog mở; Escape → đóng (sofa-may)', async ({ page }) => {
    await page.goto('/san-pham/sofa-may/');
    await page.waitForLoadState('domcontentloaded');

    const trigger = page.locator('[data-lightbox]').first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const dialog = page.locator('#wotu-lightbox');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Lightbox: click ảnh chính → dialog mở; Escape → đóng (combo/to-am)', async ({ page }) => {
    await page.goto('/combo/to-am/');
    await page.waitForLoadState('domcontentloaded');

    const trigger = page.locator('[data-lightbox]').first();
    await trigger.scrollIntoViewIfNeeded();
    await trigger.click();

    const dialog = page.locator('#wotu-lightbox');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Qty stepper: nút + tăng qty; nút − giảm qty (san-pham/[id])', async ({ page }) => {
    await page.goto('/san-pham/ban-tra-nang-mai/');
    await page.waitForLoadState('domcontentloaded');

    const input = page.locator('#pdQty');
    const plus = page.locator('.pd-qty [data-q="1"]');
    const minus = page.locator('.pd-qty [data-q="-1"]');

    await expect(input).toHaveValue('1');
    await plus.click();
    await expect(input).toHaveValue('2');
    await minus.click();
    await expect(input).toHaveValue('1');
    // Không giảm xuống dưới 1
    await minus.click();
    await expect(input).toHaveValue('1');
  });

  test('Empty state lọc: filter không có kết quả → catalog-empty hiển thị; Xoá bộ lọc → ẩn', async ({ page }) => {
    await page.goto('/san-pham/');
    await page.waitForLoadState('domcontentloaded');

    const emptyEl = page.locator('#catalog-empty');
    await expect(emptyEl).toBeHidden();

    // Đặt khoảng giá tối đa rất thấp để không có sản phẩm nào khớp
    const maxInput = page.locator('.range-inputs input:last-child');
    await maxInput.scrollIntoViewIfNeeded();
    await maxInput.fill('100');
    await maxInput.dispatchEvent('change');

    await expect(emptyEl).toBeVisible();

    const clearBtn = page.locator('#catalog-empty-clear');
    await clearBtn.click();
    await expect(emptyEl).toBeHidden();
  });

  test('Wishlist bulk add: "Thêm hết vào giỏ" → badge tăng đúng số lượng', async ({ page }) => {
    await page.goto('/yeu-thich/');
    await clearStorage(page);

    // Seed 2 item yêu thích vào localStorage (dùng ID thực từ shop-home.yml)
    await page.evaluate(() => {
      localStorage.setItem('wotu-shop-fav-v1', JSON.stringify(['combo-to-am', 'combo-an-cu']));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    const addAllBtn = page.locator('#wl-add-all');
    await expect(addAllBtn).toBeVisible();

    const badge = page.locator('#wotu-cart-badge');
    await addAllBtn.click();

    await expect(badge).not.toHaveAttribute('hidden');
    // 2 items thêm vào → badge = 2
    await expect(badge).toHaveText('2');
  });

  test('Back-to-top nút hiển thị sau khi scroll xuống (san-pham/)', async ({ page }) => {
    await page.goto('/san-pham/');
    await page.waitForLoadState('domcontentloaded');

    const btn = page.locator('#wotu-btt');
    // Ban đầu chưa có class .on
    await expect(btn).not.toHaveClass(/\bon\b/);

    // Scroll xuống đủ xa (> 1.2 × innerHeight)
    await page.evaluate(() => window.scrollTo(0, window.innerHeight * 1.5));
    await page.waitForTimeout(400);

    await expect(btn).toHaveClass(/\bon\b/);
  });

  test('Form validation tiếng Việt: submit CartDrawer form thiếu tên → custom message', async ({ page }) => {
    await page.goto('/');
    await clearStorage(page);
    await page.evaluate(() => {
      localStorage.setItem('wotu-shop-cart-v1', JSON.stringify([
        { id: 'c-to-am', name: 'Combo Tổ Ấm', price: 28500000, qty: 1 }
      ]));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    // Mở cart drawer
    await page.evaluate(() => (window as any).__wotuOpenCart?.());
    const drawer = page.locator('#wotu-cart-drawer');
    await expect(drawer).not.toHaveAttribute('hidden');

    // Submit form trống
    const form = page.locator('#cart-form');
    const nameInput = form.locator('input[name="name"]');
    await expect(nameInput).toBeVisible();

    // Kiểm tra HTML5 validation sẽ chặn submit — browser native, không fetch
    const submitBtn = form.locator('button[type="submit"]');
    await submitBtn.click();

    // Kiểm tra validationMessage tiếng Việt via evaluate
    const msg = await nameInput.evaluate((el: HTMLInputElement) => el.validationMessage);
    expect(msg).not.toBe('');
    expect(msg).toMatch(/vui lòng|điền/i);
  });
});

// ---------------------------------------------------------------------------
// 22 · Studio reading & gallery (Sprint 1+2 — progress, share, post-nav, gallery)
// ---------------------------------------------------------------------------
test.describe('22 · Studio reading & gallery', () => {
  test('Blog detail: thanh tiến trình + nút chia sẻ (copy) hiển thị', async ({ page }) => {
    await page.goto('/studio/blog/do-dat-rieng-hay-mua-san');
    await page.waitForLoadState('domcontentloaded');

    await expect(page.locator('.art-progress__bar')).toBeAttached();
    await expect(page.locator('[data-share-copy]').first()).toBeVisible();
  });

  test('Blog detail: điều hướng bài trước/sau có ít nhất 1 link', async ({ page }) => {
    await page.goto('/studio/blog/do-dat-rieng-hay-mua-san');
    await page.waitForLoadState('domcontentloaded');

    const nav = page.locator('.post-nav');
    await expect(nav).toBeVisible();
    expect(await nav.locator('a').count()).toBeGreaterThanOrEqual(1);
  });

  test('Project gallery: click ô ảnh → lightbox mở; Escape → đóng', async ({ page }) => {
    await page.goto('/studio/projects/can-ho-flc-quy-nhon');
    await page.waitForLoadState('domcontentloaded');

    const cell = page.locator('[data-pg-open]').first();
    await cell.scrollIntoViewIfNeeded();
    await cell.click();

    const dialog = page.locator('#wotu-proj-lightbox');
    await expect(dialog).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(dialog).toBeHidden();
  });

  test('Contact: nút sao chép hotline/email hiển thị trên /studio/', async ({ page }) => {
    await page.goto('/studio/');
    await page.waitForLoadState('domcontentloaded');

    const copyBtns = page.locator('.contact-copy');
    expect(await copyBtns.count()).toBeGreaterThanOrEqual(2);
  });
});

// ---------------------------------------------------------------------------
// 23 · Shop Sprint 3 (tồn kho urgency, specs, suggestions)
// ---------------------------------------------------------------------------
test.describe('23 · Shop Sprint 3', () => {
  test('Catalog: badge tồn kho "Chỉ còn N" hiển thị', async ({ page }) => {
    await page.goto('/san-pham/');
    await page.waitForLoadState('domcontentloaded');
    const stock = page.locator('.card-stock').first();
    await expect(stock).toBeAttached();
    await expect(stock).toContainText(/Chỉ còn|hết hàng/i);
  });

  test('Detail: bảng thông số (specs) + tồn kho low hiển thị', async ({ page }) => {
    await page.goto('/san-pham/ban-tra-nang-mai/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.pd-specs')).toBeVisible();
    await expect(page.locator('.pd-stock.low')).toContainText(/Chỉ còn/);
  });

  test('Suggestions: section hiện sau khi có lịch sử xem', async ({ page }) => {
    // Seed lịch sử xem 2 sản phẩm cùng hạng mục "Bàn".
    await page.goto('/');
    await page.evaluate(() => {
      localStorage.setItem('wotu-shop-recent-v1', JSON.stringify(['p-ban-tra-nang-mai']));
    });
    await page.reload();
    await page.waitForLoadState('domcontentloaded');
    const sg = page.locator('#wotu-suggest');
    await expect(sg).toBeVisible();
    expect(await sg.locator('.sg-card').count()).toBeGreaterThanOrEqual(1);
  });
});

// ---------------------------------------------------------------------------
// 24 · Shop Sprint 4 (so sánh, review summary, a11y range slider)
// ---------------------------------------------------------------------------
test.describe('24 · Shop Sprint 4', () => {
  test('Review summary: thanh phân bố sao hiển thị trên trang chủ', async ({ page }) => {
    await page.goto('/');
    await page.waitForLoadState('domcontentloaded');
    await expect(page.locator('.rs-bars')).toBeAttached();
    await expect(page.locator('.rs-avg')).toContainText(/\d/);
  });

  // Click nút so sánh thứ n, đưa về giữa viewport trước (tránh bị thanh sticky che).
  async function clickCompare(page: import('@playwright/test').Page, n: number) {
    // dispatchEvent: bắn thẳng 'click' vào nút (thanh so sánh sticky có thể che
    // toạ độ → click thường trượt sang overlay). Chỉ cần verify wiring store.
    await page.locator('[data-compare]').nth(n).dispatchEvent('click');
  }

  test('So sánh: chọn 2 SP → bar hiện → mở modal bảng', async ({ page }) => {
    await page.goto('/san-pham/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    await clickCompare(page, 0);
    await clickCompare(page, 1);

    const bar = page.locator('#wotu-compare-bar');
    await expect(bar).toBeVisible();
    await expect(page.locator('#cmp-count')).toHaveText('2');

    await page.locator('#cmp-open').click();
    const modal = page.locator('#wotu-compare-modal');
    await expect(modal).toBeVisible();
    await expect(modal.locator('.cmp-table')).toBeVisible();

    await page.keyboard.press('Escape');
    await expect(modal).toBeHidden();
  });

  test('So sánh: giới hạn 3 sản phẩm', async ({ page }) => {
    await page.goto('/san-pham/');
    await clearStorage(page);
    await page.reload();
    await page.waitForLoadState('domcontentloaded');

    for (let i = 0; i < 4; i++) await clickCompare(page, i);
    await expect(page.locator('#cmp-count')).toHaveText('3');
  });

  test('Range slider: thumb focusable + phím mũi tên đổi aria-valuenow', async ({ page }) => {
    await page.goto('/san-pham/');
    await page.waitForLoadState('domcontentloaded');
    const lo = page.locator('.range-thumb.lo');
    await expect(lo).toHaveAttribute('role', 'slider');
    const before = await lo.getAttribute('aria-valuenow');
    await lo.focus();
    await page.keyboard.press('ArrowRight');
    const after = await lo.getAttribute('aria-valuenow');
    expect(Number(after)).toBeGreaterThan(Number(before));
  });
});

test.describe('25 · Search nâng cấp — product index + Pagefind', () => {
  test('/search-index.json: 28 entries (18 SP + 6 combo + 4 phòng), kw không dấu', async ({ request }) => {
    const res = await request.get('/search-index.json');
    expect(res.ok()).toBeTruthy();
    const data = await res.json();
    expect(data.length).toBe(28);
    const byType: Record<string, number> = {};
    for (const e of data) byType[e.type] = (byType[e.type] ?? 0) + 1;
    expect(byType).toMatchObject({ product: 18, combo: 6, room: 4 });
    expect(data.every((e: any) => !/[àáảãạăâêôơưđ]/i.test(e.kw))).toBeTruthy();
  });

  test('/tim-kiem/: trống → 28 card; lọc Combo → URL ?cat=combo; còn hàng thu hẹp', async ({ page }) => {
    await page.goto('/tim-kiem/');
    await expect(page.locator('#ts-products .ts-card')).toHaveCount(28, { timeout: 8000 });
    await page.locator('.ts-chips[data-group="cat"] .ts-chip[data-val="combo"]').click();
    await expect(page.locator('#ts-products .ts-card')).toHaveCount(6);
    await expect(page).toHaveURL(/[?&]cat=combo/);
    await page.locator('#ts-clear').click();
    const all = await page.locator('#ts-products .ts-card').count();
    await page.locator('#ts-stock').check();
    expect(await page.locator('#ts-products .ts-card').count()).toBeLessThan(all);
  });

  test('/tim-kiem/: tìm KHÔNG DẤU "sofa may" ra Sofa Mây + nhóm nội dung Pagefind', async ({ page }) => {
    await page.goto('/tim-kiem/?q=sofa%20may');
    const cards = page.locator('#ts-products .ts-card');
    await expect(cards.first()).toBeVisible({ timeout: 8000 });
    await expect(cards.first().locator('.ts-card-title')).toContainText('Mây');
    await expect(cards.first().locator('.ts-card-price')).toContainText('đ');
    await expect(page.locator('#ts-content-sec')).toBeVisible({ timeout: 8000 });
  });

  test('Nav search: Cmd/Ctrl+K mở + chip gợi ý; gõ "sofa may" ra SP có giá; Enter → /tim-kiem/?q=', async ({ page }) => {
    await page.goto('/');
    const wrap = page.locator('[data-shop-search]');
    await page.keyboard.press('Control+k');
    await expect(wrap).toHaveClass(/open/);
    await expect(wrap.locator('.shop-search-chip').first()).toBeVisible();
    await wrap.locator('.shop-search-input').fill('sofa may');
    const prod = wrap.locator('.shop-search-result.ssp');
    await expect(prod.first()).toBeVisible({ timeout: 6000 });
    await expect(prod.first().locator('.ssp-price')).toContainText('đ');
    await wrap.locator('.shop-search-input').press('Enter');
    await page.waitForURL(/\/tim-kiem\/\?q=/, { timeout: 6000 });
  });
});
