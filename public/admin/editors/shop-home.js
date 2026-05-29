/**
 * editors/shop-home.js — Combo trang chủ (src/data/shop-home.yml)
 * - Nội dung 6 combo (tên, nameEm, mô tả)
 * - Giá & Badge 6 combo (priceOld, priceNew, price, badge)
 * - 4 sản phẩm nổi bật / bestsellers
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

  const combos      = obj.combos      || [];
  const bestsellers = obj.bestsellers || [];

  // ── Cards nội dung combo ───────────────────────────────────────────────────
  const comboCards = combos.map((c, i) => `
    <div style="border:1px solid var(--line); border-radius:8px; padding:14px 14px 10px; background:var(--bone);">
      <p class="form-hint" style="margin:0 0 8px; font-weight:700; color:var(--ink-soft);">${escHtml(c.cat)}</p>
      <div class="form-row">
        <label class="form-label" for="c${i}_name">Tên</label>
        <input class="form-input" id="c${i}_name" value="${escVal(c.name)}" style="font-size:13px;" />
      </div>
      <div class="form-row">
        <label class="form-label" for="c${i}_nameEm">Tên em (in nghiêng)</label>
        <input class="form-input" id="c${i}_nameEm" value="${escVal(c.nameEm ?? '')}" style="font-size:13px;" />
      </div>
      <div class="form-row">
        <label class="form-label" for="c${i}_desc">Mô tả ngắn</label>
        <textarea class="form-input form-textarea" id="c${i}_desc" rows="2"
                  style="font-size:13px;">${escHtml(c.desc ?? '')}</textarea>
      </div>
    </div>`).join('');

  // ── Bảng giá combo ────────────────────────────────────────────────────────
  const priceRows = combos.map((c, i) => `
    <tr>
      <td class="name-cell">
        ${escHtml(c.name)} <span class="name-em">${escHtml(c.nameEm ?? '')}</span>
        <div style="font-size:11px;color:var(--ink-soft);margin-top:2px;">${escHtml(c.cat)}</div>
      </td>
      <td><input class="form-input" data-ci="${i}" data-f="priceOld"
                 value="${escVal(c.priceOld ?? '')}" style="font-size:13px; min-width:110px;" /></td>
      <td><input class="form-input" data-ci="${i}" data-f="priceNew"
                 value="${escVal(c.priceNew ?? '')}" style="font-size:13px; min-width:110px;" /></td>
      <td><input class="form-input" data-ci="${i}" data-f="price" type="number"
                 value="${escVal(c.price)}" style="font-size:13px; min-width:110px;" /></td>
      <td><input class="form-input" data-ci="${i}" data-f="badge"
                 value="${escVal(c.badge ?? '')}" style="font-size:13px; min-width:80px;" /></td>
    </tr>`).join('');

  // ── Bảng bestsellers ──────────────────────────────────────────────────────
  const bsRows = bestsellers.map((b, i) => `
    <tr>
      <td style="min-width:160px;">
        <input class="form-input" id="bs${i}_name" value="${escVal(b.name)}" style="font-size:13px;" />
      </td>
      <td style="min-width:130px;">
        <input class="form-input" id="bs${i}_meta" value="${escVal(b.meta)}" style="font-size:13px;" />
      </td>
      <td>
        <input class="form-input" id="bs${i}_price" value="${escVal(b.price)}"
               style="font-size:13px; min-width:110px;" />
      </td>
      <td>
        <input class="form-input" id="bs${i}_priceNum" type="number" value="${escVal(b.priceNum)}"
               style="font-size:13px; min-width:100px;" />
      </td>
      <td>
        <input class="form-input" id="bs${i}_stars" value="${escVal(b.stars)}"
               style="font-size:13px; min-width:80px;" placeholder="★★★★★" />
      </td>
    </tr>`).join('');

  body.innerHTML = `
    <!-- ── Nội dung combo ── -->
    <div class="form-card">
      <p class="form-card-title">Nội dung 6 combo — tên &amp; mô tả</p>
      <div style="display:flex; flex-direction:column; gap:12px; margin-top:4px;">
        ${comboCards}
      </div>
    </div>

    <!-- ── Giá combo ── -->
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">Giá &amp; Badge 6 combo</p>
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
          <tbody>${priceRows}</tbody>
        </table>
      </div>
      <p class="form-hint" style="margin-top:14px;">
        Giá số dùng để sort và lọc. Badge hiển thị trên card (để trống = không có badge).
      </p>
    </div>

    <!-- ── Bestsellers ── -->
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">4 sản phẩm nổi bật (bestsellers)</p>
      <div class="combo-table-wrap">
        <table class="combo-table products-table">
          <thead>
            <tr>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá hiển thị</th>
              <th>Giá số (VND)</th>
              <th>Sao</th>
            </tr>
          </thead>
          <tbody>${bsRows}</tbody>
        </table>
      </div>
      <p class="form-hint" style="margin-top:14px;">
        Sao dùng ký tự ★ và ☆. VD: ★★★★★ hoặc ★★★★☆
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

  const inputs = body.querySelectorAll('.form-input, .form-textarea');
  const saveBtn = footer.querySelector('#save-shop-home');
  const origValues = new Map();
  inputs.forEach((i) => origValues.set(i, i.value));

  function checkDirty() {
    const dirty = [...inputs].some((i) => i.value !== origValues.get(i));
    saveBtn.disabled = !dirty;
    window.__adminSetDirty?.(dirty);
  }
  inputs.forEach((i) => i.addEventListener('input', checkDirty));
  inputs.forEach((i) => i.addEventListener('change', checkDirty));
  checkDirty();

  window.__adminSaveFn = () => { if (!saveBtn.disabled) saveBtn.click(); };

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);
      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      // 1. Nội dung combo (name / nameEm / desc)
      obj.combos = combos.map((c, i) => ({
        ...c,
        name:   g(`c${i}_name`),
        nameEm: g(`c${i}_nameEm`) || undefined,
        desc:   g(`c${i}_desc`),
      }));

      // 2. Giá & Badge (từ bảng data-ci / data-f)
      body.querySelectorAll('input[data-ci]').forEach((inp) => {
        const idx = Number(inp.dataset.ci);
        const f   = inp.dataset.f;
        obj.combos[idx][f] = f === 'price' ? (Number(inp.value) || 0) : inp.value.trim();
      });

      // 3. Bestsellers
      obj.bestsellers = bestsellers.map((b, i) => ({
        ...b,
        name:     g(`bs${i}_name`),
        meta:     g(`bs${i}_meta`),
        price:    g(`bs${i}_price`),
        priceNum: Number(g(`bs${i}_priceNum`)) || b.priceNum,
        stars:    g(`bs${i}_stars`),
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-shop-home').value.trim() || defaultMsg;
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
