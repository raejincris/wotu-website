/**
 * editors/studio-home.js — Trang chủ Studio: các section sâu (src/data/home.yml)
 * Bổ sung cho home-hero.js (chỉ Hero + Quote). Editor này sửa:
 *   Marquee · Triết lý · Dịch vụ (3) · Khối Dự án · Quy trình (5 bước) ·
 *   About (+4 stat) · Form liên hệ (labels).
 * Cả hai editor đều load + dump TOÀN BỘ home.yml nên không ghi đè lẫn nhau.
 */
import { getFile, putFile } from '../github.js';

const FILE = 'src/data/home.yml';
const BODY = 'editor-studio-home-body';
const FOOTER = 'editor-studio-home-footer';

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

  const marquee = obj.marquee || {};
  const phi = obj.philosophy || {};
  const svc = obj.services || {};
  const proj = obj.projects || {};
  const proc = obj.process || {};
  const about = obj.about || {};
  const contact = obj.contact || {};

  const svcItems = svc.items || [];
  const procSteps = proc.steps || [];
  const stats = about.stats || [];
  const cFields = contact.fields || [];

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Dòng chữ chạy (Marquee)</p>
      ${textarea('mq_items', 'Các từ — mỗi từ một dòng', (marquee.items || []).join('\n'), 4,
        'Mỗi dòng là một mục chạy ngang trên trang chủ Studio.')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Triết lý</p>
      ${field('phi_label', 'Nhãn', phi.label)}
      ${textarea('phi_heading', 'Tiêu đề', phi.heading, 3, 'Cho phép &lt;em&gt; và &lt;em class="accent"&gt; in nghiêng nhấn.')}
      ${textarea('phi_p0', 'Đoạn 1', phi.paragraphs?.[0], 4)}
      ${textarea('phi_p1', 'Đoạn 2', phi.paragraphs?.[1], 4)}
    </div>

    <div class="form-card">
      <p class="form-card-title">Dịch vụ — tiêu đề khối</p>
      ${field('svc_label', 'Nhãn', svc.label)}
      ${field('svc_heading', 'Tiêu đề', svc.heading, 'Cho phép &lt;em&gt;')}
      ${field('svc_meta', 'Dòng meta (phải)', svc.meta)}
    </div>
    ${svcItems.map((it, i) => `
      <div class="form-card">
        <p class="form-card-title">Dịch vụ ${i + 1}</p>
        ${field(`svc${i}_title`, 'Tên', it.title)}
        ${field(`svc${i}_em`, 'Phụ đề (in nghiêng)', it.em)}
        ${textarea(`svc${i}_desc`, 'Mô tả', it.desc, 3)}
        ${field(`svc${i}_tags`, 'Tags (cách nhau bởi dấu phẩy)', (it.tags || []).join(', '))}
      </div>`).join('')}

    <div class="form-card">
      <p class="form-card-title">Khối Dự án (trên trang chủ)</p>
      ${field('proj_label', 'Nhãn', proj.label)}
      ${field('proj_heading', 'Tiêu đề', proj.heading, 'Cho phép &lt;em&gt;')}
      ${field('proj_cta', 'Nút "Xem tất cả"', proj.ctaLabel)}
    </div>

    <div class="form-card">
      <p class="form-card-title">Quy trình</p>
      ${field('proc_label', 'Nhãn', proc.label)}
      ${textarea('proc_heading', 'Tiêu đề', proc.heading, 2, 'Cho phép &lt;em&gt; và &lt;br/&gt;')}
      ${textarea('proc_intro', 'Đoạn giới thiệu', proc.intro, 3)}
    </div>
    ${procSteps.map((st, i) => `
      <div class="form-card">
        <p class="form-card-title">Bước ${st.n || i + 1}</p>
        ${field(`proc${i}_t`, 'Tên bước', st.t)}
        ${textarea(`proc${i}_d`, 'Mô tả', st.d, 2)}
      </div>`).join('')}

    <div class="form-card">
      <p class="form-card-title">About (Studio)</p>
      ${field('about_label', 'Nhãn', about.label)}
      ${textarea('about_heading', 'Tiêu đề', about.heading, 2, 'Cho phép &lt;em&gt; và &lt;br/&gt;')}
      ${textarea('about_body', 'Đoạn văn', about.body, 4)}
      ${field('about_cta', 'Nút CTA', about.ctaLabel)}
      <div style="display:grid; grid-template-columns:1fr 1fr; gap:10px; margin-top:6px;">
        ${stats.map((s, i) => `
          ${field(`about_stat${i}_n`, `Số liệu ${i + 1} — con số`, s.n)}
          ${field(`about_stat${i}_l`, `Số liệu ${i + 1} — nhãn`, s.l)}`).join('')}
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Form liên hệ</p>
      ${field('contact_label', 'Nhãn', contact.label)}
      ${textarea('contact_heading', 'Tiêu đề lớn', contact.heading, 3, 'Cho phép &lt;em&gt; và &lt;br/&gt;')}
      ${textarea('contact_success', 'Thông báo gửi thành công', contact.successMessage, 2)}
      ${field('contact_submit', 'Nhãn nút gửi', contact.submitLabel)}
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
        ${cFields.map((f, i) => `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${field(`cf${i}_label`, `Ô ${i + 1} — nhãn`, f.label)}
            ${field(`cf${i}_ph`, 'Placeholder', f.placeholder ?? '')}
          </div>`).join('')}
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật trang chủ Studio — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-studio-home" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-studio-home">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-studio-home');
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
      const gRaw = (id) => body.querySelector(`#${id}`)?.value ?? '';

      obj.marquee = {
        ...marquee,
        items: gRaw('mq_items').split('\n').map((s) => s.trim()).filter(Boolean),
      };
      obj.philosophy = {
        ...phi,
        label: g('phi_label'),
        heading: g('phi_heading'),
        paragraphs: [g('phi_p0'), g('phi_p1')],
      };
      obj.services = {
        ...svc,
        label: g('svc_label'),
        heading: g('svc_heading'),
        meta: g('svc_meta'),
        items: svcItems.map((it, i) => ({
          ...it,
          title: g(`svc${i}_title`),
          em: g(`svc${i}_em`),
          desc: g(`svc${i}_desc`),
          tags: g(`svc${i}_tags`).split(',').map((s) => s.trim()).filter(Boolean),
        })),
      };
      obj.projects = {
        ...proj,
        label: g('proj_label'),
        heading: g('proj_heading'),
        ctaLabel: g('proj_cta'),
      };
      obj.process = {
        ...proc,
        label: g('proc_label'),
        heading: g('proc_heading'),
        intro: g('proc_intro'),
        steps: procSteps.map((st, i) => ({ ...st, t: g(`proc${i}_t`), d: g(`proc${i}_d`) })),
      };
      obj.about = {
        ...about,
        label: g('about_label'),
        heading: g('about_heading'),
        body: g('about_body'),
        ctaLabel: g('about_cta'),
        stats: stats.map((s, i) => ({ ...s, n: g(`about_stat${i}_n`), l: g(`about_stat${i}_l`) })),
      };
      obj.contact = {
        ...contact,
        label: g('contact_label'),
        heading: g('contact_heading'),
        successMessage: g('contact_success'),
        submitLabel: g('contact_submit'),
        fields: cFields.map((f, i) => {
          const o = { ...f, label: g(`cf${i}_label`) };
          const ph = g(`cf${i}_ph`);
          o.placeholder = ph;
          return o;
        }),
      };

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-studio-home').value.trim() || defaultMsg;
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
