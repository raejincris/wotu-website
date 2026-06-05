/**
 * phong-mau-motion.ts — motion bespoke cho 2 trang Phòng mẫu.
 *
 * Import page-scoped (chỉ ở phong-mau/[slug].astro) → không lan trang khác.
 * Tự gọi init() khi import. Gate `prefers-reduced-motion` + `?cms=1` ngay đầu →
 * return SẠCH: nội dung (SVG bản vẽ, chấm hotspot) vốn hiển thị đủ qua CSS, không
 * ẩn bằng JS → no-JS / reduce / cms vẫn thấy nguyên vẹn. Chỉ chạm transform /
 * opacity / stroke-dashoffset → 0 CLS.
 *
 * Tách khỏi shop-motion.ts (tilt/parallax/magnetic dùng chung) — file này chỉ lo
 * 2 hiệu ứng riêng của phòng mẫu: vẽ bản vẽ SVG + hotspot nảy vào tuần tự.
 */
import { animate, inView, stagger } from 'motion';

const EASE = [0.16, 1, 0.3, 1] as const;

export function initPhongMauMotion(): void {
  if (typeof window === 'undefined') return;
  const reduce = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
  const cms = window.location.search.includes('cms=1');
  if (reduce || cms) return; // nội dung vốn hiển thị → return sạch

  drawFloorplan();
  hotspotReveal();
}

/* ── Item 2: "vẽ" bản vẽ mặt bằng SVG ──
   Tường + dim-line vẽ ra bằng stroke-dashoffset → 0; khối nội thất scale-in
   tuần tự; text/label fade cuối. Chạy 1 lần khi #floorplan vào viewport. */
function drawFloorplan(): void {
  const svg = document.querySelector<SVGSVGElement>('#floorplan .dim-svg');
  if (!svg) return;

  const strokes = Array.from(
    svg.querySelectorAll<SVGGeometryElement>('.room, .dim-line'),
  );
  const objs = Array.from(svg.querySelectorAll<SVGGraphicsElement>('.obj, .obj-2'));
  const texts = Array.from(svg.querySelectorAll<SVGGraphicsElement>('text'));

  // Initial state — set bằng JS only (sau gate). Tường: giấu nét bằng dashoffset.
  const lens = strokes.map((el) => {
    let len = 0;
    try { len = el.getTotalLength(); } catch { len = 0; }
    if (len > 0) {
      el.style.strokeDasharray = `${len}`;
      el.style.strokeDashoffset = `${len}`;
    }
    return len;
  });
  objs.forEach((el) => {
    el.style.transformBox = 'fill-box';
    el.style.transformOrigin = 'center';
    el.style.opacity = '0';
    el.style.transform = 'scale(.92)';
  });
  texts.forEach((el) => { el.style.opacity = '0'; });

  inView(
    svg,
    () => {
      // 1. Vẽ tường + dim-line.
      strokes.forEach((el, i) => {
        if (lens[i] <= 0) return;
        el.style.willChange = 'stroke-dashoffset';
        animate(
          el,
          { strokeDashoffset: [lens[i], 0] },
          { duration: 0.9, delay: i * 0.06, ease: EASE },
        ).finished.finally(() => {
          el.style.willChange = '';
          el.style.strokeDasharray = '';
          el.style.strokeDashoffset = '';
        });
      });
      // 2. Khối nội thất scale-in sau khi tường vẽ gần xong.
      if (objs.length) {
        animate(
          objs,
          { opacity: [0, 1], transform: ['scale(.92)', 'scale(1)'] },
          { duration: 0.5, delay: stagger(0.09, { startDelay: 0.45 }), ease: EASE },
        ).finished.finally(() => {
          objs.forEach((el) => { el.style.transform = ''; el.style.opacity = ''; });
        });
      }
      // 3. Text/label fade cuối.
      if (texts.length) {
        animate(
          texts,
          { opacity: [0, 1] },
          { duration: 0.4, delay: stagger(0.05, { startDelay: 0.7 }), ease: 'easeOut' },
        ).finished.finally(() => {
          texts.forEach((el) => { el.style.opacity = ''; });
        });
      }
      return undefined; // không re-run
    },
    { amount: 0.4 },
  );
}

/* ── Item 3: hotspot nảy vào tuần tự ──
   Khi iso-stage vào viewport, các .iso-dot từ scale(.4)+mờ → bình thường, stagger
   1→n. Pulse + toggle popover do RoomHotspots.astro tự lo (giữ nguyên). */
function hotspotReveal(): void {
  const stage = document.querySelector<HTMLElement>('[data-iso-stage]');
  if (!stage) return;
  const dots = Array.from(stage.querySelectorAll<HTMLElement>('.iso-dot'));
  if (!dots.length) return;

  // .iso-dot vốn có transform: translate(-50%,-50%) định vị → animate phải GIỮ
  // translate đó, chỉ thêm scale. Set initial bằng JS only.
  dots.forEach((el) => {
    el.style.opacity = '0';
    el.style.transform = 'translate(-50%, -50%) scale(.4)';
  });

  inView(
    stage,
    () => {
      dots.forEach((el) => { el.style.willChange = 'transform, opacity'; });
      animate(
        dots,
        {
          opacity: [0, 1],
          transform: ['translate(-50%, -50%) scale(.4)', 'translate(-50%, -50%) scale(1)'],
        },
        { duration: 0.45, delay: stagger(0.07, { startDelay: 0.15 }), ease: [0.34, 1.56, 0.64, 1] },
      ).finished.finally(() => {
        // Clear inline → trả lại CSS (hover scale, aria-expanded… nhận lại).
        dots.forEach((el) => {
          el.style.opacity = '';
          el.style.transform = '';
          el.style.willChange = '';
        });
      });
      return undefined;
    },
    { amount: 0.3 },
  );
}

initPhongMauMotion();
