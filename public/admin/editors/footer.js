/**
 * editors/footer.js — Footer & Menu Studio (src/data/footer.yml)
 * Sửa: tagline, copyright, signature + 3 cột (tiêu đề + links) + menu trên cùng.
 * Thêm/bớt link → dùng Sveltia CMS (/admin/cms/). Editor này sửa nội dung sẵn có.
 */
import { getFile, putFile } from '../github.js';

const FILE = 'src/data/footer.yml';
const BODY = 'editor-footer-body';
const FOOTER = 'editor-footer-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escHtml(s) {
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
function textarea(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <textarea class="form-input form-textarea" id="${id}" rows="3" autocomplete="off">${escHtml(value)}</textarea>
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

  const columns = obj.columns || [];
  const navLinks = obj.nav?.links || [];

  const colCards = columns.map((c, ci) => `
    <div class="form-card">
      <p class="form-card-title">Cột ${ci + 1}</p>
      ${field(`col${ci}_title`, 'Tiêu đề cột', c.title)}
      <div style="display:flex; flex-direction:column; gap:10px; margin-top:6px;">
        ${(c.links || []).map((l, li) => `
          <div style="display:grid; grid-template-columns:1fr 1fr; gap:8px;">
            ${field(`col${ci}_l${li}_label`, `Link ${li + 1} — nhãn`, l.label)}
            ${field(`col${ci}_l${li}_href`, 'Đường dẫn', l.href)}
          </div>`).join('')}
      </div>
    </div>`).join('');

  const navCard = `
    <div class="form-card">
      <p class="form-card-title">Menu trên cùng (Studio)</p>
      <div style="display:flex; flex-direction:column; gap:10px;">
        ${navLinks.map((n, ni) => `
          <div style="display:grid; grid-template-columns:1fr 1fr 1fr; gap:8px;">
            ${field(`nav${ni}_label`, `Mục ${ni + 1} — nhãn`, n.label)}
            ${field(`nav${ni}_anchor`, 'Anchor (vd services)', n.anchor ?? '')}
            ${field(`nav${ni}_route`, 'Route (vd /studio/blog)', n.route ?? '')}
          </div>`).join('')}
      </div>
      <p class="form-hint" style="margin-top:10px;">Mỗi mục dùng <b>Anchor</b> (cuộn trong trang) HOẶC <b>Route</b> (sang trang khác). Để trống cái không dùng.</p>
    </div>`;

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Giới thiệu &amp; bản quyền</p>
      ${textarea('tagline', 'Tagline footer', obj.tagline, 'Cho phép &lt;br/&gt; xuống dòng và &lt;em&gt;in nghiêng&lt;/em&gt;.')}
      ${field('copyright', 'Dòng bản quyền', obj.copyright)}
      ${field('signature', 'Chữ ký (góc phải)', obj.signature)}
    </div>
    ${colCards}
    ${navCard}`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật footer.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-footer" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-footer">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-footer');
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

      obj.tagline   = g('tagline');
      obj.copyright = g('copyright');
      obj.signature = g('signature');

      obj.columns = columns.map((c, ci) => ({
        ...c,
        title: g(`col${ci}_title`),
        links: (c.links || []).map((l, li) => ({
          ...l,
          label: g(`col${ci}_l${li}_label`),
          href: g(`col${ci}_l${li}_href`),
        })),
      }));

      if (obj.nav) {
        obj.nav.links = navLinks.map((n, ni) => {
          const o = { label: g(`nav${ni}_label`) };
          const anc = g(`nav${ni}_anchor`);
          const rt = g(`nav${ni}_route`);
          if (anc) o.anchor = anc;
          if (rt) o.route = rt;
          return o;
        });
      }

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-footer').value.trim() || defaultMsg;
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
