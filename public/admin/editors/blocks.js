/**
 * editors/blocks.js — Khối nội dung (Phase 2 page-builder) cho trang chủ Shop.
 * Thêm/xoá khối + sửa nội dung (form sinh từ schema block-types.js).
 * Vị trí & bật/tắt khối quản lý ở "Bố cục trang". Sửa nội dung khối hiện có
 * → xem trước trực tiếp (data-cms-key="blk.<id>.<field>").
 */
import { getFile, putFile } from '../github.js';
import { slugify, uniqueSlug } from '../lib/repeatable.js';
import { connectBody } from '../lib/preview-bus.js';
import { BLOCK_TYPES, blockSummary } from '../lib/block-types.js';

const FILE = 'src/data/shop-home.yml';
const BODY = 'editor-blocks-body';
const FOOTER = 'editor-blocks-footer';
const yaml = () => window.jsyaml;
const escVal = (v) => String(v ?? '').replace(/"/g, '&quot;');
const escTxt = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);
  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let obj;
  try {
    const { yamlString } = await getFile(token, FILE);
    obj = yaml().load(yamlString) || {};
  } catch (e) {
    body.innerHTML = `<div class="editor-error">Không tải được: ${escTxt(e.message)}</div>`;
    return;
  }

  let blocks = Array.isArray(obj.blocks) ? obj.blocks.map((b) => ({ ...b })) : [];

  function fieldHtml(blockId, f, value) {
    const cms = `blk.${blockId}.${f.key}`;
    const id = `blk_${blockId}_${f.key}`;
    let ctrl;
    if (f.type === 'area') {
      ctrl = `<textarea class="form-input form-textarea" id="${id}" data-key="${f.key}" data-cms-key="${cms}" rows="3" autocomplete="off">${escTxt(value)}</textarea>`;
    } else if (f.type === 'select') {
      const cur = String(value ?? '');
      ctrl = `<select class="form-input" id="${id}" data-key="${f.key}">
        ${f.options.map((o) => `<option value="${escVal(o.value)}"${o.value === cur ? ' selected' : ''}>${escTxt(o.label)}</option>`).join('')}
      </select>`;
    } else {
      ctrl = `<input class="form-input" type="text" id="${id}" data-key="${f.key}" data-cms-key="${cms}" value="${escVal(value)}" autocomplete="off" />`;
    }
    return `<div class="form-row">
      <label class="form-label" for="${id}">${f.label}</label>
      ${ctrl}
      ${f.hint ? `<p class="form-hint">${f.hint}</p>` : ''}
    </div>`;
  }

  function blockCard(b) {
    const t = BLOCK_TYPES[b.type];
    if (!t) return '';
    return `
      <div class="form-card blk-card" data-block-id="${escVal(b.id)}">
        <div class="blk-card-head">
          <p class="form-card-title" style="margin:0;">${escTxt(blockSummary(b))}</p>
          <button type="button" class="repeat-btn repeat-del blk-del" title="Xoá khối" aria-label="Xoá">🗑</button>
        </div>
        ${t.fields.map((f) => fieldHtml(b.id, f, b[f.key])).join('')}
      </div>`;
  }

  function renderList() {
    const list = body.querySelector('#blk-list');
    list.innerHTML = blocks.length
      ? blocks.map(blockCard).join('')
      : '<p class="form-hint">Chưa có khối nào. Bấm thêm khối ở trên — khối mới hiện ở cuối trang chủ Shop (đổi vị trí ở “Bố cục trang”).</p>';
    connectBody(body);
  }

  body.innerHTML = `
    <div class="panel-container">
      <div class="form-card">
        <p class="form-card-title">Thêm khối mới</p>
        <p class="form-hint" style="margin-top:0;">Chọn loại khối để thêm vào trang chủ Shop. Sau khi Lưu, vào “Bố cục trang” để kéo khối tới vị trí mong muốn.</p>
        <div class="blk-add-bar">
          ${Object.entries(BLOCK_TYPES).map(([type, t]) =>
            `<button type="button" class="btn btn-ghost btn-sm blk-add" data-type="${type}">${t.icon} ${escTxt(t.label)}</button>`).join('')}
        </div>
      </div>
      <div id="blk-list"></div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  footer.innerHTML = `
    <input class="form-input" id="commit-msg-blocks" value="quan-tri: khối nội dung — ${ts}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-blocks" disabled>💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-blocks');
  function setDirty(v) { saveBtn.disabled = !v; window.__adminSetDirty?.(v); }
  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };

  renderList();
  body.addEventListener('input', () => setDirty(true));
  body.addEventListener('change', () => setDirty(true));

  // Thêm khối
  body.querySelectorAll('.blk-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const t = BLOCK_TYPES[type];
      if (!t) return;
      const taken = blocks.map((b) => b.id);
      const id = uniqueSlug('b-' + (slugify(t.defaults.heading || t.label) || 'khoi'), taken);
      blocks.push({ id, type, ...t.defaults });
      renderList();
      setDirty(true);
    });
  });

  // Xoá khối (delegation)
  body.querySelector('#blk-list').addEventListener('click', (e) => {
    const del = e.target.closest('.blk-del');
    if (!del) return;
    const card = del.closest('.blk-card');
    const id = card.dataset.blockId;
    blocks = blocks.filter((b) => b.id !== id);
    renderList();
    setDirty(true);
  });

  // Lưu: gom field theo DOM → blocks[] + đồng bộ layout
  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const fresh = await getFile(token, FILE);
      const freshObj = yaml().load(fresh.yamlString) || {};

      const out = [...body.querySelectorAll('.blk-card')].map((card) => {
        const id = card.dataset.blockId;
        const base = blocks.find((b) => b.id === id) || {};
        const fields = {};
        card.querySelectorAll('[data-key]').forEach((el) => { fields[el.dataset.key] = el.value; });
        return { ...base, ...fields, id, type: base.type };
      });
      freshObj.blocks = out;

      // Đồng bộ layout: bỏ block đã xoá, thêm block mới (vào cuối), giữ section cố định.
      const ids = new Set(out.map((b) => b.id));
      let layout = Array.isArray(freshObj.layout) ? freshObj.layout : [];
      layout = layout.filter((it) => !(String(it.id).startsWith('b-') && !ids.has(it.id)));
      out.forEach((b) => { if (!layout.some((it) => it.id === b.id)) layout.push({ id: b.id, on: true }); });
      freshObj.layout = layout;

      const newYaml = yaml().dump(freshObj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-blocks').value.trim() || 'quan-tri: khối nội dung';
      const { commitUrl } = await putFile(token, FILE, newYaml, fresh.sha, msg);
      blocks = out;
      showToast(`✅ Đã lưu khối! Website cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      setDirty(false);
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'File đã được cập nhật bởi người khác. Tải lại trang và thử lại.'
        : `Không thể lưu: ${e.message}`;
      showToast(`❌ ${msg}`, 'error');
      saveBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });
}
