/**
 * editors/privacy.js — Chính sách bảo mật (src/data/bao-mat.yml)
 * Sửa ngày cập nhật + từng mục { heading, body }. body cho phép HTML.
 * Token động {{email}} {{hotline}} {{addressLine1}} {{addressCity}} tự thay từ
 * site.yml lúc build — giữ nguyên, đừng đổi tên token.
 * P1 giữ số mục cố định; thêm/xoá/sắp xếp để Phase 2.
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, bindDirty } from '../lib/repeatable.js';

const FILE = 'src/data/bao-mat.yml';
const BODY = 'editor-privacy-body';
const FOOTER = 'editor-privacy-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escTxt(s) {
  return String(s ?? '').replace(/&/g, '&amp;').replace(/</g, '&lt;').replace(/>/g, '&gt;');
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

  const sections = obj.sections || [];

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Thông tin chung</p>
      <div class="form-row">
        <label class="form-label" for="pv_updated">Ngày cập nhật</label>
        <input class="form-input" id="pv_updated" type="text" value="${escVal(obj.updated)}" autocomplete="off" />
        <p class="form-hint">Hiển thị ở đầu trang. VD: 03/05/2026</p>
      </div>
    </div>
    <div class="form-card">
      <p class="form-card-title">Các mục chính sách</p>
      <p class="form-hint" style="margin-bottom:12px;">Thêm/xoá/sắp xếp mục. Nội dung cho phép HTML (&lt;p&gt; &lt;ul&gt; &lt;li&gt; &lt;strong&gt; &lt;a&gt; &lt;em&gt; &lt;code&gt;). Token: {{email}} {{hotline}} {{addressLine1}} {{addressCity}}.</p>
      <div id="pv-sections"></div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật chính sách bảo mật — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-privacy" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-privacy">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-privacy');
  const dirty = bindDirty({ scope: body, saveBtn });

  const repSec = repeatable({
    mount: body.querySelector('#pv-sections'),
    items: sections,
    min: 1,
    addLabel: '＋ Thêm mục',
    title: (s, i) => `Mục ${i + 1}: ${s.heading || ''}`.trim(),
    onChange: dirty.mark,
    makeNew: () => ({ heading: '', body: '<p></p>' }),
    renderFields: (s) => `
      ${rfText('heading', 'Tiêu đề mục', s.heading)}
      ${rfArea('body', 'Nội dung (HTML)', s.body, { rows: 6 })}`,
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);
      const g = (id) => body.querySelector(`#${id}`)?.value ?? '';

      obj.updated = g('pv_updated').trim();
      obj.sections = repSec.collect((f, orig) => ({
        ...orig,
        heading: f.heading.trim(),
        body: f.body,
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-privacy').value.trim() || defaultMsg;
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
