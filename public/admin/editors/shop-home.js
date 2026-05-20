/**
 * editors/shop-home.js — Giá 6 combo trang chủ (src/data/shop-home.yml)
 * Hiển thị dạng table: mỗi combo 1 hàng với priceOld, priceNew, price (số), badge
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/shop-home.yml';
const BODY = 'editor-shop-home-body';
const FOOTER = 'editor-shop-home-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
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

  const combos = obj.combos || [];

  // Bảng combo
  const rows = combos.map((c, i) => `
    <tr>
      <td class="name-cell">
        ${escHtml(c.name)} <span class="name-em">${escHtml(c.nameEm)}</span>${c.nameTail ? escHtml(c.nameTail) : ''}
        <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${escHtml(c.cat)}</div>
      </td>
      <td><input class="form-input" data-i="${i}" data-f="priceOld" value="${escVal(c.priceOld)}" /></td>
      <td><input class="form-input" data-i="${i}" data-f="priceNew" value="${escVal(c.priceNew)}" /></td>
      <td><input class="form-input" data-i="${i}" data-f="price" type="number" value="${escVal(c.price)}" style="min-width:110px;" /></td>
      <td><input class="form-input" data-i="${i}" data-f="badge" value="${escVal(c.badge ?? '')}" /></td>
    </tr>`).join('');

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Giá từng combo — trang chủ Shop</p>
      <div class="combo-table-wrap">
        <table class="combo-table">
          <thead>
            <tr>
              <th>Tên combo</th>
              <th>Giá gốc</th>
              <th>Giá KM</th>
              <th>Giá số (VND)</th>
              <th>Badge</th>
            </tr>
          </thead>
          <tbody>${rows}</tbody>
        </table>
      </div>
      <p class="form-hint" style="margin-top:14px;">
        Giá số dùng để sort và lọc. Badge hiển thị trên card (để trống = không có badge).
      </p>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật shop-home.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-shop-home" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-shop-home">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input');
  const saveBtn = footer.querySelector('#save-shop-home');
  const origValues = new Map();
  inputs.forEach((inp) => origValues.set(inp, inp.value));

  function checkDirty() {
    saveBtn.disabled = ![...inputs].some((i) => i.value !== origValues.get(i));
  }
  inputs.forEach((i) => i.addEventListener('input', checkDirty));
  checkDirty();

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);

      // Apply table edits back to obj.combos
      body.querySelectorAll('input[data-i]').forEach((inp) => {
        const i = Number(inp.dataset.i);
        const f = inp.dataset.f;
        combos[i][f] = f === 'price' ? (Number(inp.value) || 0) : inp.value.trim();
      });
      obj.combos = combos;

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-shop-home').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
      inputs.forEach((i) => origValues.set(i, i.value));
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
