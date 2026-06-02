/**
 * cms-preview.ts — chế độ xem trước trực tiếp cho Custom Admin.
 *
 * Chỉ kích hoạt khi URL có `?cms=1` (admin tải trang vào <iframe> với param này).
 * Nhận postMessage từ admin (cùng origin) và patch DOM ngay — không cần rebuild:
 *   { type:'patch',   key, value }      → set nội dung [data-cms="key"]
 *   { type:'img',     key, src }        → đổi ảnh [data-cms-img="key"]
 *   { type:'section', id, on }          → ẩn/hiện [data-cms-section="id"]
 *   { type:'reorder', order:[ids] }     → sắp xếp lại các [data-cms-section]
 *   { type:'scrollTo',key|id }          → cuộn tới phần tử (khi focus field bên admin)
 *
 * Bản thân trang vẫn render bình thường từ YAML đã deploy; patch chỉ phủ lên trên.
 */

function isPreview(): boolean {
  try {
    return new URLSearchParams(location.search).get('cms') === '1';
  } catch {
    return false;
  }
}

function setContent(el: Element, value: string) {
  // Field nội dung có thể chứa HTML (vd hero title <em>). Dùng innerHTML cho linh hoạt;
  // same-origin + chỉ admin (đã đăng nhập GitHub) gửi → không phải bề mặt XSS công khai.
  (el as HTMLElement).innerHTML = value ?? '';
}

function applyPatch(key: string, value: string) {
  document.querySelectorAll(`[data-cms="${CSS.escape(key)}"]`).forEach((el) => setContent(el, value));
}

function applyImg(key: string, src: string) {
  document.querySelectorAll(`[data-cms-img="${CSS.escape(key)}"]`).forEach((el) => {
    if (el instanceof HTMLImageElement) {
      if (src) {
        el.src = src;
        el.style.removeProperty('display');
      }
    } else {
      (el as HTMLElement).style.backgroundImage = src ? `url("${src}")` : '';
    }
  });
}

function applySection(id: string, on: boolean) {
  document.querySelectorAll(`[data-cms-section="${CSS.escape(id)}"]`).forEach((el) => {
    (el as HTMLElement).style.display = on ? '' : 'none';
  });
}

function applyReorder(order: string[]) {
  // Build dùng flex container + CSS `order`; preview chỉ cần set lại style.order.
  order.forEach((id, i) => {
    document.querySelectorAll(`[data-cms-section="${CSS.escape(id)}"]`).forEach((el) => {
      (el as HTMLElement).style.order = String(i);
    });
  });
}

function scrollToTarget(sel: string) {
  const el = document.querySelector(sel);
  if (el) el.scrollIntoView({ behavior: 'smooth', block: 'center' });
}

if (isPreview()) {
  document.documentElement.setAttribute('data-cms-preview', '1');

  // Vô hiệu hoá điều hướng để admin không mất iframe khi click thử.
  document.addEventListener(
    'click',
    (e) => {
      const a = (e.target as Element)?.closest?.('a[href]');
      if (a) e.preventDefault();
    },
    true,
  );
  document.addEventListener('submit', (e) => e.preventDefault(), true);

  window.addEventListener('message', (e: MessageEvent) => {
    if (e.origin !== location.origin) return;
    const m = e.data;
    if (!m || typeof m !== 'object') return;
    switch (m.type) {
      case 'patch':
        applyPatch(String(m.key), String(m.value ?? ''));
        break;
      case 'img':
        applyImg(String(m.key), String(m.src ?? ''));
        break;
      case 'section':
        applySection(String(m.id), !!m.on);
        break;
      case 'reorder':
        if (Array.isArray(m.order)) applyReorder(m.order.map(String));
        break;
      case 'scrollTo':
        if (m.key) scrollToTarget(`[data-cms="${(window as any).CSS?.escape?.(m.key) ?? m.key}"]`);
        else if (m.id) scrollToTarget(`[data-cms-section="${m.id}"]`);
        break;
    }
  });

  // Báo admin biết iframe đã sẵn sàng (để gửi snapshot trạng thái hiện tại).
  try {
    parent.postMessage({ type: 'cms-ready', href: location.pathname }, location.origin);
  } catch {
    /* noop */
  }
}

export {};
