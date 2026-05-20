/**
 * editors/site-info.js — Thông tin liên hệ (src/data/site.yml)
 * Fields: hotline, email, address.line1, address.city, address.mapsUrl, social.facebook
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/site.yml';
const BODY = 'editor-site-body';
const FOOTER = 'editor-site-footer';

const yaml = () => window.jsyaml;

function field(id, label, value, type = 'text', hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" name="${id}" type="${type}"
             value="${escVal(value)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

function escVal(v) {
  return String(v ?? '').replace(/"/g, '&quot;');
}

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
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
  try {
    obj = yaml().load(data);
  } catch (e) {
    body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`;
    return;
  }

  const a = obj.address || {};
  const s = obj.social || {};

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Thông tin liên lạc</p>
      ${field('hotline', 'Hotline', obj.hotline, 'tel', 'VD: 0933 774 708')}
      ${field('email', 'Email', obj.email, 'email')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Địa chỉ</p>
      ${field('addr_line1', 'Đường / Lô', a.line1, 'text', 'VD: Lô 17-18 Hoa Lư')}
      ${field('addr_city', 'Thành phố / Tỉnh', a.city, 'text', 'VD: Quy Nhơn, Gia Lai')}
      ${field('addr_maps', 'Google Maps URL', a.mapsUrl, 'url')}
    </div>
    <div class="form-card">
      <p class="form-card-title">Mạng xã hội</p>
      ${field('fb_main', 'Facebook chính (Nội thất Quy Nhơn)', s.facebook, 'url')}
      ${field('fb_ws', 'Facebook Xưởng', s.facebookWorkshop, 'url')}
    </div>`;

  // Commit message input
  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật site.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-site" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-site">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  // Dirty tracking
  const inputs = body.querySelectorAll('.form-input');
  const saveBtn = footer.querySelector('#save-site');
  const origValues = {};
  inputs.forEach((inp) => { origValues[inp.id] = inp.value; });

  function checkDirty() {
    const dirty = [...inputs].some((i) => i.value !== origValues[i.id]);
    saveBtn.disabled = !dirty;
  }
  inputs.forEach((i) => i.addEventListener('input', checkDirty));
  checkDirty();

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      // Re-fetch sha to avoid 409
      const { sha: freshSha } = await getFile(token, FILE);

      // Merge changes into object
      obj.hotline = body.querySelector('#hotline').value.trim();
      obj.email   = body.querySelector('#email').value.trim();
      if (!obj.address) obj.address = {};
      obj.address.line1   = body.querySelector('#addr_line1').value.trim();
      obj.address.city    = body.querySelector('#addr_city').value.trim();
      obj.address.mapsUrl = body.querySelector('#addr_maps').value.trim();
      if (!obj.social) obj.social = {};
      obj.social.facebook         = body.querySelector('#fb_main').value.trim();
      obj.social.facebookWorkshop = body.querySelector('#fb_ws').value.trim();

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-site').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
      // Update origValues
      inputs.forEach((i) => { origValues[i.id] = i.value; });
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
