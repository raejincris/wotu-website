/**
 * editors/privacy.js — Chính sách bảo mật (src/data/bao-mat.yml)
 * Sửa ngày cập nhật + từng mục { heading, body }. body cho phép HTML.
 * Token động {{email}} {{hotline}} {{addressLine1}} {{addressCity}} tự thay từ
 * site.yml lúc build — giữ nguyên, đừng đổi tên token.
 * P1 giữ số mục cố định; thêm/xoá/sắp xếp để Phase 2.
 */
import { getFile, putFile } from '../github.js';

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
    ${sections.map((s, i) => `
      <div class="form-card">
        <p class="form-card-title">Mục ${i + 1}</p>
        <div class="form-row">
          <label class="form-label" for="pv${i}_heading">Tiêu đề mục</label>
          <input class="form-input" id="pv${i}_heading" type="text" value="${escVal(s.heading)}" autocomplete="off" />
        </div>
        <div class="form-row">
          <label class="form-label" for="pv${i}_body">Nội dung (HTML)</label>
          <textarea class="form-input form-textarea" id="pv${i}_body" rows="6" autocomplete="off">${escTxt(s.body)}</textarea>
          <p class="form-hint">Cho phép thẻ &lt;p&gt; &lt;ul&gt; &lt;li&gt; &lt;strong&gt; &lt;a&gt; &lt;em&gt; &lt;code&gt;. Token: {{email}} {{hotline}} {{addressLine1}} {{addressCity}}.</p>
        </div>
      </div>`).join('')}`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật chính sách bảo mật — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-privacy" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-privacy">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-privacy');
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
      const g = (id) => body.querySelector(`#${id}`)?.value ?? '';

      obj.updated = g('pv_updated').trim();
      obj.sections = sections.map((s, i) => ({
        ...s,
        heading: g(`pv${i}_heading`).trim(),
        body: g(`pv${i}_body`),
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-privacy').value.trim() || defaultMsg;
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
