/**
 * editors/pages.js — Trang tuỳ chỉnh (page-builder Phase 3).
 * Tạo / xoá trang đứng riêng + sửa thông tin (tiêu đề, mô tả, kiểu, menu).
 * Mỗi trang = 1 file src/data/pages/<slug>.yml (title/description/template/nav/layout/blocks).
 * Nội dung (khối) sửa ở mục "Khối nội dung" → chọn trang tương ứng trong page switcher.
 * Route động src/pages/[page].astro tự build từng trang + vào sitemap;
 * trang nav:true tự lên menu (Nav đọc src/lib/custom-pages.ts).
 */
import { getFile, putFile, getFileMeta, listDir, deleteFile } from '../github.js';
import { slugify } from '../lib/repeatable.js';

const DIR = 'src/data/pages';
const BODY = 'editor-pages-body';
const FOOTER = 'editor-pages-footer';
const yaml = () => window.jsyaml;
const escVal = (v) => String(v ?? '').replace(/"/g, '&quot;');
const escTxt = (s) => String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');

// Slug đã dùng cho trang/route hệ thống — không cho đặt trùng (sẽ đụng build).
const RESERVED = new Set([
  '', 'san-pham', 'combo', 'studio', 'yeu-thich', 'tim-kiem', 'bao-mat', 'admin',
  '404', 'index', 'og', 'fonts', 'uploads', 'logo', 'logo-light', 'favicon', 'robots', 'sitemap',
]);

const TEMPLATES = [
  { value: 'shop', label: 'Shop (kem + terracotta)' },
  { value: 'studio', label: 'Studio (editorial ấm)' },
];

const dump = (obj) => yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);
  footer.hidden = true; // mỗi trang có nút Lưu riêng
  window.__adminSaveFn = () => {};

  const dirtySet = new Set();
  function setDirty(slug, v) {
    if (v) dirtySet.add(slug); else dirtySet.delete(slug);
    window.__adminSetDirty?.(dirtySet.size > 0);
  }

  function templateSelect(name, cur) {
    return `<select class="form-input" data-k="${name}">
      ${TEMPLATES.map((t) => `<option value="${t.value}"${t.value === cur ? ' selected' : ''}>${escTxt(t.label)}</option>`).join('')}
    </select>`;
  }

  function pageCard(slug, obj) {
    const tmpl = obj.template === 'studio' ? 'studio' : 'shop';
    const nav = obj.nav ? 'yes' : 'no';
    return `
      <div class="form-card blk-card" data-slug="${escVal(slug)}">
        <div class="blk-card-head">
          <p class="form-card-title" style="margin:0;">📄 /${escTxt(slug)}/</p>
          <span style="display:flex;gap:8px;">
            <a class="btn btn-ghost btn-sm" href="https://www.wotu.vn/${escVal(slug)}/" target="_blank" rel="noopener">Mở ↗</a>
            <button type="button" class="repeat-btn repeat-del pg-del" title="Xoá trang" aria-label="Xoá trang">🗑</button>
          </span>
        </div>
        <div class="form-row">
          <label class="form-label">Tiêu đề trang</label>
          <input class="form-input" type="text" data-k="title" value="${escVal(obj.title)}" autocomplete="off" />
        </div>
        <div class="form-row">
          <label class="form-label">Mô tả (SEO)</label>
          <textarea class="form-input form-textarea" data-k="description" rows="2" autocomplete="off">${escTxt(obj.description)}</textarea>
        </div>
        <div class="form-row">
          <label class="form-label">Kiểu giao diện</label>
          ${templateSelect('template', tmpl)}
          <p class="form-hint">Shop dùng Nav/Footer + palette Shop; Studio dùng Nav/Footer + palette Studio.</p>
        </div>
        <div class="form-row">
          <label class="form-label">Hiện trên menu</label>
          <select class="form-input" data-k="nav">
            <option value="yes"${nav === 'yes' ? ' selected' : ''}>Có — thêm vào menu</option>
            <option value="no"${nav === 'no' ? ' selected' : ''}>Không</option>
          </select>
        </div>
        <p class="form-hint">✏️ Sửa <b>nội dung</b> (các khối) ở mục “Khối nội dung” → chọn trang này trong danh sách trang.</p>
        <div style="margin-top:10px;text-align:right;">
          <button type="button" class="btn btn-primary btn-sm pg-save">💾 Lưu thông tin</button>
        </div>
      </div>`;
  }

  function shell(cards) {
    body.innerHTML = `
      <div class="panel-container">
        <div class="form-card">
          <p class="form-card-title">Tạo trang mới</p>
          <p class="form-hint" style="margin-top:0;">Tạo một trang đứng riêng (vd <code>/uu-dai-tet/</code>). Sau khi tạo, thêm nội dung ở “Khối nội dung”.</p>
          <div class="form-row">
            <label class="form-label">Đường dẫn (slug)</label>
            <input class="form-input" id="pg-new-slug" type="text" placeholder="vd: uu-dai-tet" autocomplete="off" />
            <p class="form-hint">Chỉ chữ thường, số và dấu gạch ngang. Trang sẽ ở <code>wotu.vn/&lt;slug&gt;/</code></p>
          </div>
          <div class="form-row">
            <label class="form-label">Tiêu đề</label>
            <input class="form-input" id="pg-new-title" type="text" placeholder="vd: Ưu đãi Tết" autocomplete="off" />
          </div>
          <div class="form-row">
            <label class="form-label">Kiểu giao diện</label>
            ${templateSelect('pg-new-template', 'shop')}
          </div>
          <div style="text-align:right;">
            <button type="button" class="btn btn-primary" id="pg-create">＋ Tạo trang</button>
          </div>
        </div>
        <p class="form-card-title" style="margin:4px 0 0;">Các trang đã tạo</p>
        <div id="pg-list">${cards || '<p class="form-hint">Chưa có trang tuỳ chỉnh nào.</p>'}</div>
      </div>`;
  }

  // ── Load danh sách trang ──
  async function reload() {
    body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
    let files;
    try {
      files = (await listDir(token, DIR)).filter((f) => f.type === 'file' && f.name.endsWith('.yml'));
    } catch (e) {
      body.innerHTML = `<div class="editor-error">Không tải được danh sách trang: ${escTxt(e.message)}</div>`;
      return;
    }
    const pages = [];
    for (const f of files) {
      const slug = f.name.replace(/\.yml$/, '');
      try {
        const { yamlString } = await getFile(token, f.path);
        pages.push({ slug, obj: yaml().load(yamlString) || {} });
      } catch { /* bỏ qua file lỗi */ }
    }
    pages.sort((a, b) => a.slug.localeCompare(b.slug));
    shell(pages.map((p) => pageCard(p.slug, p.obj)).join(''));
    wire(pages.map((p) => p.slug));
    dirtySet.clear();
    window.__adminSetDirty?.(false);
  }

  // ── Wire sự kiện sau mỗi lần render ──
  function wire(slugs) {
    body.querySelector('#pg-create').addEventListener('click', createPage);

    body.querySelectorAll('.blk-card[data-slug]').forEach((card) => {
      const slug = card.dataset.slug;
      card.addEventListener('input', () => setDirty(slug, true));
      card.addEventListener('change', () => setDirty(slug, true));
      card.querySelector('.pg-save').addEventListener('click', () => savePage(slug, card));
      card.querySelector('.pg-del').addEventListener('click', () => deletePage(slug));
    });
  }

  // ── Tạo trang ──
  async function createPage() {
    const slugRaw = body.querySelector('#pg-new-slug').value;
    const slug = slugify(slugRaw);
    const title = body.querySelector('#pg-new-title').value.trim();
    const template = body.querySelector('[data-k="pg-new-template"]').value === 'studio' ? 'studio' : 'shop';

    if (!slug) { showToast('❌ Đường dẫn không hợp lệ (chỉ chữ thường, số, gạch ngang).', 'error'); return; }
    if (RESERVED.has(slug)) { showToast(`❌ “${slug}” trùng trang hệ thống — chọn đường dẫn khác.`, 'error'); return; }

    setLoading(true);
    try {
      const path = `${DIR}/${slug}.yml`;
      const exists = await getFileMeta(token, path);
      if (exists) { showToast(`❌ Trang “/${slug}/” đã tồn tại.`, 'error'); return; }
      const obj = { title: title || slug, description: '', template, nav: true, layout: [], blocks: [] };
      await putFile(token, path, dump(obj), undefined, `quan-tri: tạo trang ${slug}`);
      showToast(`✅ Đã tạo trang “/${slug}/”! Thêm nội dung ở “Khối nội dung”. Website cập nhật ~1 phút.`, 'success');
      await reload();
    } catch (e) {
      showToast(`❌ Không tạo được trang: ${escTxt(e.message)}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Lưu thông tin 1 trang (giữ nguyên layout/blocks) ──
  async function savePage(slug, card) {
    setLoading(true);
    try {
      const path = `${DIR}/${slug}.yml`;
      const fresh = await getFile(token, path);
      const obj = yaml().load(fresh.yamlString) || {};
      obj.title = card.querySelector('[data-k="title"]').value.trim() || slug;
      obj.description = card.querySelector('[data-k="description"]').value.trim();
      obj.template = card.querySelector('[data-k="template"]').value === 'studio' ? 'studio' : 'shop';
      obj.nav = card.querySelector('[data-k="nav"]').value === 'yes';
      const { commitUrl } = await putFile(token, path, dump(obj), fresh.sha, `quan-tri: trang ${slug}`);
      setDirty(slug, false);
      showToast(`✅ Đã lưu trang “/${slug}/”. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'Trang đã được cập nhật bởi người khác. Tải lại và thử lại.'
        : escTxt(e.message);
      showToast(`❌ Không lưu được: ${msg}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  // ── Xoá trang ──
  async function deletePage(slug) {
    if (!confirm(`Xoá trang “/${slug}/”? Trang sẽ biến mất khỏi website (có thể khôi phục bằng revert commit trên GitHub).`)) return;
    setLoading(true);
    try {
      const path = `${DIR}/${slug}.yml`;
      const meta = await getFileMeta(token, path);
      if (!meta) { showToast('❌ Không tìm thấy trang.', 'error'); return; }
      const { commitUrl } = await deleteFile(token, path, meta.sha, `quan-tri: xoá trang ${slug}`);
      setDirty(slug, false);
      showToast(`✅ Đã xoá trang “/${slug}/”. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      await reload();
    } catch (e) {
      showToast(`❌ Không xoá được: ${escTxt(e.message)}`, 'error');
    } finally {
      setLoading(false);
    }
  }

  await reload();
}
