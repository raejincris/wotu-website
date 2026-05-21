/**
 * editors/sofa-may.js — Sofa Mây giá & tồn kho (src/data/shop-sofa-may.yml)
 * Fields: priceNow, priceWas, priceDiscount, priceInstallment, priceNum, badge, stockLabel, stockStatus
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/shop-sofa-may.yml';
const BODY = 'editor-sofa-body';
const FOOTER = 'editor-sofa-footer';

const yaml = () => window.jsyaml;

function escVal(v) {
  return String(v ?? '').replace(/"/g, '&quot;');
}

function field(id, label, value, type = 'text', hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" name="${id}" type="${type}"
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
      <p class="form-card-title">Giá bán</p>
      <div class="form-grid-2">
        ${field('priceNow', 'Giá hiện tại', obj.priceNow, 'text', 'VD: 6.900.000đ')}
        ${field('priceWas', 'Giá gốc (gạch)', obj.priceWas, 'text', 'VD: 8.500.000đ')}
      </div>
      <div class="form-grid-2">
        ${field('priceDiscount', 'Phần trăm giảm', obj.priceDiscount, 'text', 'VD: − 19%')}
        ${field('priceInstallment', 'Trả góp / tháng', obj.priceInstallment, 'text', 'VD: 575.000đ')}
      </div>
      ${field('priceNum', 'Giá số (VND, không dấu chấm)', obj.priceNum, 'number', 'Dùng để tính toán và lọc. VD: 6900000')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Tồn kho & Badge</p>
      ${field('stockLabel', 'Số lượng tồn', obj.stockLabel, 'text', 'VD: Còn 12 cái')}
      ${field('stockStatus', 'Trạng thái kho', obj.stockStatus, 'text', 'VD: Còn hàng · giao 48h')}
      ${field('badge', 'Badge hiển thị (ảnh chính)', obj.badge, 'text', 'VD: Bestseller tháng 5')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Thông tin chỉ đọc</p>
      <div class="form-row">
        <label class="form-label">Tên sản phẩm</label>
        <input class="form-input" value="${escVal(obj.name)} ${escVal(obj.subtitle)}" readonly />
      </div>
      <div class="form-row">
        <label class="form-label">Bộ sưu tập</label>
        <input class="form-input" value="${escVal(obj.collection)}" readonly />
        <p class="form-hint">Để sửa thông tin này, dùng <a href="/admin/cms/" target="_blank">Sveltia CMS</a>.</p>
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật shop-sofa-may.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-sofa" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-sofa">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input:not([readonly])');
  const saveBtn = footer.querySelector('#save-sofa');
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

      obj.priceNow         = body.querySelector('#priceNow').value.trim();
      obj.priceWas         = body.querySelector('#priceWas').value.trim();
      obj.priceDiscount    = body.querySelector('#priceDiscount').value.trim();
      obj.priceInstallment = body.querySelector('#priceInstallment').value.trim();
      obj.priceNum         = Number(body.querySelector('#priceNum').value) || obj.priceNum;
      obj.stockLabel       = body.querySelector('#stockLabel').value.trim();
      obj.stockStatus      = body.querySelector('#stockStatus').value.trim();
      obj.badge            = body.querySelector('#badge').value.trim();

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-sofa').value.trim() || defaultMsg;
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
