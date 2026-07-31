/**
 * lib/drafts.js — Hàng đợi "Lưu nháp" (chưa đăng) cho Custom Admin.
 *
 * Mỗi lần editor "Lưu" → ghi vào đây (localStorage) thay vì commit thẳng lên
 * GitHub. Khi user bấm "Đăng lên web" → gom tất cả nháp commit 1 lần (1 build CF).
 *
 * Mỗi entry keyed theo path file:
 *   { type: 'text',   content: '<yaml string>', baseSha, savedAt }
 *   { type: 'binary', content: '<base64 thô của ảnh>', baseSha, savedAt }
 *   { type: 'delete', baseSha, savedAt }
 *
 * `baseSha` = sha blob của file trên repo **lúc editor mở nó ra sửa** — mốc để
 * lúc Đăng biết file trên web có bị người/phiên khác đổi trong lúc nháp nằm chờ
 * hay không (xem `checkDraftConflicts` trong github.js). Nháp cũ tạo trước khi
 * có trường này → `baseSha: null` → coi như "không rõ mốc" và vẫn cảnh báo.
 * ⚠️ baseSha GIỮ NGUYÊN qua các lần lưu tiếp theo: mốc là bản mà người sửa đã
 * NHÌN THẤY, không phải lần bấm Lưu gần nhất.
 *
 * Phát sự kiện 'wotu-drafts-changed' mỗi lần đổi để app.js cập nhật badge.
 */

const KEY = 'wotu-admin-drafts-v1';

function read() {
  try { return JSON.parse(localStorage.getItem(KEY) || '{}'); }
  catch { return {}; }
}

function write(obj) {
  try {
    localStorage.setItem(KEY, JSON.stringify(obj));
  } catch {
    throw new Error('Bộ nhớ nháp đã đầy — hãy bấm "Đăng lên web" để xuất bản và giải phóng.');
  }
  window.dispatchEvent(new CustomEvent('wotu-drafts-changed'));
}

/** Ghi 1 entry, giữ `baseSha` của lần lưu ĐẦU nếu đã có. */
function put(path, entry, baseSha) {
  const o = read();
  const prev = o[path];
  o[path] = {
    ...entry,
    baseSha: prev && prev.baseSha !== undefined && prev.baseSha !== null ? prev.baseSha : (baseSha ?? null),
    savedAt: Date.now(),
  };
  write(o);
}

export function setTextDraft(path, content, baseSha) {
  put(path, { type: 'text', content }, baseSha);
}
export function setBinaryDraft(path, content, baseSha) {
  put(path, { type: 'binary', content }, baseSha);
}
export function setDeleteDraft(path, baseSha) {
  put(path, { type: 'delete' }, baseSha);
}
export function getDraft(path) {
  return read()[path] || null;
}
export function listDrafts() {
  const o = read();
  return Object.keys(o).map((p) => ({ path: p, ...o[p] }));
}
export function draftCount() {
  return Object.keys(read()).length;
}
export function clearDrafts() {
  localStorage.removeItem(KEY);
  window.dispatchEvent(new CustomEvent('wotu-drafts-changed'));
}
/** Bỏ nháp của một số file (dùng khi user chọn "giữ bản trên web"). */
export function dropDrafts(paths) {
  const o = read();
  paths.forEach((p) => { delete o[p]; });
  write(o);
}
