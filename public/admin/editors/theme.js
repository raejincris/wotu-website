/**
 * editors/theme.js — Tuỳ biến giao diện (src/data/theme.yml)
 * Studio: màu --earth + --accent. Shop: palette + density + (tuỳ chọn) accent.
 * Có cảnh báo tương phản WCAG AA + xem trước swatch. Token gốc vẫn ở CSS;
 * file này chỉ override (default = giao diện hiện tại).
 */
import { getFile, putFile } from '../github.js';
import { bindDirty } from '../lib/repeatable.js';

const FILE = 'src/data/theme.yml';
const BODY = 'editor-theme-body';
const FOOTER = 'editor-theme-footer';

const yaml = () => window.jsyaml;
function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

const BONE = '#F5F0E8';       // nền studio để kiểm tương phản --earth
const SHOP_BG = '#FBF7F0';    // nền shop
const WHITE = '#FFFFFF';

const PALETTES = [
  { value: 'warm', label: 'Ấm (mặc định) — kem + đất nung' },
  { value: 'sunny', label: 'Nắng — vàng ấm' },
  { value: 'sage', label: 'Xanh rêu' },
  { value: 'rose', label: 'Hồng đất' },
];
const DENSITIES = [
  { value: 'cozy', label: 'Chật (cozy)' },
  { value: 'comfy', label: 'Vừa (comfy)' },
  { value: 'airy', label: 'Thoáng (airy)' },
];

// ── WCAG contrast ──────────────────────────────────────────────────────────
function hexToRgb(hex) {
  const m = String(hex).replace('#', '');
  const n = m.length === 3 ? m.split('').map((c) => c + c).join('') : m;
  return [0, 2, 4].map((i) => parseInt(n.slice(i, i + 2), 16));
}
function lum([r, g, b]) {
  const a = [r, g, b].map((v) => {
    v /= 255;
    return v <= 0.03928 ? v / 12.92 : ((v + 0.055) / 1.055) ** 2.4;
  });
  return 0.2126 * a[0] + 0.7152 * a[1] + 0.0722 * a[2];
}
function contrast(a, b) {
  try {
    const l1 = lum(hexToRgb(a)), l2 = lum(hexToRgb(b));
    return (Math.max(l1, l2) + 0.05) / (Math.min(l1, l2) + 0.05);
  } catch { return 0; }
}
function isHex(s) { return /^#([0-9a-f]{3}|[0-9a-f]{6})$/i.test(String(s).trim()); }

function colorRow(id, label, value, hint = '') {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <div style="display:flex; gap:10px; align-items:center;">
        <input type="color" id="${id}_pick" value="${escVal(isHex(value) ? value : '#000000')}" style="width:44px; height:34px; border:1px solid var(--line); border-radius:6px; background:none; cursor:pointer;" />
        <input class="form-input" id="${id}" type="text" value="${escVal(value)}" style="max-width:140px;font-family:monospace;" autocomplete="off" />
        <span id="${id}_warn" class="theme-warn"></span>
      </div>
      ${hint ? `<p class="form-hint">${hint}</p>` : ''}
    </div>`;
}
function selectRow(id, label, value, options) {
  return `
    <div class="form-row">
      <label class="form-label" for="${id}">${label}</label>
      <select class="form-input" id="${id}">
        ${options.map((o) => `<option value="${escVal(o.value)}"${o.value === value ? ' selected' : ''}>${o.label}</option>`).join('')}
      </select>
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
  try { obj = yaml().load(data) || {}; }
  catch (e) { body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`; return; }

  const st = obj.studio || {};
  const sh = obj.shop || {};
  const hasShopAccent = !!(sh.accent && sh.accent.trim());

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Studio — màu nhấn</p>
      <p class="form-hint" style="margin-bottom:12px;">Áp cho các trang /studio/. Nền studio là màu kem (${BONE}); chữ nhấn phải đủ đậm để đọc rõ.</p>
      ${colorRow('st_earth', 'Màu nhấn editorial (--earth)', st.earth ?? '#6B5C45', 'Dùng cho chữ in nghiêng, eyebrow.')}
      ${colorRow('st_accent', 'Màu accent ấm (--accent)', st.accent ?? '#B8835A', 'CTA, gạch chân.')}
    </div>

    <div class="form-card">
      <p class="form-card-title">Shop — bảng màu &amp; mật độ</p>
      ${selectRow('sh_palette', 'Bảng màu nền', sh.palette || 'warm', PALETTES)}
      ${selectRow('sh_density', 'Mật độ khoảng cách', sh.density || 'comfy', DENSITIES)}
      <div class="form-row">
        <label class="form-label" style="display:flex; align-items:center; gap:8px; cursor:pointer;">
          <input type="checkbox" id="sh_accent_on" ${hasShopAccent ? 'checked' : ''} />
          Ghi đè màu nhấn shop (thay vì theo bảng màu)
        </label>
      </div>
      <div id="sh_accent_wrap" style="${hasShopAccent ? '' : 'display:none;'}">
        ${colorRow('sh_accent', 'Màu nhấn shop (--shop-accent)', sh.accent || '#C97B5E', 'Nút, giá, link nổi bật.')}
        ${colorRow('sh_accentDeep', 'Màu nhấn đậm (--shop-accent-deep)', sh.accentDeep || '#A35E45', 'Trạng thái hover.')}
      </div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật giao diện (theme) — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-theme" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-theme">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-theme');
  const dirty = bindDirty({ scope: body, saveBtn });

  // Đồng bộ ô color ↔ ô text + cảnh báo tương phản
  function bindColor(id, bg, minRatio, ctx) {
    const pick = body.querySelector(`#${id}_pick`);
    const text = body.querySelector(`#${id}`);
    const warn = body.querySelector(`#${id}_warn`);
    function check() {
      const v = text.value.trim();
      if (isHex(v)) {
        pick.value = v.length === 4
          ? '#' + v.slice(1).split('').map((c) => c + c).join('')
          : v;
        const ratio = contrast(v, bg);
        if (ratio < minRatio) {
          warn.textContent = `⚠ Tương phản ${ratio.toFixed(1)}:1 ${ctx} — hơi thấp (nên ≥ ${minRatio}:1)`;
          warn.className = 'theme-warn bad';
        } else {
          warn.textContent = `✓ ${ratio.toFixed(1)}:1`;
          warn.className = 'theme-warn ok';
        }
      } else {
        warn.textContent = '⚠ Mã màu chưa hợp lệ (vd #B8835A)';
        warn.className = 'theme-warn bad';
      }
    }
    pick.addEventListener('input', () => { text.value = pick.value; check(); });
    text.addEventListener('input', check);
    check();
  }
  bindColor('st_earth', BONE, 4.5, 'trên nền kem');
  bindColor('st_accent', BONE, 3, 'trên nền kem');
  bindColor('sh_accent', WHITE, 3, 'với chữ trắng');
  bindColor('sh_accentDeep', WHITE, 3, 'với chữ trắng');

  const accentOn = body.querySelector('#sh_accent_on');
  const accentWrap = body.querySelector('#sh_accent_wrap');
  accentOn.addEventListener('change', () => {
    accentWrap.style.display = accentOn.checked ? '' : 'none';
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);
      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      obj.studio = { ...(obj.studio || {}), earth: g('st_earth'), accent: g('st_accent') };
      obj.shop = {
        ...(obj.shop || {}),
        palette: g('sh_palette'),
        density: g('sh_density'),
        accent: accentOn.checked ? g('sh_accent') : '',
        accentDeep: accentOn.checked ? g('sh_accentDeep') : '',
      };

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-theme').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Giao diện sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
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
