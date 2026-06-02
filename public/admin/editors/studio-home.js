/**
 * editors/studio-home.js — Trang chủ Studio: các section sâu (src/data/home.yml)
 * Bổ sung cho home-hero.js (Hero + Quote). Sửa: Marquee · Triết lý ·
 * Dịch vụ (thêm/xoá) · Khối Dự án · Quy trình (thêm/xoá) · About (+stats
 * thêm/xoá) · Form liên hệ. Cả hai editor load/dump TOÀN BỘ home.yml.
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, bindDirty } from '../lib/repeatable.js';
import { connectBody } from '../lib/preview-bus.js';

const FILE = 'src/data/home.yml';
const BODY = 'editor-studio-home-body';
const FOOTER = 'editor-studio-home-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
}
function field(id, label, value, hint = '', cmsKey = '') {
  const cms = cmsKey ? ` data-cms-key="${escVal(cmsKey)}"` : '';
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="text"${cms} value="${escVal(value)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
function textarea(id, label, value, rows = 3, hint = '', cmsKey = '') {
  const cms = cmsKey ? ` data-cms-key="${escVal(cmsKey)}"` : '';
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <textarea class="form-input form-textarea" id="${id}"${cms} rows="${rows}" autocomplete="off">${escTxt(value)}</textarea>
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
  const cFields = contact.fields || [];

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Dòng chữ chạy (Marquee)</p>
      ${textarea('mq_items', 'Các từ — mỗi từ một dòng', (marquee.items || []).join('\n'), 4,
        'Mỗi dòng là một mục chạy ngang. Thêm/bớt dòng = thêm/bớt mục.')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Triết lý</p>
      ${field('phi_label', 'Nhãn', phi.label, '', 'philosophy.label')}
      ${textarea('phi_heading', 'Tiêu đề', phi.heading, 3, 'Cho phép &lt;em&gt; và &lt;em class="accent"&gt;.', 'philosophy.heading')}
      ${textarea('phi_p0', 'Đoạn 1', phi.paragraphs?.[0], 4)}
      ${textarea('phi_p1', 'Đoạn 2', phi.paragraphs?.[1], 4)}
    </div>

    <div class="form-card">
      <p class="form-card-title">Dịch vụ — tiêu đề khối</p>
      ${field('svc_label', 'Nhãn', svc.label, '', 'services.label')}
      ${field('svc_heading', 'Tiêu đề', svc.heading, 'Cho phép &lt;em&gt;', 'services.heading')}
      ${field('svc_meta', 'Dòng meta (phải)', svc.meta, '', 'services.meta')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Các dịch vụ</p>
      <div id="svc-items"></div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Khối Dự án (trên trang chủ)</p>
      ${field('proj_label', 'Nhãn', proj.label)}
      ${field('proj_heading', 'Tiêu đề', proj.heading, 'Cho phép &lt;em&gt;')}
      ${field('proj_cta', 'Nút "Xem tất cả"', proj.ctaLabel)}
    </div>

    <div class="form-card">
      <p class="form-card-title">Quy trình — tiêu đề</p>
      ${field('proc_label', 'Nhãn', proc.label, '', 'process.label')}
      ${textarea('proc_heading', 'Tiêu đề', proc.heading, 2, 'Cho phép &lt;em&gt; và &lt;br/&gt;', 'process.heading')}
      ${textarea('proc_intro', 'Đoạn giới thiệu', proc.intro, 3, '', 'process.intro')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Các bước quy trình</p>
      <div id="proc-steps"></div>
    </div>

    <div class="form-card">
      <p class="form-card-title">About (Studio)</p>
      ${field('about_label', 'Nhãn', about.label, '', 'about.label')}
      ${textarea('about_heading', 'Tiêu đề', about.heading, 2, 'Cho phép &lt;em&gt; và &lt;br/&gt;', 'about.heading')}
      ${textarea('about_body', 'Đoạn văn', about.body, 4, '', 'about.body')}
      ${field('about_cta', 'Nút CTA', about.ctaLabel)}
    </div>
    <div class="form-card">
      <p class="form-card-title">Số liệu (stats)</p>
      <div id="about-stats"></div>
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

  const saveBtn = footer.querySelector('#save-studio-home');
  const dirty = bindDirty({ scope: body, saveBtn });

  // Xem trước trực tiếp (label/heading các section)
  connectBody(body);

  const repSvc = repeatable({
    mount: body.querySelector('#svc-items'),
    items: svc.items || [],
    min: 1,
    addLabel: '＋ Thêm dịch vụ',
    title: (it, i) => `${it.num || '/0' + (i + 1)} ${it.title || ''}`.trim(),
    onChange: dirty.mark,
    makeNew: () => ({ num: '', title: '', em: '', desc: '', tags: [] }),
    renderFields: (it) => `
      <div class="form-grid-2">
        ${rfText('num', 'Số (/01…)', it.num ?? '')}
        ${rfText('title', 'Tên', it.title ?? '')}
      </div>
      ${rfText('em', 'Phụ đề (in nghiêng)', it.em ?? '')}
      ${rfArea('desc', 'Mô tả', it.desc ?? '')}
      ${rfText('tags', 'Tags (cách nhau dấu phẩy)', (it.tags || []).join(', '))}`,
  });

  const repProc = repeatable({
    mount: body.querySelector('#proc-steps'),
    items: proc.steps || [],
    min: 1,
    addLabel: '＋ Thêm bước',
    title: (st, i) => `Bước ${st.n || i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ n: '', t: '', d: '' }),
    renderFields: (st) => `
      <div class="form-grid-2">
        ${rfText('n', 'Số (01…)', st.n ?? '')}
        ${rfText('t', 'Tên bước', st.t ?? '')}
      </div>
      ${rfArea('d', 'Mô tả', st.d ?? '', { rows: 2 })}`,
  });

  const repStats = repeatable({
    mount: body.querySelector('#about-stats'),
    items: about.stats || [],
    min: 0,
    addLabel: '＋ Thêm số liệu',
    title: (s, i) => `Số liệu ${i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ n: '', l: '' }),
    renderFields: (s) => `
      <div class="form-grid-2">
        ${rfText('n', 'Con số', s.n ?? '')}
        ${rfText('l', 'Nhãn', s.l ?? '')}
      </div>`,
  });

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
        items: repSvc.collect((f, orig) => ({
          ...orig,
          num: f.num.trim(),
          title: f.title.trim(),
          em: f.em.trim(),
          desc: f.desc.trim(),
          tags: f.tags.split(',').map((s) => s.trim()).filter(Boolean),
        })),
      };
      obj.projects = {
        ...proj, label: g('proj_label'), heading: g('proj_heading'), ctaLabel: g('proj_cta'),
      };
      obj.process = {
        ...proc,
        label: g('proc_label'),
        heading: g('proc_heading'),
        intro: g('proc_intro'),
        steps: repProc.collect((f, orig) => ({ ...orig, n: f.n.trim(), t: f.t.trim(), d: f.d.trim() })),
      };
      obj.about = {
        ...about,
        label: g('about_label'),
        heading: g('about_heading'),
        body: g('about_body'),
        ctaLabel: g('about_cta'),
        stats: repStats.collect((f, orig) => ({ ...orig, n: f.n.trim(), l: f.l.trim() })),
      };
      obj.contact = {
        ...contact,
        label: g('contact_label'),
        heading: g('contact_heading'),
        successMessage: g('contact_success'),
        submitLabel: g('contact_submit'),
        fields: cFields.map((f, i) => ({ ...f, label: g(`cf${i}_label`), placeholder: g(`cf${i}_ph`) })),
      };

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-studio-home').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
      dirty.reset();
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
