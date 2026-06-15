// Chia sẻ bài viết — Web Share API với fallback copy-link + toast nhẹ.
// Dùng bởi ShareRow.astro (Studio). Không phụ thuộc shop-store (khác phần).

/** Toast tối giản cho Studio, auto-fade. An toàn gọi nhiều lần. */
export function studioToast(message: string): void {
  if (typeof document === 'undefined') return;
  let host = document.getElementById('studio-toast');
  if (!host) {
    host = document.createElement('div');
    host.id = 'studio-toast';
    host.setAttribute('role', 'status');
    host.setAttribute('aria-live', 'polite');
    host.style.cssText =
      'position:fixed;left:50%;bottom:28px;transform:translateX(-50%) translateY(8px);' +
      'z-index:1200;background:var(--bark,#2a2118);color:var(--bone,#f4efe6);' +
      'font-family:var(--font-mono,monospace);font-size:12px;letter-spacing:0.06em;' +
      'padding:12px 18px;border-radius:2px;opacity:0;transition:opacity .25s,transform .25s;' +
      'pointer-events:none;max-width:88vw;text-align:center;';
    document.body.appendChild(host);
  }
  const el = host;
  el.textContent = message;
  // force reflow để transition chạy lại khi gọi liên tiếp
  void el.offsetWidth;
  el.style.opacity = '1';
  el.style.transform = 'translateX(-50%) translateY(0)';
  window.clearTimeout((el as any).__t);
  (el as any).__t = window.setTimeout(() => {
    el.style.opacity = '0';
    el.style.transform = 'translateX(-50%) translateY(8px)';
  }, 2200);
}

/** Sao chép URL vào clipboard. Trả về true nếu thành công. */
export async function copyLink(url: string): Promise<boolean> {
  try {
    if (navigator.clipboard?.writeText) {
      await navigator.clipboard.writeText(url);
      return true;
    }
  } catch {
    /* rơi xuống fallback */
  }
  // Fallback execCommand cho trình duyệt cũ / ngữ cảnh không bảo mật.
  try {
    const ta = document.createElement('textarea');
    ta.value = url;
    ta.setAttribute('readonly', '');
    ta.style.cssText = 'position:absolute;left:-9999px;top:0;';
    document.body.appendChild(ta);
    ta.select();
    const ok = document.execCommand('copy');
    document.body.removeChild(ta);
    return ok;
  } catch {
    return false;
  }
}

/** Gắn handler cho mọi [data-share] trong trang. */
export function initShareRows(): void {
  if (typeof document === 'undefined') return;
  document.querySelectorAll<HTMLElement>('[data-share]').forEach((row) => {
    const url = row.dataset.shareUrl || window.location.href;
    const title = row.dataset.shareTitle || document.title;

    const nativeBtn = row.querySelector<HTMLButtonElement>('[data-share-native]');
    const copyBtn = row.querySelector<HTMLButtonElement>('[data-share-copy]');

    // Web Share API: chỉ hiện nút native nếu trình duyệt hỗ trợ.
    if (nativeBtn) {
      if (typeof navigator.share === 'function') {
        nativeBtn.hidden = false;
        nativeBtn.addEventListener('click', async () => {
          try {
            await navigator.share({ title, url });
          } catch {
            /* user huỷ — bỏ qua */
          }
        });
      } else {
        nativeBtn.hidden = true;
      }
    }

    if (copyBtn) {
      copyBtn.addEventListener('click', async () => {
        const ok = await copyLink(url);
        studioToast(ok ? 'Đã sao chép liên kết' : 'Không sao chép được — hãy thử lại');
      });
    }
  });
}
