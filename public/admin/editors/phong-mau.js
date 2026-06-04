/**
 * editors/phong-mau.js — Phòng mẫu
 * Quản 2 file:
 *   - src/data/phong-mau.yml       (danh sách phòng ở gallery: hero + rooms[])
 *   - src/data/phong-mau-to-am.yml (chi tiết phòng "Tổ Ấm": subtitle/badges/iso/palette/products/cta)
 * Đọc thêm src/data/shop-products.yml (read-only) để dựng dropdown chọn sản phẩm.
 * Sơ đồ mặt bằng (floorplan.svg) KHÔNG sửa ở đây — giữ nguyên trong YAML (nâng cao).
 */

import { getFile, putFile } from '../github.js';
import { repeatable, rfText, rfArea, rfSelect, bindDirty } from '../lib/repeatable.js';
import { imageSlot, attachAllImages, uploadPendingImages } from '../lib/imagefield.js';

const FILE_INDEX  = 'src/data/phong-mau.yml';
const FILE_DETAIL = 'src/data/phong-mau-to-am.yml';
const FILE_PRODS  = 'src/data/shop-products.yml';
const DETAIL_SLUG = 'to-am';

const BODY = 'editor-phong-mau-body';
const FOOTER = 'editor-phong-mau-footer';

const yaml = () => window.jsyaml;

function escVal(v) { return String(v ?? '').replace(/"/g, '&quot;'); }

function field(id, label, value, type = 'text', hint = '') {
  const ctrl = type === 'textarea'
    ? `<textarea class="form-input form-textarea" id="${id}" rows="3" autocomplete="off">${String(value ?? '').replace(/&/g,'&amp;').replace(/</g,'&lt;').replace(/>/g,'&gt;')}</textarea>`
    : `<input class="form-input" id="${id}" type="text" value="${escVal(value)}" autocomplete="off" />`;
  return `<div class="form-row">
    <label class="form-label" for="${id}">${label}</label>
    ${ctrl}
    ${hint ? `<p class="form-hint">${hint}</p>` : ''}
  </div>`;
}

export async function init({ token, showToast, setLoading }) {
  const body   = document.getElementById(BODY);
  const footer = document.getElementById(FOOTER);

  body.innerHTML = '<div class="editor-loading"><div class="spinner"></div><span>Đang tải…</span></div>';
  footer.hidden = true;

  let idxData, idxSha, detData, detSha, prodData;
  try {
    [{ yamlString: idxData, sha: idxSha }, { yamlString: detData, sha: detSha }, { yamlString: prodData }] =
      await Promise.all([getFile(token, FILE_INDEX), getFile(token, FILE_DETAIL), getFile(token, FILE_PRODS)]);
  } catch (e) {
    body.innerHTML = `<div class="editor-error">Không tải được file: ${escVal(e.message)}</div>`;
    return;
  }

  let idx, det, prods;
  try {
    idx = yaml().load(idxData) || {};
    det = yaml().load(detData) || {};
    prods = yaml().load(prodData) || {};
  } catch (e) {
    body.innerHTML = `<div class="editor-error">YAML không hợp lệ: ${escVal(e.message)}</div>`;
    return;
  }

  // Dropdown sản phẩm (id → "tên — giá") từ shop-products.yml
  const allProds = [...(prods.products ?? []), ...(prods.productsAfterCta ?? [])];
  const prodOptions = [{ value: '', label: '— Chọn sản phẩm —' }].concat(
    allProds.map((p) => {
      const name = `${p.name ?? ''} ${p.nameEm ?? ''}${p.nameTail ?? ''}`.replace(/\s+/g, ' ').trim();
      return { value: p.id, label: `${name}${p.price ? ' — ' + p.price : ''}` };
    }),
  );

  const ih = idx.hero || {};
  const ifp = idx.floorplan || {};
  const rooms = idx.rooms || [];
  const dh = det.hero || {};
  const iso = det.iso || {};
  const palette = det.palette || {};

  body.innerHTML = `
    <!-- ── HERO ── -->
    <div class="form-card">
      <p class="form-card-title">Hero — đầu trang /phong-mau/</p>
      ${field('idx_eyebrow', 'Eyebrow (chữ nhỏ trên tiêu đề)', ih.eyebrow, 'text', 'VD: Phòng mẫu · WOTU')}
      ${field('idx_title', 'Tiêu đề h1', ih.title, 'text', 'Dùng &lt;em&gt; để in nghiêng nhấn mạnh')}
      ${field('idx_sub', 'Mô tả ngắn', ih.sub, 'textarea')}
      ${imageSlot('hero_image', ih.image ?? '', 'Ảnh phối cảnh (isometric) bên phải hero')}
      ${field('idx_imageAlt', 'Mô tả ảnh hero (alt)', ih.imageAlt, 'text', 'Cho SEO & trình đọc màn hình')}
      <div class="form-grid-2">
        ${field('idx_cta1Label', 'Nút chính — chữ', ih.cta1Label, 'text', 'VD: Xem các phòng mẫu')}
        ${field('idx_cta1Href', 'Nút chính — link', ih.cta1Href, 'text', 'VD: #rooms hoặc /combo/')}
      </div>
      <div class="form-grid-2">
        ${field('idx_cta2Label', 'Nút phụ — chữ', ih.cta2Label, 'text', 'VD: Đặt tư vấn 3D')}
        ${field('idx_cta2Href', 'Nút phụ — link', ih.cta2Href, 'text', 'VD: /#contact')}
      </div>
    </div>

    <!-- ── SƠ ĐỒ MẶT BẰNG (Hình dung không gian sống) ── -->
    <div class="form-card">
      <p class="form-card-title">Sơ đồ mặt bằng — "Hình dung không gian sống"</p>
      ${field('fp_eyebrow', 'Eyebrow', ifp.eyebrow, 'text', 'VD: Mặt bằng bố trí nội thất bởi WOTU')}
      ${field('fp_heading', 'Tiêu đề', ifp.heading, 'text', 'Dùng &lt;em&gt; để in nghiêng')}
      ${field('fp_desc', 'Mô tả', ifp.desc, 'textarea')}
      ${imageSlot('floor_image', ifp.image ?? '', 'Ảnh bản vẽ mặt bằng (upload bản vẽ thật — để trống → ô minh hoạ)')}
      ${field('fp_imageAlt', 'Mô tả ảnh bản vẽ (alt)', ifp.imageAlt, 'text')}
      ${field('fp_caption', 'Chú thích dưới bản vẽ', ifp.caption, 'text')}
    </div>

    <!-- ── DANH SÁCH PHÒNG (gallery) ── -->

    <div class="form-card">
      <p class="form-card-title">Các phòng trên lưới</p>
      <p class="form-hint" style="margin-top:0;">Mỗi phòng = 1 ô trên trang danh sách. "Sắp ra mắt" = ô không bấm được. Để mở 1 phòng mới (bỏ "Sắp ra mắt") cần lập trình viên tạo trang chi tiết trước — báo nhé.</p>
      <div id="pm-rooms"></div>
    </div>

    <!-- ── CHI TIẾT TỔ ẤM ── -->
    <div class="form-card">
      <p class="form-card-title">Chi tiết phòng "Tổ Ấm" — /phong-mau/to-am/</p>
      <div class="form-grid-2">
        ${field('det_title', 'Tên phòng', dh.title, 'text', 'VD: Phòng khách')}
        ${field('det_titleEm', 'Tên nhấn (nghiêng)', dh.titleEm, 'text', 'VD: Tổ Ấm')}
      </div>
      ${field('det_subtitle', 'Mô tả đầu trang', dh.subtitle, 'textarea')}
      <div class="form-row">
        <label class="form-label">Nhãn nổi bật (badge)</label>
        <div id="pm-badges"></div>
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Phối cảnh 3D (isometric)</p>
      ${imageSlot('iso_image', iso.image ?? '', 'Ảnh phối cảnh (để trống → hiện ô gradient minh hoạ)')}
      ${field('iso_alt', 'Mô tả ảnh (alt)', iso.alt, 'text', 'Cho SEO & trình đọc màn hình')}
      ${field('iso_caption', 'Chú thích dưới ảnh', iso.caption, 'text')}
      <div class="form-row">
        <label class="form-label">Điểm chạm (hotspot) — chấm trên ảnh mở chi tiết sản phẩm</label>
        <p class="form-hint" style="margin-top:0;">Vị trí X/Y tính theo % (0–100) so với ảnh: X từ trái sang, Y từ trên xuống.</p>
        <div id="pm-hotspots"></div>
      </div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Bảng vật liệu &amp; tông màu</p>
      ${field('pal_heading', 'Tiêu đề', palette.heading, 'text')}
      ${field('pal_desc', 'Mô tả', palette.desc, 'textarea')}
      <div id="pm-swatches"></div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Sản phẩm trong phòng</p>
      <p class="form-hint" style="margin-top:0;">Chọn sản phẩm có sẵn; tên/giá/ảnh tự lấy từ Catalog sản phẩm.</p>
      <div id="pm-products"></div>
    </div>

    <div class="form-card">
      <p class="form-card-title">Lời kêu gọi cuối trang (CTA)</p>
      ${field('cta_heading', 'Tiêu đề', det.cta?.heading, 'text', 'Dùng &lt;em&gt; để in nghiêng')}
      ${field('cta_desc', 'Mô tả', det.cta?.desc, 'textarea')}
    </div>`;

  const now = new Date();
  const ts = `${String(now.getHours()).padStart(2,'0')}:${String(now.getMinutes()).padStart(2,'0')} ${String(now.getDate()).padStart(2,'0')}/${String(now.getMonth()+1).padStart(2,'0')}`;
  const defaultMsg = `quan-tri: cập nhật phòng mẫu — ${ts}`;

  footer.innerHTML = `
    <input class="form-input" id="commit-msg-phong-mau" value="${escVal(defaultMsg)}"
           style="flex:1;font-size:13px;" placeholder="Commit message…" />
    <button class="btn btn-primary" id="save-phong-mau">💾 Lưu &amp; cập nhật</button>`;
  footer.hidden = false;

  const saveBtn = footer.querySelector('#save-phong-mau');
  const dirty = bindDirty({ scope: body, saveBtn });

  // Wire ô ảnh tĩnh (iso). Ảnh trong row repeatable wire qua onRow bên dưới.
  attachAllImages(body, dirty.mark);

  const soonOpts = [{ value: 'no', label: 'Hiển thị (có trang)' }, { value: 'yes', label: 'Sắp ra mắt (không bấm được)' }];

  const repRooms = repeatable({
    mount: body.querySelector('#pm-rooms'),
    items: rooms,
    min: 1,
    addLabel: '＋ Thêm phòng',
    title: (r, i) => `${i + 1}. ${(r.name || '') + ' ' + (r.nameEm || '')}`.trim() || `Phòng ${i + 1}`,
    onChange: dirty.mark,
    onRow: (row) => attachAllImages(row, dirty.mark),
    makeNew: () => ({ slug: '', name: '', nameEm: '', area: '', style: '', photo: '', soon: true }),
    renderFields: (r) => `
      <div class="form-grid-2">
        ${rfText('name', 'Tên phòng', r.name)}
        ${rfText('nameEm', 'Tên nhấn (nghiêng)', r.nameEm)}
      </div>
      <div class="form-grid-2">
        ${rfText('area', 'Diện tích', r.area, { placeholder: 'VD: 17–22 m²' })}
        ${rfText('style', 'Phong cách', r.style, { placeholder: 'VD: Japandi ấm' })}
      </div>
      ${rfSelect('soon', 'Trạng thái', r.soon ? 'yes' : 'no', soonOpts)}
      ${imageSlot('photo', r.photo ?? '', 'Ảnh ô (để trống → ô gradient)')}`,
  });

  const repBadges = repeatable({
    mount: body.querySelector('#pm-badges'),
    items: (dh.badges || []).map((b) => ({ text: b })),
    min: 0,
    addLabel: '＋ Thêm nhãn',
    title: null,
    onChange: dirty.mark,
    reorder: true,
    makeNew: () => ({ text: '' }),
    renderFields: (b) => rfText('text', '', b.text, { placeholder: 'VD: ★ Bestseller phòng khách' }),
  });

  const repHotspots = repeatable({
    mount: body.querySelector('#pm-hotspots'),
    items: iso.hotspots || [],
    min: 0,
    addLabel: '＋ Thêm điểm chạm',
    title: (h, i) => `${i + 1}. ${h.label || 'Điểm chạm'}`,
    onChange: dirty.mark,
    makeNew: () => ({ x: 50, y: 50, productId: '', label: '' }),
    renderFields: (h) => `
      ${rfSelect('productId', 'Sản phẩm', h.productId ?? '', prodOptions)}
      <div class="form-grid-2">
        ${rfText('x', 'Vị trí X (%)', h.x ?? '', { placeholder: '0–100' })}
        ${rfText('y', 'Vị trí Y (%)', h.y ?? '', { placeholder: '0–100' })}
      </div>
      ${rfText('label', 'Nhãn (khi rê chuột)', h.label ?? '')}`,
  });

  const repSwatches = repeatable({
    mount: body.querySelector('#pm-swatches'),
    items: palette.swatches || [],
    min: 0,
    addLabel: '＋ Thêm vật liệu',
    title: (s, i) => `${i + 1}. ${s.name || 'Vật liệu'}`,
    onChange: dirty.mark,
    makeNew: () => ({ name: '', note: '', style: 'linear-gradient(135deg,#C9A77E,#A07A4F)' }),
    renderFields: (s) => `
      ${rfText('name', 'Tên vật liệu', s.name)}
      ${rfText('note', 'Ghi chú', s.note ?? '', { placeholder: 'VD: Khung sofa & kệ TV' })}
      ${rfText('style', 'Màu (CSS gradient/màu)', s.style ?? '', { hint: 'VD: linear-gradient(135deg,#B77452,#915438) hoặc #B77452' })}`,
  });

  const repProducts = repeatable({
    mount: body.querySelector('#pm-products'),
    items: det.products || [],
    min: 0,
    addLabel: '＋ Thêm sản phẩm',
    title: (p, i) => {
      const opt = prodOptions.find((o) => o.value === p.id);
      return `${i + 1}. ${opt ? opt.label : (p.id || 'Sản phẩm')}`;
    },
    onChange: dirty.mark,
    makeNew: () => ({ id: '', role: '' }),
    renderFields: (p) => `
      ${rfSelect('id', 'Sản phẩm', p.id ?? '', prodOptions)}
      ${rfText('role', 'Vai trò trong phòng', p.role ?? '', { placeholder: 'VD: Trung tâm phòng khách' })}`,
  });

  saveBtn.addEventListener('click', async () => {
    setLoading(true);
    saveBtn.disabled = true;
    try {
      const msgUp = footer.querySelector('#commit-msg-phong-mau').value.trim() || defaultMsg;
      // Upload ảnh đang chờ (ô ảnh phòng + ảnh isometric) vào /uploads/phong-mau/
      await uploadPendingImages({ token, scope: body, area: 'phong-mau', msg: msgUp, onStatus: (s) => showToast(s, 'info', 2500) });

      const g = (id) => body.querySelector(`#${id}`)?.value.trim() ?? '';

      // ── phong-mau.yml ──
      const heroImg  = body.querySelector('.img-slot input[data-field="hero_image"]')?.value.trim() ?? '';
      const floorImg = body.querySelector('.img-slot input[data-field="floor_image"]')?.value.trim() ?? '';
      idx.hero = {
        ...(idx.hero || {}),
        eyebrow: g('idx_eyebrow'),
        title: g('idx_title'),
        sub: g('idx_sub'),
        image: heroImg,
        imageAlt: g('idx_imageAlt'),
        cta1Label: g('idx_cta1Label'),
        cta1Href: g('idx_cta1Href'),
        cta2Label: g('idx_cta2Label'),
        cta2Href: g('idx_cta2Href'),
      };
      idx.floorplan = {
        ...(idx.floorplan || {}),
        eyebrow: g('fp_eyebrow'),
        heading: g('fp_heading'),
        desc: g('fp_desc'),
        image: floorImg,
        imageAlt: g('fp_imageAlt'),
        caption: g('fp_caption'),
      };
      idx.rooms = repRooms.collect((f, orig) => {
        const soon = f.soon === 'yes';
        const slug = orig.slug || '';
        const o = {
          ...orig,
          name: f.name.trim(),
          nameEm: f.nameEm.trim(),
          area: f.area.trim(),
          style: f.style.trim(),
          photo: (f.photo ?? '').trim(),
        };
        if (soon) { o.soon = true; o.href = ''; }
        else { delete o.soon; o.href = slug ? `/phong-mau/${slug}/` : ''; }
        return o;
      });

      // ── phong-mau-to-am.yml ──
      det.hero = {
        ...(det.hero || {}),
        title: g('det_title'),
        titleEm: g('det_titleEm'),
        subtitle: g('det_subtitle'),
        badges: repBadges.collect((f) => f.text.trim()).filter(Boolean),
      };
      det.iso = {
        ...(det.iso || {}),
        image: body.querySelector('.img-slot input[data-field="iso_image"]')?.value.trim() ?? '',
        alt: g('iso_alt'),
        caption: g('iso_caption'),
        hotspots: repHotspots.collect((f, orig) => ({
          ...orig,
          x: Number(f.x) || 0,
          y: Number(f.y) || 0,
          productId: f.productId,
          label: f.label.trim(),
        })).filter((h) => h.productId),
      };
      det.palette = {
        ...(det.palette || {}),
        heading: g('pal_heading'),
        desc: g('pal_desc'),
        swatches: repSwatches.collect((f, orig) => ({
          ...orig,
          name: f.name.trim(),
          note: f.note.trim(),
          style: f.style.trim(),
        })).filter((s) => s.name),
      };
      det.products = repProducts.collect((f) => ({ id: f.id, role: f.role.trim() })).filter((p) => p.id);
      det.cta = { ...(det.cta || {}), heading: g('cta_heading'), desc: g('cta_desc') };

      const dumpOpts = { lineWidth: -1, noRefs: true, quotingType: '"' };
      const idxYaml = yaml().dump(idx, dumpOpts);
      const detYaml = yaml().dump(det, dumpOpts);

      // Lấy sha tươi ngay trước mỗi PUT (putFile tự fetch fresh sha bên trong).
      const r1 = await putFile(token, FILE_INDEX, idxYaml, idxSha, msgUp);
      const r2 = await putFile(token, FILE_DETAIL, detYaml, detSha, msgUp);

      showToast(
        `✅ Đã lưu! Website cập nhật trong ~1 phút. <a href="${r2.commitUrl}" target="_blank">Xem commit →</a>`,
        'success',
      );
      dirty.reset();
    } catch (e) {
      const msg = e.message === 'FILE_CONFLICT'
        ? 'File đã được cập nhật bởi người khác. Tải lại trang và thử lại.'
        : `Không thể lưu: ${e.message}`;
      showToast(`❌ ${escVal(msg)}`, 'error');
      saveBtn.disabled = false;
    } finally {
      setLoading(false);
    }
  });
}
