/**
 * studio-motion.ts — lớp motion nhẹ cho Studio home (/studio/).
 *
 * Chỉ tải ở studio/index.astro (page-scoped, lazy via requestIdleCallback).
 * Gate: prefers-reduced-motion + ?cms=1 → return sạch.
 * Chỉ transform/opacity → 0 CLS. Biên độ nhỏ hơn Shop (editorial/trầm).
 *
 * Hiệu ứng:
 *  - Hero image: parallax nhẹ (speed 16)
 *  - Projects: 2 cột parallax lệch pha (+12 vs −8)
 *  - Contact submit: magnetic
 */
import { applyParallax, applyMagnetic } from './motion-utils';

export function initStudioMotion(): void {
  if (typeof window === 'undefined') return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cms = window.location.search.includes('cms=1');
  if (reduce || cms) return;

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  // Hero image parallax — element là wrapper .reveal-img trong .hero-bottom
  const heroImg = Array.from(
    document.querySelectorAll<HTMLElement>('.hero-bottom .reveal-img'),
  );
  applyParallax(heroImg, 16);

  // Projects: cột phải dịch chuyển theo hướng ngược nhẹ so với trang → tạo lệch pha 2 cột
  const projRight = Array.from(
    document.querySelectorAll<HTMLElement>('.proj-right'),
  );
  applyParallax(projRight, -10);

  // Contact submit magnetic (chỉ con trỏ chính xác)
  if (!coarse) {
    applyMagnetic('#wotu-contact-submit', 0.25, 6);
  }
}

initStudioMotion();
