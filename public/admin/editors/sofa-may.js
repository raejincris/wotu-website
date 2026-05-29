/**
 * editors/sofa-may.js — Sofa Mây giá & tồn kho + reviews (src/data/shop-sofa-may.yml)
 * Fields: priceNow, priceWas, priceDiscount, priceInstallment, priceNum,
 *         badge, stockLabel, stockStatus + reviews (3 items)
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/shop-sofa-may.yml';
const BODY = 'editor-sofa-body';
const FOOTER = 'editor-sofa-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function field(id, label, value, type = 'text', hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="${type}"
             value="${escVal(value)}" autocomplete="off" />
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

function textarea(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <textarea class="form-input form-textarea" id="${id}" rows="3"
                autocomplete="off">${escHtml(value)}</textarea>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}

export async function init({ token, showToast, setLoading }) {
  const body   = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try { ({ yamlString: data, sha } = await getFile(token, FILE)); }
  catch (e) {
    body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`;
    return;
  }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) {
    body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`;
    return;
  }

  const reviews = obj.reviews?.items || [];

  const reviewCards = reviews.map((r, i) => `
    <div style="border:1px solid var(--line); border-radius:8px; padding:14px 14px 10px; background:var(--bone);">
      <p class="form-hint" style="margin:0 0 8px; font-weight:700; color:var(--ink-soft);">Đánh giá ${i + 1}</p>
      <div class="form-grid-2">
        ${field(`rv${i}_name`,  'Tên khách', r.name)}
        ${field(`rv${i}_place`, 'Địa điểm', r.place, 'text', 'VD: Nhơn Bình · Quy Nhơn')}
      </div>
      <div class="form-grid-2">
        ${field(`rv${i}_date`,  'Ngày mua', r.date, 'text', 'VD: 09/05/2026')}
        ${field(`rv${i}_stars`, 'Sao', r.stars, 'text', 'VD: ★★★★★')}
      </div>
      ${textarea(`rv${i}_body`, 'Nội dung đánh giá', r.body)}
      <div class="form-grid-2">
        ${field(`rv${i}_fab`,  'Màu vải', r.fab,  'text', 'VD: Linen Nâu Đất')}
        ${field(`rv${i}_size`, 'Size',    r.size, 'text', 'VD: 3 chỗ')}
      </div>
    </div>`).join('');

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
      ${field('priceNum', 'Giá số (VND, không dấu chấm)', obj.priceNum, 'number',
        'Dùng để tính toán và lọc. VD: 6900000')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Tồn kho &amp; Badge</p>
      ${field('stockLabel', 'Số lượng tồn', obj.stockLabel, 'text', 'VD: Còn 12 cái')}
      ${field('stockStatus', 'Trạng thái kho', obj.stockStatus, 'text',
        'VD: Còn hàng · giao 48h')}
      ${field('badge', 'Badge hiển thị (ảnh chính)', obj.badge, 'text',
        'VD: Bestseller tháng 5')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Đánh giá khách hàng — ${reviews.length} review</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
        ${reviewCards || '<p class="form-hint">Không có review nào.</p>'}
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

  const inputs = body.querySelectorAll('.form-input:not([readonly]), .form-textarea');
  const saveBtn = footer.querySelector('#save-sofa');
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

      obj.priceNow         = g('priceNow');
      obj.priceWas         = g('priceWas');
      obj.priceDiscount    = g('priceDiscount');
      obj.priceInstallment = g('priceInstallment');
      obj.priceNum         = Number(g('priceNum')) || obj.priceNum;
      obj.stockLabel       = g('stockLabel');
      obj.stockStatus      = g('stockStatus');
      obj.badge            = g('badge');

      if (obj.reviews?.items?.length) {
        obj.reviews.items = reviews.map((r, i) => ({
          ...r,
          avatar: g(`rv${i}_name`) ? g(`rv${i}_name`)[0].toUpperCase() : r.avatar,
          name:   g(`rv${i}_name`),
          place:  g(`rv${i}_place`),
          date:   g(`rv${i}_date`),
          stars:  g(`rv${i}_stars`),
          body:   g(`rv${i}_body`),
          fab:    g(`rv${i}_fab`),
          size:   g(`rv${i}_size`),
        }));
      }

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-sofa').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
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
