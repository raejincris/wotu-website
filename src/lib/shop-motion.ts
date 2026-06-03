/**
 * shop-motion.ts — lớp animation nâng cao cho Shop home (`/`).
 *
 * Chỉ tải ở index.astro (page-scoped). Chồng LÊN reveal cũ (.shop-reveal*) —
 * không thay thế. Tự tắt sạch khi `prefers-reduced-motion` hoặc khung
 * live-preview admin (`?cms=1`). Chỉ transform/opacity → 0 CLS.
 *
 * Tilt + magnetic dùng CHUNG 1 vòng rAF lerp (ease theo con trỏ ở 60fps) thay
 * vì CSS transition đè per-frame hay tạo spring mỗi pointermove → mượt, không trễ.
 */
import { animate, scroll, inView, stagger } from 'motion';

const EASE = [0.16, 1, 0.3, 1] as const;

/* ---- rAF lerp engine dùng chung ---- */
type Lerper = () => boolean; // true = còn chạy
const active = new Set<Lerper>();
let running = false;
function tick(): void {
  active.forEach((l) => {
    if (!l()) active.delete(l);
  });
  running = active.size > 0;
  if (running) requestAnimationFrame(tick);
}
function kick(l: Lerper): void {
  active.add(l);
  if (!running) {
    running = true;
    requestAnimationFrame(tick);
  }
}

export function initShopMotion(): void {
  if (typeof window === 'undefined') return;

  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cms = window.location.search.includes('cms=1');
  if (reduce || cms) return; // nội dung vốn đã hiển thị → return sạch

  const coarse = window.matchMedia('(pointer: coarse)').matches;

  heroEntrance();
  parallax();
  countUp();
  if (!coarse) {
    magnetic();
    tilt();
    spotlight();
  }
}

/* 1. Hero entrance — rise bằng TRANSFORM cho mọi block (GPU-composited → mượt;
   KHÔNG clip-path vì repaint chữ lớn = jank). Opacity để parent .shop-reveal lo. */
function heroEntrance(): void {
  const items = Array.from(
    document.querySelectorAll<HTMLElement>('[data-hero-item]'),
  );
  if (!items.length) return;
  items.forEach((el) => {
    el.style.transform = 'translateY(22px)';
    el.style.willChange = 'transform';
  });
  animate(
    items,
    { transform: ['translateY(22px)', 'translateY(0px)'] },
    { duration: 0.85, delay: stagger(0.08, { startDelay: 0.1 }), ease: EASE },
  ).finished.finally(() => {
    items.forEach((el) => {
      el.style.transform = '';
      el.style.willChange = '';
    });
  });
}

/* Spotlight theo con trỏ trên panel tối .inspo — quầng accent bám chuột (lerp). */
function spotlight(): void {
  const el = document.querySelector<HTMLElement>('.inspo');
  if (!el) return;
  let mx = 50, my = 50, tx = 50, ty = 50;
  const lerper: Lerper = () => {
    mx += (tx - mx) * 0.18;
    my += (ty - my) * 0.18;
    el.style.setProperty('--mx', `${mx.toFixed(1)}%`);
    el.style.setProperty('--my', `${my.toFixed(1)}%`);
    return !(Math.abs(tx - mx) < 0.1 && Math.abs(ty - my) < 0.1);
  };
  el.addEventListener('pointerenter', () => el.classList.add('spotting'));
  el.addEventListener('pointermove', (e) => {
    const r = el.getBoundingClientRect();
    tx = ((e.clientX - r.left) / r.width) * 100;
    ty = ((e.clientY - r.top) / r.height) * 100;
    kick(lerper);
  });
  el.addEventListener('pointerleave', () => el.classList.remove('spotting'));
}

/* 2. Parallax cuộn — transform + layer-promote (will-change) cho mượt, kể cả blob blur. */
function parallax(): void {
  const els = Array.from(
    document.querySelectorAll<HTMLElement>('[data-parallax]'),
  );
  if (!els.length) return;
  const narrow = window.innerWidth < 760;
  els.forEach((el) => {
    let travel = parseFloat(el.dataset.parallaxSpeed || '30');
    if (narrow) travel *= 0.5;
    travel = Math.max(-40, Math.min(40, travel));
    el.style.willChange = 'transform';
    scroll(
      (progress: number) => {
        const y = -(progress - 0.5) * travel;
        el.style.transform = `translate3d(0, ${y.toFixed(2)}px, 0)`;
      },
      { target: el, offset: ['start end', 'end start'] },
    );
  });
}

/* 3. Count-up số liệu hero — giữ đuôi (vd "+", "★"), chạy 1 lần. */
function countUp(): void {
  document.querySelectorAll<HTMLElement>('[data-count]').forEach((el) => {
    if (el.children.length) return; // có markup con (sup…) → bỏ qua
    const raw = (el.textContent || '').trim();
    const m = raw.match(/^(\d+(?:[.,]\d+)?)(.*)$/);
    if (!m) return;
    const numStr = m[1];
    const suffix = m[2] ?? '';
    const sep = numStr.includes(',') ? ',' : '.';
    const target = parseFloat(numStr.replace(',', '.'));
    const decimals =
      numStr.includes('.') || numStr.includes(',')
        ? numStr.split(/[.,]/)[1]?.length ?? 0
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
        return undefined; // không re-run
      },
      { amount: 0.6 },
    );
  });
}

/* 4a. Magnetic — nút ease theo con trỏ bằng lerp (không tạo spring mỗi event). */
function magnetic(): void {
  document.querySelectorAll<HTMLElement>('[data-magnetic]').forEach((el) => {
    const STR = 0.3;
    const MAX = 8;
    let x = 0, y = 0, tx = 0, ty = 0;
    const lerper: Lerper = () => {
      x += (tx - x) * 0.2;
      y += (ty - y) * 0.2;
      el.style.transform = `translate(${x.toFixed(2)}px, ${y.toFixed(2)}px)`;
      if (Math.abs(tx - x) < 0.05 && Math.abs(ty - y) < 0.05) {
        x = tx; y = ty;
        el.style.transform = tx === 0 && ty === 0 ? '' : `translate(${tx}px, ${ty}px)`;
        if (tx === 0 && ty === 0) el.style.willChange = '';
        return false;
      }
      return true;
    };
    el.addEventListener('pointerenter', () => { el.style.willChange = 'transform'; });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      tx = clamp((e.clientX - (r.left + r.width / 2)) * STR, MAX);
      ty = clamp((e.clientY - (r.top + r.height / 2)) * STR, MAX);
      kick(lerper);
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(lerper); });
  });
}

/* 4b. 3D tilt — rotateX/Y + lift, ease bằng lerp; JS điều khiển transform trực tiếp. */
function tilt(): void {
  document.querySelectorAll<HTMLElement>('[data-tilt]').forEach((el) => {
    const MAX = 6; // độ
    const LIFT = el.classList.contains('product-card') ? -4 : -6;
    let rx = 0, ry = 0, lift = 0, trx = 0, tryy = 0, tlift = 0;
    const lerper: Lerper = () => {
      rx += (trx - rx) * 0.18;
      ry += (tryy - ry) * 0.18;
      lift += (tlift - lift) * 0.18;
      el.style.transform = `perspective(720px) rotateX(${rx.toFixed(2)}deg) rotateY(${ry.toFixed(2)}deg) translateY(${lift.toFixed(2)}px)`;
      const done =
        Math.abs(trx - rx) < 0.01 &&
        Math.abs(tryy - ry) < 0.01 &&
        Math.abs(tlift - lift) < 0.04;
      if (done) {
        if (trx === 0 && tryy === 0 && tlift === 0) {
          el.style.transform = '';
          el.style.willChange = '';
        }
        return false;
      }
      return true;
    };
    el.addEventListener('pointerenter', () => { el.style.willChange = 'transform'; tlift = LIFT; kick(lerper); });
    el.addEventListener('pointermove', (e) => {
      const r = el.getBoundingClientRect();
      trx = -((e.clientY - r.top) / r.height - 0.5) * MAX * 2;
      tryy = ((e.clientX - r.left) / r.width - 0.5) * MAX * 2;
      kick(lerper);
    });
    el.addEventListener('pointerleave', () => { trx = 0; tryy = 0; tlift = 0; kick(lerper); });
  });
}

function clamp(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

initShopMotion();
