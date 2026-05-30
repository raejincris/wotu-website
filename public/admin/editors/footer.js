/**
 * editors/footer.js — Footer & Menu Studio (src/data/footer.yml)
 * Tagline/copyright/signature (cố định) + 3 cột (tiêu đề cố định, links động) +
 * menu trên cùng (links động). Thêm/xoá/sắp xếp qua repeatable.
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, bindDirty } from '../lib/repeatable.js';

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

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Giới thiệu &amp; bản quyền</p>
      ${textarea('tagline', 'Tagline footer', obj.tagline, 'Cho phép &lt;br/&gt; xuống dòng và &lt;em&gt;in nghiêng&lt;/em&gt;.')}
      ${field('copyright', 'Dòng bản quyền', obj.copyright)}
      ${field('signature', 'Chữ ký (góc phải)', obj.signature)}
    </div>
    ${columns.map((c, ci) => `
      <div class="form-card">
        <p class="form-card-title">Cột ${ci + 1}</p>
        ${field(`col${ci}_title`, 'Tiêu đề cột', c.title)}
        <div id="col${ci}-links" style="margin-top:6px;"></div>
      </div>`).join('')}
    <div class="form-card">
      <p class="form-card-title">Menu trên cùng (Studio)</p>
      <div id="nav-links"></div>
      <p class="form-hint" style="margin-top:10px;">Mỗi mục dùng <b>Anchor</b> (cuộn trong trang) HOẶC <b>Route</b> (sang trang khác). Để trống cái không dùng.</p>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật footer.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-footer" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-footer">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-footer');
  const dirty = bindDirty({ scope: body, saveBtn });

  const colReps = columns.map((c, ci) => repeatable({
    mount: body.querySelector(`#col${ci}-links`),
    items: c.links || [],
    min: 0,
    addLabel: '＋ Thêm link',
    title: (_, i) => `Link ${i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ label: '', href: '' }),
    renderFields: (l) => `
      <div class="form-grid-2">
        ${rfText('label', 'Nhãn', l.label)}
        ${rfText('href', 'Đường dẫn', l.href)}
      </div>`,
  }));

  const repNav = repeatable({
    mount: body.querySelector('#nav-links'),
    items: navLinks,
    min: 0,
    addLabel: '＋ Thêm mục menu',
    title: (_, i) => `Mục ${i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ label: '', anchor: '', route: '' }),
    renderFields: (n) => `
      ${rfText('label', 'Nhãn', n.label)}
      <div class="form-grid-2">
        ${rfText('anchor', 'Anchor (vd services)', n.anchor ?? '')}
        ${rfText('route', 'Route (vd /studio/blog)', n.route ?? '')}
      </div>`,
  });

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
        links: colReps[ci].collect((f, orig) => ({
          ...orig, label: f.label.trim(), href: f.href.trim(),
        })),
      }));

      if (!obj.nav) obj.nav = {};
      obj.nav.links = repNav.collect((f, orig) => {
        const o = { ...orig, label: f.label.trim() };
        const anc = f.anchor.trim();
        const rt = f.route.trim();
        if (anc) o.anchor = anc; else delete o.anchor;
        if (rt) o.route = rt; else delete o.route;
        return o;
      });

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-footer').value.trim() || defaultMsg;
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
