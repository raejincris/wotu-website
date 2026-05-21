/**
 * editors/home-hero.js — Trang chủ Studio (src/data/home.yml)
 * Fields: hero.eyebrow, hero.title, hero.intro, hero.cta
 *         quote.text, quote.author, quote.year
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/home.yml';
const BODY = 'editor-home-hero-body';
const FOOTER = 'editor-home-hero-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function field(id, label, value, type = 'text', hint = '') {
  const isTextarea = type === 'textarea';
  const content = isTextarea
    ? `<textarea class="form-input form-textarea" id="${id}" name="${id}"
                 autocomplete="off" rows="3">${String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>`
    : `<input class="form-input" id="${id}" name="${id}" type="${type}"
              value="${escVal(value)}" autocomplete="off" />`;
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      ${content}
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

export async function init({ token, showToast, setLoading }) {
  const body   = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try {
    ({ yamlString: data, sha } = await getFile(token, FILE));
  } catch (e) {
    body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`;
    return;
  }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) {
    body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`;
    return;
  }

  const h = obj.hero || {};
  const q = obj.quote || {};

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Hero — phần đầu trang Studio</p>
      ${field('hero_eyebrow', 'Dòng nhỏ (eyebrow)', h.eyebrow, 'text',
        'VD: Studio · Thiết kế &amp; Thi công nội thất Quy Nhơn')}
      ${field('hero_title', 'Tiêu đề chính', h.title, 'text',
        'Có thể dùng &lt;em&gt; để in nghiêng. VD: Một &lt;em&gt;khoảng&lt;/em&gt; lặng,&lt;br/&gt;giữa đời &lt;em&gt;vội&lt;/em&gt;.')}
      ${field('hero_intro', 'Mô tả ngắn (intro)', h.intro, 'textarea')}
      ${field('hero_cta', 'Nút CTA', h.cta, 'text', 'VD: Khám phá studio')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Quote khách hàng</p>
      ${field('quote_text', 'Nội dung trích dẫn', q.text, 'textarea')}
      ${field('quote_author', 'Tên / ký hiệu', q.author, 'text',
        'VD: NGUYỄN ANH M. — gia chủ dự án 014, Quy Nhon.')}
      ${field('quote_year', 'Năm', q.year, 'text', 'VD: 2025')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Thông tin chỉ đọc</p>
      <div class="form-row">
        <label class="form-label">Nội dung sâu hơn</label>
        <p class="form-hint" style="margin-top:0;">
          Các section Philosophy, Services, Process, About, Contact… sửa qua
          <a href="/admin/cms/" target="_blank">Sveltia CMS</a> → collection "Trang chủ".
        </p>
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật home.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-home-hero" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-home-hero">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-home-hero');
  const origValues = new Map();
  inputs.forEach((inp) => origValues.set(inp, inp.value));

  function checkDirty() {
    const dirty = [...inputs].some((i) => i.value !== origValues.get(i));
    saveBtn.disabled = !dirty;
    window.__adminSetDirty?.(dirty);
  }
  inputs.forEach((i) => i.addEventListener('input', checkDirty));
  checkDirty();

  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);

      obj.hero = obj.hero || {};
      obj.hero.eyebrow = body.querySelector('#hero_eyebrow').value.trim();
      obj.hero.title   = body.querySelector('#hero_title').value.trim();
      obj.hero.intro   = body.querySelector('#hero_intro').value.trim();
      obj.hero.cta     = body.querySelector('#hero_cta').value.trim();

      obj.quote = obj.quote || {};
      obj.quote.text   = body.querySelector('#quote_text').value.trim();
      obj.quote.author = body.querySelector('#quote_author').value.trim();
      obj.quote.year   = body.querySelector('#quote_year').value.trim();

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-home-hero').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
      inputs.forEach((i) => origValues.set(i, i.value));
      window.__adminSetDirty?.(false);
      checkDirty();
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'File đã được cập nhật bởi người khác. Vui lòng tải lại trang và thử lại.'
        : `Không thể lưu: ${e.message}`;
      showToast(`❌ ${msg}`, 'error');
      saveBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });
}
