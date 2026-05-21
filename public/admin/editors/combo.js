/**
 * editors/combo.js — Combo Tổ Ấm giá (src/data/combo-to-am.yml)
 * Fields: priceNow, priceWas, priceDiscount, priceInstallment, bundleTotalLabel, bundlePriceLabel, bundleSaveLabel
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/combo-to-am.yml';
const BODY = 'editor-combo-body';
const FOOTER = 'editor-combo-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function field(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" name="${id}" type="text"
             value="${escVal(value)}" autocomplete="off" />
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

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Giá combo</p>
      <div class="form-grid-2">
        ${field('priceNow', 'Giá hiện tại', obj.priceNow, 'VD: 18.900.000đ')}
        ${field('priceWas', 'Giá gốc (gạch)', obj.priceWas, 'VD: 28.900.000đ')}
      </div>
      <div class="form-grid-2">
        ${field('priceDiscount', 'Phần trăm giảm', obj.priceDiscount, 'VD: − 35%')}
        ${field('priceInstallment', 'Trả góp / tháng', obj.priceInstallment, 'VD: 1.575.000đ')}
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Nhãn tổng tiền (widget "Mua kèm")</p>
      <div class="form-grid-2">
        ${field('bundleTotalLabel', 'Tổng giá mua lẻ', obj.bundleTotalLabel)}
        ${field('bundlePriceLabel', 'Giá combo', obj.bundlePriceLabel)}
      </div>
      ${field('bundleSaveLabel', 'Tiết kiệm', obj.bundleSaveLabel, 'VD: 10.000.000đ')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Thông tin chỉ đọc</p>
      <div class="form-row">
        <label class="form-label">Tên combo</label>
        <input class="form-input" value="${escVal(obj.title)} — ${escVal(obj.subtitle)}" readonly />
        <p class="form-hint">Để sửa nội dung sâu hơn, dùng <a href="/admin/cms/" target="_blank">Sveltia CMS</a>.</p>
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật combo-to-am.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-combo" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-combo">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input:not([readonly])');
  const saveBtn = footer.querySelector('#save-combo');
  const origValues = {};
  inputs.forEach((i) => { origValues[i.id] = i.value; });

  function checkDirty() {
    const dirty = [...inputs].some((i) => i.value !== origValues[i.id]);
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

      obj.priceNow          = body.querySelector('#priceNow').value.trim();
      obj.priceWas          = body.querySelector('#priceWas').value.trim();
      obj.priceDiscount     = body.querySelector('#priceDiscount').value.trim();
      obj.priceInstallment  = body.querySelector('#priceInstallment').value.trim();
      obj.bundleTotalLabel  = body.querySelector('#bundleTotalLabel').value.trim();
      obj.bundlePriceLabel  = body.querySelector('#bundlePriceLabel').value.trim();
      obj.bundleSaveLabel   = body.querySelector('#bundleSaveLabel').value.trim();

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-combo').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
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
