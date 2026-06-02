/**
 * lib/preview-bus.js — cầu nối admin ↔ iframe xem trước.
 *
 * app.js gọi setIframe(el) khi mở pane. Editor gọi connectBody(body) sau khi
 * dựng form: mỗi input có `data-cms-key` sẽ bắn patch sang iframe khi gõ.
 * Khi iframe báo 'cms-ready' (vừa tải xong), tự resync toàn bộ field hiện tại
 * để phủ nội dung đang sửa lên bản đã deploy.
 */

let iframe = null;
let currentBody = null;
let readyHook = null;

/** Editor đăng ký callback chạy mỗi khi iframe (re)load xong — đẩy lại trạng thái. */
export function setReadyHook(fn) { readyHook = fn; }

function post(msg) {
  try {
    iframe?.contentWindow?.postMessage(msg, location.origin);
  } catch {
    /* iframe chưa sẵn sàng — bỏ qua */
  }
}

export function setIframe(el) { iframe = el; }

export function patch(key, value) { if (key) post({ type: 'patch', key, value: value ?? '' }); }
export function img(key, src)     { if (key) post({ type: 'img', key, src: src ?? '' }); }
export function section(id, on)   { if (id)  post({ type: 'section', id, on: !!on }); }
export function reorder(order)    { if (Array.isArray(order)) post({ type: 'reorder', order }); }
export function scrollTo(target)  { post({ type: 'scrollTo', ...target }); }

export function resync() {
  if (!currentBody) return;
  currentBody.querySelectorAll('[data-cms-key]').forEach((el) => {
    patch(el.dataset.cmsKey, el.value);
  });
  currentBody.querySelectorAll('[data-cms-img-key]').forEach((el) => {
    const v = el.dataset.cmsImgSrc || el.value || '';
    if (v) img(el.dataset.cmsImgKey, v);
  });
}

function onInput(e) {
  const el = e.target.closest?.('[data-cms-key]');
  if (el) patch(el.dataset.cmsKey, el.value);
}

export function connectBody(body) {
  if (!body) return;
  currentBody = body;
  body.addEventListener('input', onInput);
  resync(); // iframe có thể đã ready từ trước
}

export function disconnect() {
  if (currentBody) currentBody.removeEventListener('input', onInput);
  currentBody = null;
  readyHook = null;
}

// iframe báo đã tải xong → đẩy lại trạng thái hiện tại.
window.addEventListener('message', (e) => {
  if (e.origin !== location.origin) return;
  if (e.data?.type === 'cms-ready') { resync(); readyHook?.(); }
});
