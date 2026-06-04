/**
 * lib/drafts.js — Hàng đợi "Lưu nháp" (chưa đăng) cho Custom Admin.
 *
 * Mỗi lần editor "Lưu" → ghi vào đây (localStorage) thay vì commit thẳng lên
 * GitHub. Khi user bấm "Đăng lên web" → gom tất cả nháp commit 1 lần (1 build CF).
 *
 * Mỗi entry keyed theo path file:
 *   { type: 'text',   content: '<yaml string>' }
 *   { type: 'binary', content: '<base64 thô của ảnh>' }
 *   { type: 'delete' }
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

export function setTextDraft(path, content) {
  const o = read(); o[path] = { type: 'text', content }; write(o);
}
export function setBinaryDraft(path, content) {
  const o = read(); o[path] = { type: 'binary', content }; write(o);
}
export function setDeleteDraft(path) {
  const o = read(); o[path] = { type: 'delete' }; write(o);
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
