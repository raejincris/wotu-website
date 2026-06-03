/**
 * shop-motion.ts — lớp animation nâng cao cho Shop home (`/`).
 *
 * Chỉ tải ở index.astro (page-scoped). Chồng LÊN reveal cũ (.shop-reveal*) —
 * không thay thế. Tự tắt sạch khi `prefers-reduced-motion` hoặc khung
 * live-preview admin (`?cms=1`) để giữ a11y + Playwright (chạy reduce) xanh +
 * khung sửa nội dung đứng yên. Chỉ dùng transform/opacity → 0 CLS.
 */
import { animate, scroll, inView, stagger } from 'motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export function initShopMotion(): void {
  if (typeof window === 'undefined') return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cms = window.location.search.includes('cms=1');
  // Không hiệu ứng: nội dung vốn đã hiển thị (không bị JS ẩn) → return sạch.
  if (reduce || cms) return;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  heroEntrance();
  parallax();
  countUp();
  if (!coarse) {
    magnetic();
    tilt();
  }
}

/* 1. Hero entrance — stagger từng block khi vào trang. */
function heroEntrance(): void {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hero-item]'),
  );
  if (!items.length) return;
  // Ẩn ngay (đồng bộ) trước khi paint kế tiếp, rồi animate vào.
  items.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translateY(18px)';
  });
  animate(
    items,
    { opacity: [0, 1], transform: ['translateY(18px)', 'translateY(0px)'] },
    { duration: 0.7, delay: stagger(0.08, { startDelay: 0.1 }), ease: EASE },
  ).finished.finally(() => {
    // Dọn inline style để không kẹt transform (ảnh hưởng layout con).
    items.forEach((el) => {
      el.style.opacity = '';
      el.style.transform = '';
    });
  });
}

/* 2. Parallax khi cuộn — chỉ transform, biên độ nhỏ, giảm trên mobile. */
function parallax(): void {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('[data-parallax]'),
  );
  if (!els.length) return;
  const narrow = window.innerWidth < 760;
  els.forEach((el) => {
    let travel = parseFloat(el.dataset.parallaxSpeed || '30'); // px tổng quãng
    if (narrow) travel *= 0.5;
    travel = Math.max(-40, Math.min(40, travel));
    scroll(
      (progress: number) => {
        const y = -(progress - 0.5) * travel;
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      },
      { target: el, offset: ['start end', 'end start'] },
    );
  });
}

/* 3. Count-up cho số liệu hero — giữ phần đuôi (vd "+", "★"), 1 lần. */
function countUp(): void {
  document
    .querySelectorAll<HTMLElement>('[data-count]')
    .forEach((el) => {
      // Có markup con (vd <sup>) → bỏ qua để không vỡ HTML.
      if (el.children.length) return;
      const raw = (el.textContent || '').trim();
      const m = raw.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
      if (!m) return;
      const numStr = m[1];
      const suffix = m[2] ?? '';
      const sep = numStr.includes(',') ? ',' : '.';
      const target = parseFloat(numStr.replace(',', '.'));
      const decimals = numStr.includes('.') || numStr.includes(',')
        ? (numStr.split(/[.,]/)[1]?.length ?? 0)
        : 0;
      const fmt = (v: number) =>
        (decimals ? v.toFixed(decimals).replace('.', sep) : String(Math.round(v))) +
        suffix;
      el.textContent = fmt(0);
      inView(
        el,
        () => {
          animate(0, target, {
            duration: 1.4,
            ease: 'easeOut',
            onUpdate: (v: number) => {
              el.textContent = fmt(v);
            },
          });
          return undefined; // không re-run khi rời viewport
        },
        { amount: 0.6 },
      );
    });
}

/* 4a. Magnetic — nút bám nhẹ con trỏ, bật về khi rời. */
function magnetic(): void {
  document
    .querySelectorAll<HTMLElement>('[data-magnetic]')
    .forEach((el) => {
      const STR = 0.3;
      const MAX = 8;
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const mx = e.clientX - (r.left + r.width / 2);
        const my = e.clientY - (r.top + r.height / 2);
        const x = Math.max(-MAX, Math.min(MAX, mx * STR));
        const y = Math.max(-MAX, Math.min(MAX, my * STR));
        animate(el, { x, y }, { type: 'spring', stiffness: 350, damping: 20 });
      });
      el.addEventListener('pointerleave', () => {
        animate(el, { x: 0, y: 0 }, { type: 'spring', stiffness: 350, damping: 22 });
      });
    });
}

/* 4b. 3D tilt — set biến --rx/--ry, kết hợp lift qua --lift trong CSS. */
function tilt(): void {
  document
    .querySelectorAll<HTMLElement>('[data-tilt]')
    .forEach((el) => {
      const MAX = 6; // độ
      el.addEventListener('pointermove', (e) => {
        const r = el.getBoundingClientRect();
        const px = (e.clientX - r.left) / r.width - 0.5;
        const py = (e.clientY - r.top) / r.height - 0.5;
        el.style.setProperty('--ry', `${(px * MAX * 2).toFixed(2)}deg`);
        el.style.setProperty('--rx', `${(-py * MAX * 2).toFixed(2)}deg`);
      });
      el.addEventListener('pointerleave', () => {
        el.style.setProperty('--rx', '0deg');
        el.style.setProperty('--ry', '0deg');
      });
    });
}

initShopMotion();
