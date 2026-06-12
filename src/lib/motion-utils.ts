/**
 * motion-utils.ts — primitive dùng chung cho shop-motion và studio-motion.
 * rAF lerp engine singleton: kick() đăng ký 1 lerper; engine chạy 1 rAF loop.
 * Tất cả lerper dùng chung 1 loop → không tạo nhiều rAF khi nhiều hiệu ứng.
 */
import { scroll } from 'motion';

export type Lerper = () => boolean; // true = còn chạy

const active = new Set<Lerper>();
let running = false;

function tick(): void {
  active.forEach((l) => { if (!l()) active.delete(l); });
  running = active.size > 0;
  if (running) requestAnimationFrame(tick);
}

/** Đăng ký lerper vào rAF loop chung. */
export function kick(l: Lerper): void {
  active.add(l);
  if (!running) { running = true; requestAnimationFrame(tick); }
}

export function clamp(v: number, max: number): number {
  return Math.max(-max, Math.min(max, v));
}

/**
 * Gắn parallax cuộn (scroll-linked) cho mảng phần tử.
 * `speed`: độ dịch chuyển px ở vị trí giữa viewport (travel = ±speed/2).
 * Giá trị âm → đảo chiều (scroll xuống element dịch lên nhanh hơn).
 */
export function applyParallax(els: HTMLElement[], speed = 28): void {
  if (!els.length) return;
  const narrow = window.innerWidth < 760;
  els.forEach((el) => {
    let travel = speed;
    if (narrow) travel *= 0.4;
    travel = Math.max(-50, Math.min(50, travel));
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

/** Gắn magnetic button cho selector — ease theo con trỏ bằng lerp. */
export function applyMagnetic(selector: string, str = 0.3, max = 8): void {
  document.querySelectorAll<HTMLElement>(selector).forEach((el) => {
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
      tx = clamp((e.clientX - (r.left + r.width / 2)) * str, max);
      ty = clamp((e.clientY - (r.top + r.height / 2)) * str, max);
      kick(lerper);
    });
    el.addEventListener('pointerleave', () => { tx = 0; ty = 0; kick(lerper); });
  });
}
