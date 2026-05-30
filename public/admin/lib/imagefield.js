/**
 * lib/imagefield.js — ô upload/thay ảnh trong Custom Admin.
 *
 * Mẫu HTML (đặt trong renderFields hoặc form): một .img-slot chứa
 *   <input type="hidden" data-field="photo" data-photo value="…"> (collect() đọc path)
 *   + preview + nút Chọn ảnh / Xoá ảnh.
 * Ảnh được downscale client-side (canvas, ≤1600px) rồi PUT base64 lên GitHub
 * vào public/uploads/<area>/. Path tương đối /uploads/… ghi vào hidden input.
 */
import { putBinaryFile, getFileMeta } from '../github.js';

/** HTML cho 1 ô ảnh — nhúng vào renderFields. */
export function imageSlot(field, value, label = 'Ảnh') {
  return `
    <div class="form-row">
      <label class="form-label">${label}</label>
      <div class="img-slot">
        <input type="hidden" data-field="${field}" data-photo value="${String(value ?? '').replace(/"/g, '&quot;')}" />
        <div class="img-preview"></div>
        <div class="img-controls">
          <label class="btn btn-ghost btn-sm img-pick">Chọn ảnh<input type="file" accept="image/*" hidden class="img-input" /></label>
          <button type="button" class="btn btn-ghost btn-sm img-clear">Xoá ảnh</button>
          <span class="img-status"></span>
        </div>
      </div>
    </div>`;
}

function downscale(file, maxDim = 1600, quality = 0.85) {
  return new Promise((resolve, reject) => {
    const url = URL.createObjectURL(file);
    const img = new Image();
    img.onload = () => {
      URL.revokeObjectURL(url);
      const scale = Math.min(1, maxDim / Math.max(img.width, img.height));
      const w = Math.round(img.width * scale);
      const h = Math.round(img.height * scale);
      const canvas = document.createElement('canvas');
      canvas.width = w; canvas.height = h;
      canvas.getContext('2d').drawImage(img, 0, 0, w, h);
      const isPng = file.type === 'image/png';
      const mime = isPng ? 'image/png' : 'image/jpeg';
      const dataUrl = canvas.toDataURL(mime, quality);
      resolve({ base64: dataUrl.split(',')[1], dataUrl, ext: isPng ? 'png' : 'jpg' });
    };
    img.onerror = reject;
    img.src = url;
  });
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
    status.textContent = 'Đang xử lý…';
    try {
      const r = await downscale(file);
      slot.__pending = { base64: r.base64, ext: r.ext };
      status.textContent = 'Sẽ tải lên khi Lưu';
      render(r.dataUrl);
      onChange?.();
    } catch {
      status.textContent = '⚠ Không đọc được ảnh';
    }
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
