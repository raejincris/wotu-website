/**
 * editors/services.js — 3 trang dịch vụ Studio (src/data/services.yml)
 * Mỗi dịch vụ: tiêu đề/meta SEO/lede + intro + "bao gồm" + quy trình + FAQ.
 * P1 giữ số lượng mục cố định; thêm/xoá để Phase 2.
 */
import { getFile, putFile } from '../github.js';

const FILE = 'src/data/services.yml';
const BODY = 'editor-services-body';
const FOOTER = 'editor-services-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function field(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="text" value="${escVal(value)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
function textarea(id, label, value, rows = 3, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <textarea class="form-input form-textarea" id="${id}" rows="${rows}" autocomplete="off">${escTxt(value)}</textarea>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try { ({ yamlString: data, sha } = await getFile(token, FILE)); }
  catch (e) { body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`; return; }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) { body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`; return; }

  const services = obj.services || [];

  body.innerHTML = `
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">${services.length} trang dịch vụ Studio</p>
      <p class="form-hint">Mỗi dịch vụ là một trang riêng tại <code>/studio/dich-vu/&lt;slug&gt;</code>. Meta title/description ảnh hưởng SEO Google.</p>
    </div>
    ${services.map((sv, si) => `
      <div class="form-card">
        <p class="form-card-title">Dịch vụ ${si + 1}: ${escTxt(sv.title || sv.slug)}</p>
        ${field(`s${si}_eyebrow`, 'Eyebrow', sv.eyebrow)}
        ${field(`s${si}_navName`, 'Tên ngắn (menu)', sv.navName)}
        ${field(`s${si}_title`, 'Tiêu đề trang', sv.title)}
        ${field(`s${si}_titleEm`, 'Phần in nghiêng trong tiêu đề', sv.titleEm, 'Phải là một cụm có trong Tiêu đề trang.')}
        ${field(`s${si}_metaTitle`, 'Meta title (SEO)', sv.metaTitle, '≤ 60 ký tự lý tưởng.')}
        ${textarea(`s${si}_metaDescription`, 'Meta description (SEO)', sv.metaDescription, 3, '≤ 160 ký tự lý tưởng.')}
        ${textarea(`s${si}_lede`, 'Lede (câu mở đầu nổi bật)', sv.lede, 3)}
        ${(sv.intro || []).map((p, j) => textarea(`s${si}_intro${j}`, `Đoạn intro ${j + 1}`, p, 4)).join('')}

        ${field(`s${si}_includesTitle`, 'Tiêu đề mục "Bao gồm"', sv.includesTitle)}
        <div style="display:flex; flex-direction:column; gap:8px;">
          ${(sv.includes || []).map((it, j) => field(`s${si}_inc${j}`, `Bao gồm ${j + 1}`, it)).join('')}
        </div>

        <p class="form-card-title" style="margin-top:16px;">Quy trình</p>
        ${(sv.process || []).map((st, j) => `
          <div style="display:grid; grid-template-columns:1fr 2fr; gap:8px;">
            ${field(`s${si}_proc${j}_t`, `Bước ${j + 1} — tên`, st.t)}
            ${field(`s${si}_proc${j}_d`, 'Mô tả', st.d)}
          </div>`).join('')}

        <p class="form-card-title" style="margin-top:16px;">Câu hỏi thường gặp (FAQ)</p>
        ${(sv.faq || []).map((f, j) => `
          ${field(`s${si}_faq${j}_q`, `Câu hỏi ${j + 1}`, f.q)}
          ${textarea(`s${si}_faq${j}_a`, 'Trả lời', f.a, 3)}`).join('')}

        ${field(`s${si}_relatedHeading`, 'Tiêu đề khối dự án liên quan', sv.relatedHeading)}
      </div>`).join('')}`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật trang dịch vụ — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-services" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-services">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-services');
  const origValues = new Map();
  inputs.forEach((i) => origValues.set(i, i.value));

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
      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      obj.services = services.map((sv, si) => ({
        ...sv,
        eyebrow: g(`s${si}_eyebrow`),
        navName: g(`s${si}_navName`),
        title: g(`s${si}_title`),
        titleEm: g(`s${si}_titleEm`),
        metaTitle: g(`s${si}_metaTitle`),
        metaDescription: g(`s${si}_metaDescription`),
        lede: g(`s${si}_lede`),
        intro: (sv.intro || []).map((_, j) => g(`s${si}_intro${j}`)),
        includesTitle: g(`s${si}_includesTitle`),
        includes: (sv.includes || []).map((_, j) => g(`s${si}_inc${j}`)),
        process: (sv.process || []).map((st, j) => ({ ...st, t: g(`s${si}_proc${j}_t`), d: g(`s${si}_proc${j}_d`) })),
        faq: (sv.faq || []).map((f, j) => ({ ...f, q: g(`s${si}_faq${j}_q`), a: g(`s${si}_faq${j}_a`) })),
        relatedHeading: g(`s${si}_relatedHeading`),
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-services').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      inputs.forEach((i) => origValues.set(i, i.value));
      window.__adminSetDirty?.(false);
      checkDirty();
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
