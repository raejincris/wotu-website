/**
 * editors/blocks.js — Khối nội dung (Phase 2 page-builder) cho 2 trang chủ (Shop + Studio).
 * Thêm/xoá khối + sửa nội dung (form sinh từ schema block-types.js).
 * Vị trí & bật/tắt khối quản lý ở "Bố cục trang". Sửa nội dung khối hiện có
 * → xem trước trực tiếp (data-cms-key="blk.<id>.<field>").
 */
import { getFile, putFile } from '../github.js';
import { slugify, uniqueSlug } from '../lib/repeatable.js';
import { connectBody } from '../lib/preview-bus.js';
import { imageSlot, attachAllImages, uploadPendingImages } from '../lib/imagefield.js';
import { BLOCK_TYPES, blockSummary } from '../lib/block-types.js';

const PAGES = {
  shop:   { label: 'Trang chủ Shop',   file: 'src/data/shop-home.yml', preview: 'https://www.wotu.vn/' },
  studio: { label: 'Trang chủ Studio', file: 'src/data/home.yml',      preview: 'https://www.wotu.vn/studio/' },
};
const BODY = 'editor-blocks-body';
const FOOTER = 'editor-blocks-footer';
const yaml = () => window.jsyaml;
const escVal = (v) => String(v ?? '').replace(/"/g, '&quot;');
const escTxt = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);
  footer.hidden = true;

  let pageKey = 'shop';
  let blocks = [];

  // 1 hàng ảnh trong bộ sưu tập (imageList): ô ảnh + alt + chú thích + xoá.
  // Không gắn cmsKey → ảnh bộ sưu tập cần Lưu mới hiện (tránh lệch index khi xoá/thêm).
  function imglistRow(it = {}) {
    return `<div class="blk-imglist-row">
      ${imageSlot('image', it.image, 'Ảnh')}
      <div class="blk-imglist-meta">
        <input class="form-input" type="text" data-field="alt" placeholder="Mô tả ảnh (alt) — cho SEO" value="${escVal(it.alt)}" autocomplete="off" />
        <input class="form-input" type="text" data-field="caption" placeholder="Chú thích hiển thị (tuỳ chọn)" value="${escVal(it.caption)}" autocomplete="off" />
      </div>
      <button type="button" class="repeat-btn repeat-del blk-imglist-del" title="Xoá ảnh" aria-label="Xoá ảnh">🗑</button>
    </div>`;
  }

  // 1 hàng trong danh sách nhóm field (list): các sub-field theo itemFields + nút xoá.
  function listRow(f, it = {}) {
    const inner = (f.itemFields || []).map((sf) => {
      if (sf.type === 'image') return imageSlot(sf.key, it[sf.key], sf.label);
      let ctrl;
      if (sf.type === 'area') {
        ctrl = `<textarea class="form-input form-textarea" data-field="${sf.key}" rows="2" autocomplete="off">${escTxt(it[sf.key])}</textarea>`;
      } else if (sf.type === 'select') {
        const cur = String(it[sf.key] ?? '');
        ctrl = `<select class="form-input" data-field="${sf.key}">${(sf.options || []).map((o) => `<option value="${escVal(o.value)}"${o.value === cur ? ' selected' : ''}>${escTxt(o.label)}</option>`).join('')}</select>`;
      } else {
        ctrl = `<input class="form-input" type="text" data-field="${sf.key}" value="${escVal(it[sf.key])}" autocomplete="off" />`;
      }
      return `<div class="form-row" style="margin:0">
        <label class="form-label">${sf.label}</label>
        ${ctrl}
        ${sf.hint ? `<p class="form-hint">${sf.hint}</p>` : ''}
      </div>`;
    }).join('');
    return `<div class="blk-list-row"><div class="blk-list-fields">${inner}</div><button type="button" class="repeat-btn repeat-del blk-list-del" title="Xoá" aria-label="Xoá">🗑</button></div>`;
  }

  function fieldHtml(blockId, f, value) {
    const cms = `blk.${blockId}.${f.key}`;
    const id = `blk_${blockId}_${f.key}`;
    if (f.type === 'image') {
      // imageSlot tự bọc .form-row; data-field = f.key (collect riêng), live-preview qua cmsKey.
      return imageSlot(f.key, value, f.label, cms);
    }
    if (f.type === 'imageList') {
      const items = Array.isArray(value) ? value : [];
      return `<div class="form-row">
        <label class="form-label">${f.label}</label>
        <div class="blk-imglist" data-key="${f.key}">${items.map((it) => imglistRow(it)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm blk-imglist-add">＋ Thêm ảnh</button>
        ${f.hint ? `<p class="form-hint">${f.hint}</p>` : ''}
      </div>`;
    }
    if (f.type === 'list') {
      const items = Array.isArray(value) ? value : [];
      return `<div class="form-row">
        <label class="form-label">${f.label}</label>
        <div class="blk-list" data-key="${f.key}">${items.map((it) => listRow(f, it)).join('')}</div>
        <button type="button" class="btn btn-ghost btn-sm blk-list-add" data-key="${f.key}">＋ ${escTxt(f.itemLabel || 'Thêm mục')}</button>
        ${f.hint ? `<p class="form-hint">${f.hint}</p>` : ''}
      </div>`;
    }
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

  const EMPTY_HTML = '<p class="form-hint blk-empty">Chưa có khối nào. Bấm thêm khối ở trên — khối mới hiện ở cuối trang (đổi vị trí ở “Bố cục trang”).</p>';

  // Append 1 card vào DOM (giữ nguyên các card sẵn có → không mất ảnh pending khi thêm/xoá).
  function appendCard(b) {
    const list = body.querySelector('#blk-list');
    list.querySelector('.blk-empty')?.remove();
    const wrap = document.createElement('div');
    wrap.innerHTML = blockCard(b);
    const card = wrap.firstElementChild;
    if (!card) return;
    list.appendChild(card);
    attachAllImages(card, () => setDirty(true));
  }

  function renderList() {
    const list = body.querySelector('#blk-list');
    list.innerHTML = '';
    if (!blocks.length) { list.innerHTML = EMPTY_HTML; return; }
    blocks.forEach(appendCard);
  }

  body.innerHTML = `
    <div class="panel-container">
      <div class="form-card">
        <p class="form-card-title">Chọn trang</p>
        <div class="lay-pagesel">
          <button type="button" class="lay-page active" data-page="shop">Trang chủ Shop</button>
          <button type="button" class="lay-page" data-page="studio">Trang chủ Studio</button>
        </div>
      </div>
      <div class="form-card">
        <p class="form-card-title">Thêm khối mới</p>
        <p class="form-hint" style="margin-top:0;">Chọn loại khối để thêm vào <b id="blk-pagename">trang chủ shop</b>. Sau khi Lưu, vào “Bố cục trang” để kéo khối tới vị trí mong muốn.</p>
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
  let dirty = false;
  function setDirty(v) { dirty = v; saveBtn.disabled = !v; window.__adminSetDirty?.(v); }
  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };

  connectBody(body); // 1 lần trên body — event delegation phủ cả card thêm sau
  body.addEventListener('input', () => setDirty(true));
  body.addEventListener('change', () => setDirty(true));

  // Tải khối của trang đang chọn → render lại danh sách + chuyển iframe preview.
  async function loadPage() {
    const page = PAGES[pageKey];
    const list = body.querySelector('#blk-list');
    list.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
    try {
      const { yamlString } = await getFile(token, page.file);
      const obj = yaml().load(yamlString) || {};
      blocks = Array.isArray(obj.blocks) ? obj.blocks.map((b) => ({ ...b })) : [];
    } catch (e) {
      list.innerHTML = `<div class="editor-error">Không tải được: ${escTxt(e.message)}</div>`;
      return;
    }
    const nameEl = body.querySelector('#blk-pagename');
    if (nameEl) nameEl.textContent = page.label.toLowerCase();
    renderList();
    window.__previewSetUrl?.(page.preview); // chuyển iframe sang trang tương ứng
    setDirty(false);
  }

  // Page selector (Shop / Studio)
  body.querySelectorAll('.lay-page').forEach((btn) => {
    btn.addEventListener('click', async () => {
      if (btn.dataset.page === pageKey) return;
      if (dirty && !confirm('Có thay đổi chưa lưu ở trang này. Chuyển trang sẽ mất thay đổi. Tiếp tục?')) return;
      body.querySelectorAll('.lay-page').forEach((x) => x.classList.remove('active'));
      btn.classList.add('active');
      pageKey = btn.dataset.page;
      await loadPage();
    });
  });

  // Thêm khối — append card mới, giữ nguyên các card đang sửa dở
  body.querySelectorAll('.blk-add').forEach((btn) => {
    btn.addEventListener('click', () => {
      const type = btn.dataset.type;
      const t = BLOCK_TYPES[type];
      if (!t) return;
      const taken = blocks.map((b) => b.id);
      const id = uniqueSlug('b-' + (slugify(t.defaults.heading || t.label) || 'khoi'), taken);
      const b = { id, type, ...t.defaults };
      blocks.push(b);
      appendCard(b);
      setDirty(true);
    });
  });

  // Delegation: thêm/xoá ảnh bộ sưu tập + xoá cả khối
  body.querySelector('#blk-list').addEventListener('click', (e) => {
    // Xoá 1 ảnh trong bộ sưu tập
    const delImg = e.target.closest('.blk-imglist-del');
    if (delImg) { delImg.closest('.blk-imglist-row')?.remove(); setDirty(true); return; }

    // Thêm 1 ảnh vào bộ sưu tập
    const addImg = e.target.closest('.blk-imglist-add');
    if (addImg) {
      const list = addImg.parentElement.querySelector('.blk-imglist');
      if (list) {
        const wrap = document.createElement('div');
        wrap.innerHTML = imglistRow();
        const row = wrap.firstElementChild;
        list.appendChild(row);
        attachAllImages(row, () => setDirty(true));
        setDirty(true);
      }
      return;
    }

    // Xoá 1 hàng trong danh sách nhóm (list)
    const delList = e.target.closest('.blk-list-del');
    if (delList) { delList.closest('.blk-list-row')?.remove(); setDirty(true); return; }

    // Thêm 1 hàng vào danh sách nhóm (list)
    const addList = e.target.closest('.blk-list-add');
    if (addList) {
      const card = addList.closest('.blk-card');
      const base = blocks.find((b) => b.id === card.dataset.blockId);
      const f = (BLOCK_TYPES[base?.type]?.fields || []).find((x) => x.key === addList.dataset.key);
      const listEl = addList.parentElement.querySelector(`.blk-list[data-key="${addList.dataset.key}"]`);
      if (f && listEl) {
        const wrap = document.createElement('div');
        wrap.innerHTML = listRow(f);
        const row = wrap.firstElementChild;
        listEl.appendChild(row);
        attachAllImages(row, () => setDirty(true)); // phòng khi itemFields có ảnh
        setDirty(true);
      }
      return;
    }

    // Xoá cả khối — chỉ gỡ node, không re-render (giữ ảnh pending card khác)
    const del = e.target.closest('.blk-del');
    if (!del) return;
    const card = del.closest('.blk-card');
    const id = card.dataset.blockId;
    blocks = blocks.filter((b) => b.id !== id);
    card.remove();
    if (!blocks.length) body.querySelector('#blk-list').innerHTML = EMPTY_HTML;
    setDirty(true);
  });

  // Lưu: gom field theo DOM → blocks[] + đồng bộ layout
  saveBtn.addEventListener('click', async () => {
    const file = PAGES[pageKey].file;
    setLoading(true);
    saveBtn.disabled = true;
    const msg = footer.querySelector('#commit-msg-blocks').value.trim() || 'quan-tri: khối nội dung';
    try {
      // Upload ảnh đang chờ trước → hidden input nhận path /uploads/blocks/…
      await uploadPendingImages({ token, scope: body, area: 'blocks', msg, onStatus: () => setLoading(true) });

      const fresh = await getFile(token, file);
      const freshObj = yaml().load(fresh.yamlString) || {};

      // Gom theo schema (không quét DOM mù) → imageList & image lồng nhau không lẫn.
      const out = [...body.querySelectorAll('.blk-card')].map((card) => {
        const id = card.dataset.blockId;
        const base = blocks.find((b) => b.id === id) || {};
        const t = BLOCK_TYPES[base.type];
        const fields = {};
        (t?.fields || []).forEach((f) => {
          if (f.type === 'imageList') {
            const list = card.querySelector(`.blk-imglist[data-key="${f.key}"]`);
            fields[f.key] = list
              ? [...list.querySelectorAll('.blk-imglist-row')].map((row) => {
                  const o = {};
                  row.querySelectorAll('[data-field]').forEach((el) => { o[el.dataset.field] = el.value; });
                  return o;
                }).filter((o) => o.image)
              : [];
          } else if (f.type === 'list') {
            const list = card.querySelector(`.blk-list[data-key="${f.key}"]`);
            fields[f.key] = list
              ? [...list.querySelectorAll('.blk-list-row')].map((row) => {
                  const o = {};
                  row.querySelectorAll('[data-field]').forEach((el) => { o[el.dataset.field] = el.value; });
                  return o;
                }).filter((o) => Object.values(o).some((v) => String(v).trim()))
              : [];
          } else if (f.type === 'image') {
            const el = card.querySelector(`.img-slot input[data-photo][data-field="${f.key}"]`);
            fields[f.key] = el ? el.value : '';
          } else {
            const el = card.querySelector(`[data-key="${f.key}"]`);
            if (el) fields[f.key] = el.value;
          }
        });
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
      const { commitUrl } = await putFile(token, file, newYaml, fresh.sha, msg);
      blocks = out;
      showToast(`✅ Đã lưu khối! Website cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      setDirty(false);
    } catch (e) {
      const errMsg = e.message === 'FILE_CONFLICT'
        ? 'File đã được cập nhật bởi người khác. Tải lại trang và thử lại.'
        : `Không thể lưu: ${e.message}`;
      showToast(`❌ ${errMsg}`, 'error');
      saveBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });

  await loadPage(); // tải trang mặc định (Shop)
}
