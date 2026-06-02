/**
 * editors/shop-home.js — Combo trang chủ + Bestsellers (src/data/shop-home.yml)
 * Thêm/xoá/sắp xếp combo (mỗi combo tự có trang /combo/<slug>) và bestseller.
 * Hero + section headings + cam kết + reviews trang chủ → editor "Trang chủ Shop".
 */
import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, rfSelect, bindDirty, slugify, uniqueSlug } from '../lib/repeatable.js';
import { imageSlot, attachImage, uploadPendingImages } from '../lib/imagefield.js';
import { connectBody } from '../lib/preview-bus.js';

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

  // map object combo gốc → instance nested rep "Bảng giá đồ rời" (collect() truyền đúng orig object mà onRow nhận)
  const itemsRepByOrig = new WeakMap();

  const repCombos = repeatable({
    mount: body.querySelector('#combos-list'),
    items: combos,
    min: 1,
    addLabel: '＋ Thêm combo',
    onChange: dirty.mark,
    cmsRow: 'combos',
    title: (c, i) => `${i + 1}. ${[c.name, c.nameEm, c.nameTail].filter(Boolean).join(' ').trim() || 'Combo mới'}${c.id === 'combo-to-am' ? ' (Tổ Ấm — trang riêng)' : ''}`,
    makeNew: () => ({ id: '', name: 'Combo', nameEm: 'Mới', nameTail: '', cat: 'Combo nội thất', desc: '', priceOld: '', priceNew: '', price: 0, priceNote: '', badge: '', badgeClass: '', room: 'phong-khach', tone: '', placeholder: 'Combo mới', href: '', items: [] }),
    renderFields: (c) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên', c.name, { cmsField: 'name' })}
        ${rfText('nameEm', 'Tên nhấn (in nghiêng)', c.nameEm ?? '', { cmsField: 'nameEm' })}
      </div>
      <div class="form-grid-2">
        ${rfText('nameTail', 'Đuôi tên', c.nameTail ?? '', { cmsField: 'nameTail' })}
        ${rfText('cat', 'Phân loại (badge card)', c.cat ?? '', { cmsField: 'cat' })}
      </div>
      ${rfArea('desc', 'Mô tả / "Combo gồm" (ngăn bằng " · ")', c.desc ?? '', { rows: 2, cmsField: 'desc' })}
      <div class="form-grid-2">
        ${rfText('priceOld', 'Giá gốc (gạch)', c.priceOld ?? '', { cmsField: 'priceOld' })}
        ${rfText('priceNew', 'Giá khuyến mãi', c.priceNew ?? '', { cmsField: 'priceNew' })}
      </div>
      <div class="form-grid-2">
        ${rfText('price', 'Giá số (sort/SEO)', c.price ?? 0, { hint: 'Chỉ số, VD: 18900000' })}
        ${rfText('priceNote', 'Ghi chú giá', c.priceNote ?? '', { cmsField: 'priceNote' })}
      </div>
      <div class="form-grid-2">
        ${rfText('badge', 'Badge (tuỳ chọn)', c.badge ?? '')}
        ${rfSelect('badgeClass', 'Màu badge', c.badgeClass ?? '', BADGE_OPTS)}
      </div>
      ${rfSelect('room', 'Phòng (ảnh minh hoạ + lọc)', c.room ?? 'phong-khach', ROOM_OPTS)}
      ${imageSlot('photo', c.photo ?? '', 'Ảnh chụp thật (ghi đè minh hoạ)')}
      <div class="form-row">
        <label class="form-label">Bảng giá đồ rời (hiện dưới trang combo)</label>
        <p class="form-hint" style="margin-bottom:8px;">Mỗi dòng = 1 món. Để trống đơn giá → hiện "Liên hệ". Không có dòng nào → trang combo ẩn bảng giá.</p>
        <div class="combo-items"></div>
      </div>`,
    onRow: (row, combo) => {
      attachImage(row.querySelector('.img-slot'), dirty.mark);
      const mountEl = row.querySelector('.combo-items');
      if (!mountEl) return;
      const rep = repeatable({
        mount: mountEl,
        items: combo.items || [],
        min: 0,
        addLabel: '＋ Thêm dòng giá',
        onChange: dirty.mark,
        title: (it, i) => `${i + 1}. ${it.name || 'Món'}`,
        makeNew: () => ({ name: '', dim: '', price: 0, photo: '' }),
        renderFields: (it) => `
          ${rfText('name', 'Tên món', it.name ?? '')}
          <div class="form-grid-2">
            ${rfText('dim', 'Kích thước (KT)', it.dim ?? '', { placeholder: 'VD: 2650 x 1600 x 750mm' })}
            ${rfText('price', 'Đơn giá (số)', it.price ?? 0, { hint: 'Chỉ số, VD: 18900000' })}
          </div>
          ${imageSlot('photo', it.photo ?? '', 'Ảnh món (tuỳ chọn)')}`,
        onRow: (r) => attachImage(r.querySelector('.img-slot'), dirty.mark),
      });
      itemsRepByOrig.set(combo, rep);
    },
  });

  const repBs = repeatable({
    mount: body.querySelector('#bs-list'),
    items: bestsellers,
    min: 0,
    addLabel: '＋ Thêm sản phẩm nổi bật',
    onChange: dirty.mark,
    cmsRow: 'bestsellers',
    title: (b, i) => `${i + 1}. ${b.name || 'Sản phẩm'}`,
    makeNew: () => ({ id: '', name: 'Sản phẩm', meta: '', price: '', priceNum: 0, stars: '★★★★★', href: '#', tone: '' }),
    renderFields: (b) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên', b.name, { cmsField: 'name' })}
        ${rfText('meta', 'Phân loại ngắn', b.meta ?? '', { placeholder: 'VD: Sofa · 3 chỗ', cmsField: 'meta' })}
      </div>
      <div class="form-grid-2">
        ${rfText('price', 'Giá hiển thị', b.price ?? '', { cmsField: 'price' })}
        ${rfText('priceNum', 'Giá số', b.priceNum ?? 0, { hint: 'Chỉ số' })}
      </div>
      <div class="form-grid-2">
        ${rfText('stars', 'Sao (★ ☆)', b.stars ?? '★★★★★', { cmsField: 'stars' })}
        ${rfText('href', 'Đường dẫn', b.href ?? '#')}
      </div>
      ${imageSlot('photo', b.photo ?? '', 'Ảnh chụp thật (ghi đè minh hoạ)')}`,
    onRow: (row) => attachImage(row.querySelector('.img-slot'), dirty.mark),
  });

  // Xem trước trực tiếp (sửa tại chỗ combo/bestseller hiện có → iframe đổi ngay)
  connectBody(body);

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const msgUp = footer.querySelector('#commit-msg-shop-home').value.trim() || defaultMsg;
      await uploadPendingImages({ token, scope: body, area: 'combos', msg: msgUp, onStatus: (s) => showToast(s, 'info', 2500) });

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
        const itemsRep = itemsRepByOrig.get(orig);
        const items = itemsRep
          ? itemsRep.collect((g) => ({
              name: g.name.trim(),
              dim: (g.dim || '').trim() || undefined,
              price: Number(String(g.price).replace(/[^\d]/g, '')) || 0,
              photo: (g.photo || '').trim() || undefined,
            })).filter((it) => it.name)
          : orig.items;
        return {
          ...orig,
          id,
          href,
          items: items && items.length ? items : undefined,
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
          photo: (f.photo || '').trim() || undefined,
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
        photo: (f.photo || '').trim() || undefined,
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
