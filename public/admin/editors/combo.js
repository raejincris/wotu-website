/**
 * editors/combo.js — Combo Tổ Ấm (src/data/combo-to-am.yml)
 * Fields: giá + bundle labels + reviews (3 items) + FAQ (6 items)
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/combo-to-am.yml';
const BODY = 'editor-combo-body';
const FOOTER = 'editor-combo-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }
function escHtml(s) {
  return String(s ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;');
}

function field(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="text"
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
  const faq     = obj.faq || [];

  const reviewCards = reviews.map((r, i) => `
    <div style="border:1px solid var(--line); border-radius:8px; padding:14px 14px 10px; background:var(--bone);">
      <p class="form-hint" style="margin:0 0 8px; font-weight:700; color:var(--ink-soft);">Đánh giá ${i + 1}</p>
      ${field(`rev${i}_name`, 'Tên khách', r.name)}
      ${field(`rev${i}_when`, 'Địa điểm · ngày mua', r.when,
        'VD: Nhơn Bình · Quy Nhơn · Mua 02/05/2026')}
      ${textarea(`rev${i}_body`, 'Nội dung đánh giá', r.body)}
    </div>`).join('');

  const faqCards = faq.map((f, i) => `
    <div style="border:1px solid var(--line); border-radius:8px; padding:14px 14px 10px; background:var(--bone);">
      <p class="form-hint" style="margin:0 0 8px; font-weight:700; color:var(--ink-soft);">FAQ ${i + 1}</p>
      ${field(`faq${i}_q`, 'Câu hỏi', f.question)}
      ${textarea(`faq${i}_a`, 'Trả lời', f.answer,
        'Có thể dùng &lt;strong&gt;...&lt;/strong&gt; để in đậm')}
    </div>`).join('');

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
      <p class="form-card-title">Đánh giá khách hàng — ${reviews.length} review</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
        ${reviewCards || '<p class="form-hint">Không có review nào.</p>'}
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Câu hỏi thường gặp — ${faq.length} FAQ</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
        ${faqCards || '<p class="form-hint">Không có FAQ nào.</p>'}
      </div>
      <p class="form-hint" style="margin-top:12px;">
        Trong phần trả lời, có thể dùng &lt;strong&gt;...&lt;/strong&gt; để in đậm từ khoá.
      </p>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật combo-to-am.yml — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-combo" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-combo">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input:not([readonly]), .form-textarea');
  const saveBtn = footer.querySelector('#save-combo');
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
      obj.bundleTotalLabel = g('bundleTotalLabel');
      obj.bundlePriceLabel = g('bundlePriceLabel');
      obj.bundleSaveLabel  = g('bundleSaveLabel');

      if (obj.reviews?.items?.length) {
        obj.reviews.items = reviews.map((r, i) => ({
          ...r,
          name: g(`rev${i}_name`),
          when: g(`rev${i}_when`),
          body: g(`rev${i}_body`),
        }));
      }

      if (obj.faq?.length) {
        obj.faq = faq.map((f, i) => ({
          ...f,
          question: g(`faq${i}_q`),
          answer:   g(`faq${i}_a`),
        }));
      }

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-combo').value.trim() || defaultMsg;
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
