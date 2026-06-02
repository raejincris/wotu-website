/**
 * editors/layout.js — Bố cục trang: bật/tắt + sắp xếp section của 2 trang chủ.
 * Ghi `layout: [{id,on}]` vào shop-home.yml / home.yml. Xem trước trực tiếp:
 * bật/tắt → ẩn/hiện section trong iframe; ↑↓ → đổi thứ tự ngay.
 */

import { getFile, putFile } from '../github.js';
import { section as pvSection, reorder as pvReorder, setReadyHook } from '../lib/preview-bus.js';

const BODY = 'editor-layout-body';
const FOOTER = 'editor-layout-footer';
const yaml = () => window.jsyaml;
const escVal = (v) => String(v ?? '').replace(/"/g, '&quot;');
const escTxt = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

const PAGES = {
  shop: {
    label: 'Trang chủ Shop',
    file: 'src/data/shop-home.yml',
    preview: 'https://www.wotu.vn/',
    defaults: ['combos', 'bestsellers', 'inspo', 'whyUs', 'reviews', 'cta', 'newsletter'],
    labels: {
      combos: 'Combo nội thất', bestsellers: 'Sản phẩm bán chạy', inspo: 'Phòng cảm hứng',
      whyUs: 'Cam kết (Why Us)', reviews: 'Đánh giá khách hàng', cta: 'CTA liên hệ',
      newsletter: 'Đăng ký nhận tin',
    },
  },
  studio: {
    label: 'Trang chủ Studio',
    file: 'src/data/home.yml',
    preview: 'https://www.wotu.vn/studio/',
    defaults: ['philosophy', 'services', 'projects', 'process', 'about', 'quote', 'contact'],
    labels: {
      philosophy: 'Triết lý', services: 'Dịch vụ', projects: 'Dự án', process: 'Quy trình',
      about: 'Giới thiệu', quote: 'Trích dẫn', contact: 'Liên hệ',
    },
  },
};

/** Hợp nhất layout đã lưu với defaults (bổ sung id thiếu, bỏ id lạ). */
function resolveRows(savedLayout, page) {
  const saved = Array.isArray(savedLayout) ? savedLayout.filter((s) => s && page.labels[s.id]) : [];
  const seen = new Set(saved.map((s) => s.id));
  const rows = saved.map((s) => ({ id: s.id, on: s.on !== false }));
  page.defaults.forEach((id) => { if (!seen.has(id)) rows.push({ id, on: true }); });
  return rows;
}

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);
  let pageKey = 'shop';
  let obj = null;
  let sha = null;

  footer.hidden = true;

  // Trạng thái hiện tại của các row → để đẩy sang preview.
  function currentRows() {
    return [...body.querySelectorAll('.lay-row')].map((r) => ({
      id: r.dataset.id,
      on: r.querySelector('.lay-toggle').checked,
    }));
  }

  function pushPreview() {
    const rows = currentRows();
    pvReorder(rows.map((r) => r.id));
    rows.forEach((r) => pvSection(r.id, r.on));
  }
  // Khi iframe (re)load xong → đẩy lại trạng thái.
  setReadyHook(pushPreview);

  function rowHtml(r, page, i) {
    return `
      <div class="lay-row" data-id="${escVal(r.id)}">
        <span class="lay-ord">${i + 1}</span>
        <label class="lay-name">
          <input type="checkbox" class="lay-toggle" ${r.on ? 'checked' : ''} />
          <span>${escTxt(page.labels[r.id] || r.id)}</span>
        </label>
        <span class="lay-ctrls">
          <button type="button" class="repeat-btn" data-act="up" title="Lên" aria-label="Lên">↑</button>
          <button type="button" class="repeat-btn" data-act="down" title="Xuống" aria-label="Xuống">↓</button>
        </span>
      </div>`;
  }

  function renderRows() {
    const page = PAGES[pageKey];
    const rows = resolveRows(obj.layout, page);
    body.querySelector('#lay-list').innerHTML = rows.map((r, i) => rowHtml(r, page, i)).join('');
  }

  function renumber() {
    body.querySelectorAll('.lay-row .lay-ord').forEach((el, i) => { el.textContent = i + 1; });
  }

  async function loadPage() {
    const page = PAGES[pageKey];
    body.querySelector('#lay-list').innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
    try {
      const res = await getFile(token, page.file);
      sha = res.sha;
      obj = yaml().load(res.yamlString) || {};
    } catch (e) {
      body.querySelector('#lay-list').innerHTML = `<div class="editor-error">Không tải được: ${escTxt(e.message)}</div>`;
      return;
    }
    renderRows();
    window.__previewSetUrl?.(page.preview); // chuyển iframe sang trang tương ứng
    setDirty(false);
  }

  // ── Dirty ──
  let dirty = false;
  function setDirty(v) {
    dirty = v;
    const sv = footer.querySelector('#save-layout');
    if (sv) sv.disabled = !v;
    window.__adminSetDirty?.(v);
  }

  // ── Shell ──
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
        <p class="form-card-title">Các section — bật/tắt &amp; sắp xếp</p>
        <p class="form-hint" style="margin-top:0;">Bỏ tick để ẩn section khỏi trang. Dùng ↑↓ để đổi thứ tự. Hero &amp; Marquee cố định, không nằm ở đây.</p>
        <div id="lay-list" class="lay-list"></div>
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2, '0')}:${String(now.getMinutes()).padStart(2, '0')} ${String(now.getDate()).padStart(2, '0')}/${String(now.getMonth() + 1).padStart(2, '0')}`;
  footer.innerHTML = `
    <input class="form-input" id="commit-msg-layout" value="quan-tri: bố cục trang — ${ts}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-layout" disabled>💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  // Page selector
  body.querySelectorAll('.lay-page').forEach((b) => {
    b.addEventListener('click', async () => {
      if (b.dataset.page === pageKey) return;
      if (dirty && !confirm('Có thay đổi chưa lưu ở trang này. Chuyển trang sẽ mất thay đổi. Tiếp tục?')) return;
      body.querySelectorAll('.lay-page').forEach((x) => x.classList.remove('active'));
      b.classList.add('active');
      pageKey = b.dataset.page;
      await loadPage();
    });
  });

  // Toggle + reorder (event delegation)
  const list = body.querySelector('#lay-list');
  list.addEventListener('change', (e) => {
    if (e.target.classList.contains('lay-toggle')) {
      const row = e.target.closest('.lay-row');
      pvSection(row.dataset.id, e.target.checked);
      setDirty(true);
    }
  });
  list.addEventListener('click', (e) => {
    const btn = e.target.closest('.repeat-btn');
    if (!btn) return;
    const row = btn.closest('.lay-row');
    if (btn.dataset.act === 'up' && row.previousElementSibling) list.insertBefore(row, row.previousElementSibling);
    else if (btn.dataset.act === 'down' && row.nextElementSibling) list.insertBefore(row.nextElementSibling, row);
    else return;
    renumber();
    pvReorder(currentRows().map((r) => r.id));
    setDirty(true);
  });

  // Save
  const saveBtn = footer.querySelector('#save-layout');
  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };
  saveBtn.addEventListener('click', async () => {
    const page = PAGES[pageKey];
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const fresh = await getFile(token, page.file);
      const freshObj = yaml().load(fresh.yamlString) || {};
      freshObj.layout = currentRows();
      const newYaml = yaml().dump(freshObj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-layout').value.trim() || `quan-tri: bố cục ${page.label}`;
      const { commitUrl } = await putFile(token, page.file, newYaml, fresh.sha, msg);
      obj = freshObj;
      showToast(`✅ Đã lưu bố cục! Website cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
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

  await loadPage();
}
