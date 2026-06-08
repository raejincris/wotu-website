/**
 * gen-upload-thumbs.mjs — sinh biến thể thumbnail `-640.webp` cho ảnh upload nặng.
 *
 * Ảnh upload qua admin (≤1600px, ~380KB) được dùng ở CẢ hero lớn LẪN card lưới
 * nhỏ. Card nhỏ không cần bản full → sinh bản 640px (~40-60KB) để `srcset` phục
 * vụ màn nhỏ. Hero giữ bản full.
 *
 * Idempotent: bỏ qua nếu thumb đã mới hơn source. Chạy thủ công sau khi có ảnh
 * mới: `node scripts/gen-upload-thumbs.mjs` (KHÔNG wire vào build để CF deploy
 * không phụ thuộc sharp). Thumb được commit cùng repo.
 *
 * ⚠️ Ảnh admin upload tương lai sẽ KHÔNG tự có thumb (admin chưa sinh -640) →
 * `srcset` trỏ file thiếu sẽ 404 ở candidate 640w, trình duyệt tự fallback về
 * `src` full (degrade an toàn, chỉ mất phần tiết kiệm). Long-term: sinh thumb
 * ngay trong luồng upload admin (lib/imagefield.js).
 */
import sharp from 'sharp';
import { readdirSync, statSync, existsSync } from 'node:fs';
import { fileURLToPath } from 'node:url';
import { dirname, resolve, join } from 'node:path';

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = resolve(__dirname, '..', 'public', 'uploads');

// Folder có ảnh photographic nặng dùng làm card lưới. Bỏ products/blog (line-art
// ~20KB, không đáng) và projects (rỗng).
const FOLDERS = ['phong-mau', 'combos', 'hero'];
const THUMB_W = 640;
const SUFFIX = '-640.webp';

let made = 0, skipped = 0, tiny = 0;

for (const folder of FOLDERS) {
  const dir = join(ROOT, folder);
  if (!existsSync(dir)) continue;
  for (const name of readdirSync(dir)) {
    if (!name.endsWith('.webp') || name.endsWith(SUFFIX)) continue;
    const src = join(dir, name);
    const out = join(dir, name.replace(/\.webp$/, SUFFIX));

    // Skip nếu thumb đã mới hơn source.
    if (existsSync(out) && statSync(out).mtimeMs >= statSync(src).mtimeMs) {
      skipped++;
      continue;
    }

    const meta = await sharp(src).metadata();
    if ((meta.width ?? 0) <= THUMB_W) {
      // Source đã nhỏ — vẫn ghi bản copy để srcset luôn hợp lệ.
      await sharp(src).webp({ quality: 80 }).toFile(out);
      tiny++;
      continue;
    }
    await sharp(src)
      .resize({ width: THUMB_W, withoutEnlargement: true })
      .webp({ quality: 74 })
      .toFile(out);
    made++;
    const sz = (statSync(out).size / 1024).toFixed(0);
    console.log(`  ✓ ${folder}/${name} → ${name.replace(/\.webp$/, SUFFIX)} (${sz}KB)`);
  }
}

console.log(`\nthumbnails: ${made} tạo mới · ${tiny} copy (đã nhỏ) · ${skipped} bỏ qua (đã mới)`);
