/**
 * lib/imagefield.js — ô upload/thay ảnh trong Custom Admin.
 *
 * Mẫu HTML (đặt trong renderFields hoặc form): một .img-slot chứa
 *   <input type="hidden" data-field="photo" data-photo value="…"> (collect() đọc path)
 *   + preview + nút Chọn ảnh / Xoá ảnh.
 * Ảnh được nén client-side (downscale ≤1600px + PSNR binary-search chọn
 * WebP/JPEG nhỏ nhất mà vẫn visually-lossless — port từ nen-anh/nen_anh.py)
 * rồi PUT base64 lên GitHub vào public/uploads/<area>/.
 * Path tương đối /uploads/… ghi vào hidden input.
 */
import { putBinaryFile, getFileMeta } from '../github.js';
import { img as previewImg } from './preview-bus.js';

/** HTML cho 1 ô ảnh — nhúng vào renderFields. cmsKey: bật xem trước trực tiếp. */
export function imageSlot(field, value, label = 'Ảnh', cmsKey = '') {
  const v = String(value ?? '').replace(/"/g, '&quot;');
  const cms = cmsKey
    ? ` data-cms-img-key="${cmsKey.replace(/"/g, '&quot;')}" data-cms-img-src="${v}"`
    : '';
  return `
    <div class="form-row">
      <label class="form-label">${label}</label>
      <div class="img-slot">
        <input type="hidden" data-field="${field}" data-photo${cms} value="${v}" />
        <div class="img-preview"></div>
        <div class="img-controls">
          <label class="btn btn-ghost btn-sm img-pick">Chọn ảnh<input type="file" accept="image/*" hidden class="img-input" /></label>
          <button type="button" class="btn btn-ghost btn-sm img-clear">Xoá ảnh</button>
          <span class="img-status"></span>
        </div>
      </div>
    </div>`;
}

/** Định dạng trình duyệt không decode được qua <img> (HEIC iPhone, …). */
function unsupportedFormat(file) {
  const name = (file.name || '').toLowerCase();
  const type = (file.type || '').toLowerCase();
  if (/hei[cf]$/.test(name) || type === 'image/heic' || type === 'image/heif') {
    return 'Ảnh HEIC (iPhone) — đổi sang JPG/PNG trước khi tải';
  }
  return null;
}

/**
 * Nén ảnh phía trình duyệt — port logic của nen-anh/nen_anh.py:
 * downscale ≤maxDim → thử WebP + JPEG (hoặc WebP + PNG nếu ảnh trong suốt) →
 * binary-search quality NHỎ NHẤT mà PSNR so với ảnh gốc vẫn ≥ psnrTarget
 * (mặc định 40 dB ≈ mắt thường không phân biệt) → chọn file nhỏ nhất.
 * KHÔNG "nén ngược": nếu re-encode lớn hơn file gốc (và không downscale) → giữ gốc.
 */
const PSNR_TARGET = 40; // visually lossless

/** Trình duyệt có encode được WebP qua canvas không? */
const WEBP_OK = (() => {
  try {
    const c = document.createElement('canvas');
    c.width = c.height = 1;
    return c.toDataURL('image/webp').startsWith('data:image/webp');
  } catch { return false; }
})();

function loadImage(file) {
  // Decode qua data: URL chứ KHÔNG dùng URL.createObjectURL → blob: URL.
  // CSP của site (img-src 'self' data: …) không cho phép blob: nên ảnh blob
  // bị chặn → img.onerror → "không đọc được ảnh". data: nằm trong allowlist.
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onerror = () => reject(new Error('Không đọc được file ảnh'));
    reader.onload = () => {
      const img = new Image();
      img.onload = () => resolve(img);
      img.onerror = () => reject(new Error('Trình duyệt không decode được ảnh'));
      img.src = String(reader.result);
    };
    reader.readAsDataURL(file);
  });
}

function canvasToBlob(canvas, mime, quality) {
  return new Promise((resolve, reject) => {
    canvas.toBlob((b) => (b ? resolve(b) : reject(new Error(`encode lỗi ${mime}`))), mime, quality);
  });
}

function blobToBase64(blob) {
  return new Promise((resolve, reject) => {
    const r = new FileReader();
    r.onload = () => resolve(String(r.result).split(',')[1]);
    r.onerror = reject;
    r.readAsDataURL(blob);
  });
}

/** PSNR (dB) giữa pixel gốc (refData) và ảnh đã encode/decode. Càng cao càng giống. */
async function psnrOf(refData, blob, w, h, channels) {
  const bmp = await createImageBitmap(blob);
  const c = document.createElement('canvas');
  c.width = w; c.height = h;
  const ctx = c.getContext('2d');
  ctx.drawImage(bmp, 0, 0, w, h);
  bmp.close?.();
  const d = ctx.getImageData(0, 0, w, h).data;
  let sse = 0, n = 0;
  for (let i = 0; i < refData.length; i += 4) {
    for (let ch = 0; ch < channels; ch++) {
      const diff = refData[i + ch] - d[i + ch];
      sse += diff * diff; n++;
    }
  }
  const mse = sse / n;
  if (mse === 0) return Infinity;
  return 20 * Math.log10(255 / Math.sqrt(mse));
}

/** Binary-search quality nhỏ nhất (theo bước 1%) mà PSNR ≥ target. */
async function searchMinQuality(canvas, mime, refData, w, h, channels, target, qMin = 30, qMax = 95) {
  let bestBlob = await canvasToBlob(canvas, mime, qMax / 100);
  let lo = qMin, hi = qMax;
  while (lo < hi) {
    const mid = (lo + hi) >> 1;
    const blob = await canvasToBlob(canvas, mime, mid / 100);
    const p = await psnrOf(refData, blob, w, h, channels);
    if (p >= target) { bestBlob = blob; hi = mid; } else { lo = mid + 1; }
  }
  return bestBlob;
}

/**
 * @returns {{ base64, dataUrl, ext, mime, srcSize, outSize, savedPct }}
 */
async function compressImage(file, { maxDim = 1600, psnrTarget = PSNR_TARGET } = {}) {
  const img = await loadImage(file);
  const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
  const w = Math.max(1, Math.round(img.width * scale));
  const h = Math.max(1, Math.round(img.height * scale));

  const canvas = document.createElement('canvas');
  canvas.width = w; canvas.height = h;
  const ctx = canvas.getContext('2d');
  ctx.drawImage(img, 0, 0, w, h);
  const refData = ctx.getImageData(0, 0, w, h).data;

  // phát hiện kênh alpha (ảnh trong suốt) → JPEG sẽ làm phẳng nền nên loại
  let hasAlpha = false;
  for (let i = 3; i < refData.length; i += 4) {
    if (refData[i] < 255) { hasAlpha = true; break; }
  }
  const channels = hasAlpha ? 4 : 3;

  const candidates = []; // { blob, ext, mime }
  if (WEBP_OK) {
    const blob = await searchMinQuality(canvas, 'image/webp', refData, w, h, channels, psnrTarget);
    candidates.push({ blob, ext: 'webp', mime: 'image/webp' });
  }
  if (!hasAlpha) {
    const blob = await searchMinQuality(canvas, 'image/jpeg', refData, w, h, channels, psnrTarget);
    candidates.push({ blob, ext: 'jpg', mime: 'image/jpeg' });
  } else if (!WEBP_OK) {
    // ảnh trong suốt mà không encode được WebP → PNG (lossless, giữ alpha)
    const blob = await canvasToBlob(canvas, 'image/png');
    candidates.push({ blob, ext: 'png', mime: 'image/png' });
  }
  if (!candidates.length) throw new Error('Không tạo được ảnh nén');

  // chọn file nhỏ nhất
  let best = candidates.reduce((a, b) => (b.blob.size < a.blob.size ? b : a));

  // không "nén ngược": nếu giữ nguyên kích thước mà re-encode lớn hơn gốc → dùng file gốc
  if (scale === 1 && best.blob.size >= file.size) {
    const origExt = (file.name.split('.').pop() || 'jpg').toLowerCase().replace('jpeg', 'jpg');
    best = { blob: file, ext: origExt, mime: file.type || 'application/octet-stream' };
  }

  const [base64, dataUrl] = await Promise.all([
    blobToBase64(best.blob),
    new Promise((res) => { const r = new FileReader(); r.onload = () => res(r.result); r.readAsDataURL(best.blob); }),
  ]);
  const savedPct = file.size ? Math.round((1 - best.blob.size / file.size) * 100) : 0;
  return { base64, dataUrl, ext: best.ext, mime: best.mime, srcSize: file.size, outSize: best.blob.size, savedPct };
}

function fmtSize(n) {
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(0)} KB`;
  return `${(n / 1024 / 1024).toFixed(1)} MB`;
}

/** Gắn hành vi vào 1 .img-slot. onChange gọi khi chọn/xoá ảnh. */
export function attachImage(slot, onChange) {
  if (!slot || slot.__wired) return;
  slot.__wired = true;
  const hidden = slot.querySelector('input[data-photo]');
  const preview = slot.querySelector('.img-preview');
  const input = slot.querySelector('.img-input');
  const clearBtn = slot.querySelector('.img-clear');
  const status = slot.querySelector('.img-status');

  function render(localUrl) {
    const src = localUrl || hidden.value;
    preview.innerHTML = src
      ? `<img src="${src}" alt="" loading="lazy" />`
      : '<span class="img-empty">Chưa có ảnh</span>';
    clearBtn.style.display = (hidden.value || slot.__pending) ? '' : 'none';
  }

  input.addEventListener('change', async () => {
    const file = input.files?.[0];
    if (!file) return;
    const bad = unsupportedFormat(file);
    if (bad) {
      status.textContent = `⚠ ${bad}`;
      input.value = '';
      return;
    }
    // Chặn file quá lớn (RAW/ảnh máy ảnh) — nén canvas sẽ block UI nhiều giây.
    if (file.size > 40 * 1024 * 1024) {
      status.textContent = `⚠ Ảnh quá lớn (${fmtSize(file.size)}) — tối đa 40MB`;
      input.value = '';
      return;
    }
    status.textContent = 'Đang nén…';
    try {
      const r = await compressImage(file);
      slot.__pending = { base64: r.base64, ext: r.ext };
      const saved = r.savedPct > 0 ? ` (−${r.savedPct}%)` : '';
      status.textContent = `✓ ${fmtSize(r.srcSize)} → ${fmtSize(r.outSize)}${saved} · tải lên khi Lưu`;
      render(r.dataUrl);
      // Xem trước trực tiếp: đẩy ảnh (data URL) sang iframe ngay khi chọn.
      if (hidden.dataset.cmsImgKey) {
        hidden.dataset.cmsImgSrc = r.dataUrl;
        previewImg(hidden.dataset.cmsImgKey, r.dataUrl);
      }
      onChange?.();
    } catch (err) {
      console.error('[imagefield] nén ảnh lỗi:', err, 'file:', file.name, file.type, file.size);
      status.textContent = '⚠ Không đọc được ảnh — thử JPG/PNG khác';
    }
    input.value = ''; // reset để chọn lại cùng file vẫn trigger change
  });

  clearBtn.addEventListener('click', () => {
    slot.__pending = null;
    hidden.value = '';
    status.textContent = '';
    render();
    onChange?.();
  });

  render();
}

/** Wire tất cả .img-slot trong scope (gọi sau khi render + sau mỗi lần thêm row). */
export function attachAllImages(scope, onChange) {
  scope.querySelectorAll('.img-slot').forEach((s) => attachImage(s, onChange));
}

/**
 * Upload mọi ảnh đang chờ (__pending) trong scope → set path vào hidden input.
 * Gọi TRƯỚC khi collect() đọc giá trị.
 */
export async function uploadPendingImages({ token, scope, area, msg, onStatus }) {
  const slots = [...scope.querySelectorAll('.img-slot')].filter((s) => s.__pending);
  let n = 0;
  for (const slot of slots) {
    n++;
    onStatus?.(`Đang tải ảnh ${n}/${slots.length}…`);
    const { base64, ext } = slot.__pending;
    const fname = `${area}-${Date.now()}-${Math.random().toString(36).slice(2, 7)}.${ext}`;
    const path = `public/uploads/${area}/${fname}`;
    const meta = await getFileMeta(token, path); // null (tên duy nhất)
    await putBinaryFile(token, path, base64, meta?.sha, msg);
    slot.querySelector('input[data-photo]').value = `/uploads/${area}/${fname}`;
    slot.__pending = null;
  }
  return slots.length;
}
