/**
 * editors/combo.js — Combo Tổ Ấm (src/data/combo-to-am.yml)
 * Giá + nhãn bundle (cố định) · Đánh giá + FAQ (thêm/xoá/sắp xếp — repeatable).
 */

import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, bindDirty } from '../lib/repeatable.js';

const FILE = 'src/data/combo-to-am.yml';
const BODY = 'editor-combo-body';
const FOOTER = 'editor-combo-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function field(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <input class="form-input" id="${id}" type="text"
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
      <p class="form-card-title">Đánh giá khách hàng</p>
      <div id="combo-reviews"></div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Câu hỏi thường gặp (FAQ)</p>
      <div id="combo-faq"></div>
      <p class="form-hint" style="margin-top:10px;">
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

  const saveBtn = footer.querySelector('#save-combo');
  const dirty = bindDirty({ scope: body, saveBtn });

  const repReviews = repeatable({
    mount: body.querySelector('#combo-reviews'),
    items: reviews,
    min: 0,
    addLabel: '＋ Thêm đánh giá',
    title: (_, i) => `Đánh giá ${i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ name: '', initial: '', when: '', body: '', color: '', size: '', helpful: 0 }),
    renderFields: (r) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên khách', r.name)}
        ${rfText('initial', 'Chữ cái đầu (avatar)', r.initial)}
      </div>
      ${rfText('when', 'Địa điểm · ngày mua', r.when, { hint: 'VD: Nhơn Bình · Quy Nhơn · Mua 02/05/2026' })}
      ${rfArea('body', 'Nội dung đánh giá', r.body)}`,
  });

  const repFaq = repeatable({
    mount: body.querySelector('#combo-faq'),
    items: faq,
    min: 0,
    addLabel: '＋ Thêm câu hỏi',
    title: (_, i) => `FAQ ${i + 1}`,
    onChange: dirty.mark,
    makeNew: () => ({ question: '', answer: '', open: false }),
    renderFields: (f) => `
      ${rfText('question', 'Câu hỏi', f.question)}
      ${rfArea('answer', 'Trả lời', f.answer, { hint: 'Cho phép &lt;strong&gt;...&lt;/strong&gt;' })}`,
  });

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

      const items = repReviews.collect((f, orig) => ({
        ...orig,
        name: f.name.trim(),
        initial: f.initial.trim(),
        when: f.when.trim(),
        body: f.body.trim(),
      }));
      if (!obj.reviews) obj.reviews = {};
      obj.reviews.items = items;
      obj.reviews.total = items.length;

      obj.faq = repFaq.collect((f, orig) => ({
        ...orig,
        question: f.question.trim(),
        answer: f.answer.trim(),
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-combo').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
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
