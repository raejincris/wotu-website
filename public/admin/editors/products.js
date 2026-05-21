/**
 * editors/products.js — Catalog sản phẩm (src/data/shop-products.yml)
 * Table edit cho 18 sản phẩm: tên, mô tả ngắn (cat), giá, badge chính, trạng thái.
 */

import { getFile, putFile } from '../github.js';

const FILE = 'src/data/shop-products.yml';
const BODY = 'editor-products-body';
const FOOTER = 'editor-products-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

const STATUS_OPTIONS = [
  { key: 'in-stock',   label: 'Còn hàng' },
  { key: 'sale',       label: 'Giảm giá' },
  { key: 'new',        label: 'Hàng mới' },
  { key: 'bestseller', label: 'Bestseller' },
  { key: 'het-hang',   label: 'Hết hàng' },
];

function statusSelect(id, tags) {
  const current = STATUS_OPTIONS.find((s) => tags?.includes(s.key))?.key ?? 'in-stock';
  return `<select class="form-input" id="${id}" style="padding:6px 10px; font-size:13px;">
    ${STATUS_OPTIONS.map((s) =>
      `<option value="${s.key}"${s.key === current ? ' selected' : ''}>${s.label}</option>`
    ).join('')}
  </select>`;
}

function badgeInput(id, product) {
  const first = product.badges?.[0];
  return `<input class="form-input" id="${id}" value="${escVal(first?.label ?? '')}"
                 style="font-size:13px; min-width:80px;" placeholder="VD: −25%" />`;
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

  const products = obj.products || [];

  body.innerHTML = `
    <div class="form-card" style="padding-bottom:8px;">
      <p class="form-card-title">18 sản phẩm catalog — chỉnh nhanh tên, giá, badge</p>
      <p class="form-hint" style="margin-bottom:16px;">
        Để thay đổi ảnh, bộ lọc, màu sắc chi tiết → dùng
        <a href="/admin/cms/" target="_blank">Sveltia CMS</a>.
      </p>
      <div class="combo-table-wrap">
        <table class="combo-table products-table">
          <thead>
            <tr>
              <th>#</th>
              <th>Tên sản phẩm</th>
              <th>Danh mục</th>
              <th>Giá cũ</th>
              <th>Giá mới</th>
              <th>Badge</th>
              <th>Trạng thái</th>
            </tr>
          </thead>
          <tbody>
            ${products.map((p, i) => `
              <tr>
                <td style="color:var(--ink-soft); font-size:11px; white-space:nowrap;">${i + 1}</td>
                <td style="min-width:160px;">
                  <input class="form-input" id="p${i}_name"
                         value="${escVal((p.name || '') + ' ' + (p.nameEm || '') + (p.nameTail || ''))}"
                         style="font-size:13px; min-width:140px;" />
                </td>
                <td style="min-width:120px;">
                  <input class="form-input" id="p${i}_cat"
                         value="${escVal(p.cat ?? '')}"
                         style="font-size:13px; min-width:110px;" />
                </td>
                <td>
                  <input class="form-input" id="p${i}_priceOld"
                         value="${escVal(p.priceOld ?? '')}"
                         style="font-size:13px; min-width:110px;" placeholder="—" />
                </td>
                <td>
                  <input class="form-input" id="p${i}_price"
                         value="${escVal(p.price ?? '')}"
                         style="font-size:13px; min-width:110px;" />
                </td>
                <td>${badgeInput(`p${i}_badge`, p)}</td>
                <td>${statusSelect(`p${i}_status`, p.tags)}</td>
              </tr>`).join('')}
          </tbody>
        </table>
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Hướng dẫn</p>
      <ul style="font-size:13px; color:var(--ink-soft); line-height:1.8; padding-left:18px;">
        <li><strong>Tên sản phẩm</strong>: sẽ được lưu lại vào trường <code>name</code> gộp.</li>
        <li><strong>Badge</strong>: để trống nếu không có nhãn đặc biệt. Badge đầu tiên sẽ được giữ.</li>
        <li><strong>Giá cũ</strong>: để trống nếu không có giá gạch ngang.</li>
        <li><strong>Trạng thái</strong>: ảnh hưởng bộ lọc "Trạng thái" trong trang catalog.</li>
      </ul>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật catalog sản phẩm — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-products" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-products">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const inputs = body.querySelectorAll('.form-input, select');
  const saveBtn = footer.querySelector('#save-products');
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

      obj.products = products.map((p, i) => {
        const newStatus = g(`p${i}_status`);
        const badgeLabel = g(`p${i}_badge`);
        const priceOld = g(`p${i}_priceOld`);

        // Rebuild tags: remove old status keys, add new one
        const statusKeys = STATUS_OPTIONS.map((s) => s.key);
        const otherTags = (p.tags || []).filter((t) => !statusKeys.includes(t));
        const newTags = [...otherTags, newStatus];

        // Rebuild badges: keep first badge label, preserve cls
        const firstBadge = p.badges?.[0];
        const newBadges = badgeLabel
          ? [{ label: badgeLabel, cls: firstBadge?.cls ?? 'accent' }, ...(p.badges?.slice(1) ?? [])]
          : (p.badges?.slice(1) ?? []) || undefined;

        return {
          ...p,
          cat:      g(`p${i}_cat`),
          priceOld: priceOld || undefined,
          price:    g(`p${i}_price`),
          tags:     newTags,
          badges:   newBadges?.length ? newBadges : undefined,
        };
      });

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-products').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(
        `✅ Đã lưu! Catalog sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`,
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
