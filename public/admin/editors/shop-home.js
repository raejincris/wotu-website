/**
 * editors/shop-home.js — Combo trang chủ + Bestsellers (src/data/shop-home.yml)
 * Thêm/xoá/sắp xếp combo (mỗi combo tự có trang /combo/<slug>) và bestseller.
 * Hero + section headings + cam kết + reviews trang chủ → editor "Trang chủ Shop".
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, rfSelect, bindDirty, slugify, uniqueSlug } from '../lib/repeatable.js';

const FILE = 'src/data/shop-home.yml';
const BODY = 'editor-shop-home-body';
const FOOTER = 'editor-shop-home-footer';

const yaml = () => window.jsyaml;
function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

const ROOM_OPTS = [
  { value: 'studio', label: 'Căn hộ studio' }, { value: 'phong-khach', label: 'Phòng khách' },
  { value: 'phong-ngu', label: 'Phòng ngủ' }, { value: 'phong-an', label: 'Phòng ăn' },
  { value: 'lam-viec', label: 'Phòng làm việc' }, { value: 'tre-em', label: 'Phòng trẻ em' },
];
const BADGE_OPTS = [
  { value: '', label: '(không màu)' }, { value: 'sage', label: 'Xanh rêu' }, { value: 'terra', label: 'Đất nung' },
];

export async function init({ token, showToast, setLoading }) {
  const body = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let data, sha;
  try { ({ yamlString: data, sha } = await getFile(token, FILE)); }
  catch (e) { body.innerHTML = `<div class="editor-error">Không tải được file: ${e.message}</div>`; return; }

  let obj;
  try { obj = yaml().load(data); }
  catch (e) { body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${e.message}</div>`; return; }

  const combos = obj.combos || [];
  const bestsellers = obj.bestsellers || [];

  body.innerHTML = `
    <div class="form-card">
      <p class="form-card-title">Combo nội thất</p>
      <p class="form-hint" style="margin-bottom:12px;">Mỗi combo (trừ Tổ Ấm) tự có trang <code>/combo/&lt;mã&gt;</code>. "Combo gồm" tách từ Mô tả theo dấu <code> · </code>.</p>
      <div id="combos-list"></div>
    </div>
    <div class="form-card">
      <p class="form-card-title">Sản phẩm nổi bật (bestsellers)</p>
      <div id="bs-list"></div>
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật combo trang chủ — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-shop-home" value="${escVal(defaultMsg)}" style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-shop-home">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-shop-home');
  const dirty = bindDirty({ scope: body, saveBtn });

  const repCombos = repeatable({
    mount: body.querySelector('#combos-list'),
    items: combos,
    min: 1,
    addLabel: '＋ Thêm combo',
    onChange: dirty.mark,
    title: (c, i) => `${i + 1}. ${[c.name, c.nameEm, c.nameTail].filter(Boolean).join(' ').trim() || 'Combo mới'}${c.id === 'combo-to-am' ? ' (Tổ Ấm — trang riêng)' : ''}`,
    makeNew: () => ({ id: '', name: 'Combo', nameEm: 'Mới', nameTail: '', cat: 'Combo nội thất', desc: '', priceOld: '', priceNew: '', price: 0, priceNote: '', badge: '', badgeClass: '', room: 'phong-khach', tone: '', placeholder: 'Combo mới', href: '' }),
    renderFields: (c) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên', c.name)}
        ${rfText('nameEm', 'Tên nhấn (in nghiêng)', c.nameEm ?? '')}
      </div>
      <div class="form-grid-2">
        ${rfText('nameTail', 'Đuôi tên', c.nameTail ?? '')}
        ${rfText('cat', 'Phân loại (badge card)', c.cat ?? '')}
      </div>
      ${rfArea('desc', 'Mô tả / "Combo gồm" (ngăn bằng " · ")', c.desc ?? '', { rows: 2 })}
      <div class="form-grid-2">
        ${rfText('priceOld', 'Giá gốc (gạch)', c.priceOld ?? '')}
        ${rfText('priceNew', 'Giá khuyến mãi', c.priceNew ?? '')}
      </div>
      <div class="form-grid-2">
        ${rfText('price', 'Giá số (sort/SEO)', c.price ?? 0, { hint: 'Chỉ số, VD: 18900000' })}
        ${rfText('priceNote', 'Ghi chú giá', c.priceNote ?? '')}
      </div>
      <div class="form-grid-2">
        ${rfText('badge', 'Badge (tuỳ chọn)', c.badge ?? '')}
        ${rfSelect('badgeClass', 'Màu badge', c.badgeClass ?? '', BADGE_OPTS)}
      </div>
      ${rfSelect('room', 'Phòng (ảnh minh hoạ + lọc)', c.room ?? 'phong-khach', ROOM_OPTS)}`,
  });

  const repBs = repeatable({
    mount: body.querySelector('#bs-list'),
    items: bestsellers,
    min: 0,
    addLabel: '＋ Thêm sản phẩm nổi bật',
    onChange: dirty.mark,
    title: (b, i) => `${i + 1}. ${b.name || 'Sản phẩm'}`,
    makeNew: () => ({ id: '', name: 'Sản phẩm', meta: '', price: '', priceNum: 0, stars: '★★★★★', href: '#', tone: '' }),
    renderFields: (b) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên', b.name)}
        ${rfText('meta', 'Phân loại ngắn', b.meta ?? '', { placeholder: 'VD: Sofa · 3 chỗ' })}
      </div>
      <div class="form-grid-2">
        ${rfText('price', 'Giá hiển thị', b.price ?? '')}
        ${rfText('priceNum', 'Giá số', b.priceNum ?? 0, { hint: 'Chỉ số' })}
      </div>
      <div class="form-grid-2">
        ${rfText('stars', 'Sao (★ ☆)', b.stars ?? '★★★★★')}
        ${rfText('href', 'Đường dẫn', b.href ?? '#')}
      </div>`,
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const { sha: freshSha } = await getFile(token, FILE);

      const takenC = [];
      obj.combos = repCombos.collect((f, orig) => {
        let id = orig.id;
        if (!id) {
          const base = 'combo-' + (slugify([f.name, f.nameEm, f.nameTail].join(' ')) || 'combo');
          id = uniqueSlug(base, takenC);
        }
        takenC.push(id);
        const slug = String(id).replace(/^combo-/, '');
        const href = id === 'combo-to-am' ? (orig.href || '/combo/to-am/')
          : (orig.href && orig.id === id ? orig.href : `/combo/${slug}/`);
        const full = [f.name, f.nameEm, f.nameTail].filter(Boolean).join(' ').trim();
        return {
          ...orig,
          id,
          href,
          name: f.name.trim(),
          nameEm: f.nameEm.trim() || undefined,
          nameTail: f.nameTail || undefined,
          cat: f.cat.trim(),
          desc: f.desc.trim(),
          priceOld: f.priceOld.trim() || undefined,
          priceNew: f.priceNew.trim() || undefined,
          price: Number(String(f.price).replace(/[^\d]/g, '')) || 0,
          priceNote: f.priceNote.trim() || undefined,
          badge: f.badge.trim() || undefined,
          badgeClass: f.badgeClass || undefined,
          room: f.room,
          placeholder: orig.placeholder || full,
        };
      });

      obj.bestsellers = repBs.collect((f, orig) => ({
        ...orig,
        name: f.name.trim(),
        meta: f.meta.trim(),
        price: f.price.trim(),
        priceNum: Number(String(f.priceNum).replace(/[^\d]/g, '')) || 0,
        stars: f.stars.trim(),
        href: f.href.trim() || '#',
      }));

      const newYaml = yaml().dump(obj, { lineWidth: -1, noRefs: true, quotingType: '"' });
      const msg = footer.querySelector('#commit-msg-shop-home').value.trim() || defaultMsg;
      const { commitUrl } = await putFile(token, FILE, newYaml, freshSha, msg);

      showToast(`✅ Đã lưu! Website sẽ cập nhật trong ~1 phút. <a href="${commitUrl}" target="_blank">Xem commit →</a>`, 'success');
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
